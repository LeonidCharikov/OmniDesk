use serde::Serialize;
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Write};
use std::path::Path;
use std::sync::Mutex;
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;

const MAX_CLIPBOARD_CHARS: usize = 100_000;
const MAX_PENDING_STDIO_LINES: usize = 128;

#[derive(Default)]
struct McpStdioState {
    ready: bool,
    pending: VecDeque<String>,
}

#[derive(Serialize)]
struct NativeSystemTelemetry {
    cpu_usage: f32,
    cores: Vec<f32>,
    ram_used_gb: f64,
    ram_total_gb: f64,
    disk_used_gb: f64,
    disk_total_gb: f64,
    uptime_seconds: u64,
}

#[tauri::command]
fn get_system_telemetry(state: State<'_, Mutex<System>>) -> Result<NativeSystemTelemetry, String> {
    let mut sys = state.lock().map_err(|e| e.to_string())?;
    sys.refresh_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );

    let cpu_usage = sys.global_cpu_info().cpu_usage();
    let cores: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
    let bytes_per_gib = 1024.0 * 1024.0 * 1024.0;
    let ram_total_gb = sys.total_memory() as f64 / bytes_per_gib;
    let ram_used_gb = sys.used_memory() as f64 / bytes_per_gib;

    let disks = Disks::new_with_refreshed_list();
    let primary_disk = disks
        .list()
        .iter()
        .find(|d| d.mount_point() == Path::new("/") || d.mount_point() == Path::new("C:\\"))
        .or_else(|| disks.list().first());

    let (disk_used_gb, disk_total_gb) = if let Some(disk) = primary_disk {
        let total = disk.total_space() as f64 / bytes_per_gib;
        let used = disk.total_space().saturating_sub(disk.available_space()) as f64 / bytes_per_gib;
        (used, total)
    } else {
        (0.0, 0.0)
    };

    Ok(NativeSystemTelemetry {
        cpu_usage,
        cores,
        ram_used_gb,
        ram_total_gb,
        disk_used_gb,
        disk_total_gb,
        uptime_seconds: System::uptime(),
    })
}

#[tauri::command]
fn mcp_read_clipboard(app: AppHandle) -> Result<String, String> {
    app.clipboard().read_text().map_err(|e| e.to_string())
}

#[tauri::command]
fn mcp_write_clipboard(app: AppHandle, text: String) -> Result<(), String> {
    if text.chars().count() > MAX_CLIPBOARD_CHARS {
        return Err(format!(
            "Clipboard text exceeds maximum length of {} characters.",
            MAX_CLIPBOARD_CHARS
        ));
    }
    app.clipboard().write_text(text).map_err(|e| e.to_string())
}

#[tauri::command]
fn mcp_stdio_ready(app: AppHandle, state: State<'_, Mutex<McpStdioState>>) -> Result<(), String> {
    let buffered: Vec<String> = {
        let mut guard = state.lock().map_err(|e| e.to_string())?;
        guard.ready = true;
        guard.pending.drain(..).collect()
    };

    for line in buffered {
        let _ = app.emit("omnidesk:mcp-stdio-rx", line);
    }
    Ok(())
}

#[tauri::command]
fn mcp_stdio_tx(message: String) -> Result<(), String> {
    let stdout = std::io::stdout();
    let mut handle = stdout.lock();
    writeln!(handle, "{}", message).map_err(|e| e.to_string())?;
    handle.flush().map_err(|e| e.to_string())
}

fn spawn_mcp_stdio_reader(app_handle: AppHandle) {
    std::thread::spawn(move || {
        let stdin = std::io::stdin();
        let reader = BufReader::new(stdin.lock());
        for line_result in reader.lines() {
            match line_result {
                Ok(raw) => {
                    let trimmed = raw.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    let line = trimmed.to_string();
                    let should_emit = {
                        let state = app_handle.state::<Mutex<McpStdioState>>();
                        match state.lock() {
                            Ok(mut guard) => {
                                if guard.ready {
                                    true
                                } else {
                                    if guard.pending.len() >= MAX_PENDING_STDIO_LINES {
                                        guard.pending.pop_front();
                                    }
                                    guard.pending.push_back(line.clone());
                                    false
                                }
                            }
                            Err(_) => true,
                        }
                    };
                    if should_emit {
                        let _ = app_handle.emit("omnidesk:mcp-stdio-rx", line);
                    }
                }
                Err(_) => break,
            }
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(Mutex::new(System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        )))
        .manage(Mutex::new(McpStdioState::default()))
        .invoke_handler(tauri::generate_handler![
            get_system_telemetry,
            mcp_read_clipboard,
            mcp_write_clipboard,
            mcp_stdio_ready,
            mcp_stdio_tx
        ])
        .setup(|app| {
            let is_mcp_stdio = std::env::args().any(|arg| arg == "--mcp-stdio");
            if cfg!(debug_assertions) && !is_mcp_stdio {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            spawn_mcp_stdio_reader(app.handle().clone());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
