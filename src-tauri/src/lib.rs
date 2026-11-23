use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, PhysicalPosition, PhysicalSize, State, WebviewWindow, WindowEvent};
use tauri_plugin_clipboard_manager::ClipboardExt;

mod desktop_tools;
use desktop_tools::{
    AutoClickerState, KeepAwakeState, desktop_autoclicker_set_hotkey, desktop_autoclicker_start,
    desktop_autoclicker_status, desktop_autoclicker_stop, desktop_cursor_position,
    desktop_keepawake_start, desktop_keepawake_status, desktop_keepawake_stop,
    desktop_kill_process, desktop_list_ports, desktop_list_processes, desktop_net_dns_lookup,
    desktop_net_interfaces, desktop_net_ping, desktop_net_tcp_check, desktop_net_wol,
    shutdown_desktop_workers, spawn_global_hotkey_watcher,
};

const MAX_CLIPBOARD_CHARS: usize = 100_000;
const MAX_PENDING_STDIO_LINES: usize = 128;
const MAX_CLI_OPEN_FILE_BYTES: u64 = 25 * 1024 * 1024;
const MAX_DROPPED_FILE_BYTES: u64 = 512 * 1024 * 1024;
const MAX_TRACKED_DROPPED_PATHS: usize = 256;
const WINDOW_STATE_FILE: &str = "window-state.json";
const MIN_SAVED_WINDOW_WIDTH: u32 = 900;
const MIN_SAVED_WINDOW_HEIGHT: u32 = 600;
const DEFAULT_WINDOW_WIDTH: u32 = 1280;
const DEFAULT_WINDOW_HEIGHT: u32 = 800;

#[derive(Default)]
struct McpStdioState {
    ready: bool,
    pending: VecDeque<String>,
}

struct CloseToTrayState(AtomicBool);

struct OpenedCliFileState(Mutex<Option<String>>);

struct DroppedFilesAllowlist(Mutex<VecDeque<PathBuf>>);

#[derive(Clone, Debug, Serialize, Deserialize)]
struct PersistedWindowState {
    width: u32,
    height: u32,
    x: i32,
    y: i32,
    maximized: bool,
}

struct WindowGeometryState(Mutex<Option<PersistedWindowState>>);

#[derive(Serialize)]
struct CliOpenedFilePayload {
    name: String,
    bytes: Vec<u8>,
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

fn window_state_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|dir| dir.join(WINDOW_STATE_FILE))
}

fn load_persisted_window_state(app: &AppHandle) -> Option<PersistedWindowState> {
    let path = window_state_path(app)?;
    let raw = std::fs::read_to_string(path).ok()?;
    let parsed: PersistedWindowState = serde_json::from_str(&raw).ok()?;
    if parsed.width < MIN_SAVED_WINDOW_WIDTH || parsed.height < MIN_SAVED_WINDOW_HEIGHT {
        return None;
    }
    Some(parsed)
}

fn save_persisted_window_state(app: &AppHandle, state: &PersistedWindowState) {
    let Some(path) = window_state_path(app) else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if let Ok(serialized) = serde_json::to_string_pretty(state) {
        let _ = std::fs::write(path, serialized);
    }
}

fn is_position_on_any_monitor(window: &WebviewWindow, x: i32, y: i32, width: u32, height: u32) -> bool {
    let Ok(monitors) = window.available_monitors() else {
        return true;
    };
    if monitors.is_empty() {
        return true;
    }
    let w = width as i32;
    let h = height as i32;
    monitors.iter().any(|monitor| {
        let pos = monitor.position();
        let size = monitor.size();
        let mon_left = pos.x;
        let mon_top = pos.y;
        let mon_right = pos.x + size.width as i32;
        let mon_bottom = pos.y + size.height as i32;

        // Require at least 80px of the window titlebar region to overlap an active monitor
        let overlap_x = (x + w).min(mon_right) - x.max(mon_left);
        let overlap_y = (y + h.min(120)).min(mon_bottom) - y.max(mon_top);
        overlap_x >= 80 && overlap_y >= 40
    })
}

fn capture_window_state(window: &WebviewWindow) {
    let minimized = window.is_minimized().unwrap_or(false);
    if minimized {
        return;
    }
    let maximized = window.is_maximized().unwrap_or(false);
    let app = window.app_handle();
    let geom_state = app.state::<WindowGeometryState>();
    let Ok(mut guard) = geom_state.0.lock() else {
        return;
    };

    if maximized {
        if let Some(existing) = guard.as_mut() {
            existing.maximized = true;
        } else {
            *guard = Some(PersistedWindowState {
                width: DEFAULT_WINDOW_WIDTH,
                height: DEFAULT_WINDOW_HEIGHT,
                x: 80,
                y: 60,
                maximized: true,
            });
        }
        return;
    }

    let Ok(size) = window.inner_size() else {
        return;
    };
    let Ok(pos) = window.outer_position() else {
        return;
    };

    if size.width < MIN_SAVED_WINDOW_WIDTH || size.height < MIN_SAVED_WINDOW_HEIGHT {
        return;
    }
    if pos.x <= -10_000 || pos.y <= -10_000 {
        return;
    }

    *guard = Some(PersistedWindowState {
        width: size.width,
        height: size.height,
        x: pos.x,
        y: pos.y,
        maximized: false,
    });
}

fn flush_window_state(app: &AppHandle) {
    let geom_state = app.state::<WindowGeometryState>();
    let snapshot = geom_state.0.lock().ok().and_then(|g| g.clone());
    if let Some(state) = snapshot {
        save_persisted_window_state(app, &state);
    }
}

fn restore_window_state(app: &AppHandle, window: &WebviewWindow) {
    let Some(saved) = load_persisted_window_state(app) else {
        return;
    };

    let _ = window.set_size(PhysicalSize::new(saved.width, saved.height));
    if is_position_on_any_monitor(window, saved.x, saved.y, saved.width, saved.height) {
        let _ = window.set_position(PhysicalPosition::new(saved.x, saved.y));
    } else {
        let _ = window.center();
    }

    if saved.maximized {
        let _ = window.maximize();
    }

    let geom_state = app.state::<WindowGeometryState>();
    if let Ok(mut guard) = geom_state.0.lock() {
        *guard = Some(saved);
    }
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

#[tauri::command]
fn set_close_to_tray(enabled: bool, state: State<'_, CloseToTrayState>) {
    state.0.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn take_opened_cli_file(
    state: State<'_, OpenedCliFileState>,
) -> Result<Option<CliOpenedFilePayload>, String> {
    let path_opt = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.take()
    };

    let Some(path_str) = path_opt else {
        return Ok(None);
    };

    let path = PathBuf::from(&path_str);
    if !path.is_file() {
        return Ok(None);
    }

    let meta = std::fs::metadata(&path).map_err(|e| e.to_string())?;
    if meta.len() > MAX_CLI_OPEN_FILE_BYTES {
        return Err("Opened file exceeds 25 MB startup preload limit.".to_string());
    }

    let bytes = std::fs::read(&path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("opened-file")
        .to_string();

    Ok(Some(CliOpenedFilePayload { name, bytes }))
}

fn normalize_drop_path(path: &Path) -> PathBuf {
    std::fs::canonicalize(path).unwrap_or_else(|_| path.to_path_buf())
}

#[tauri::command]
fn read_dropped_file(
    path: String,
    state: State<'_, DroppedFilesAllowlist>,
) -> Result<tauri::ipc::Response, String> {
    let raw_path = PathBuf::from(&path);
    let canonical = normalize_drop_path(&raw_path);

    let is_allowed = {
        let guard = state.0.lock().map_err(|e| e.to_string())?;
        guard.iter().any(|allowed| allowed == &canonical || allowed == &raw_path)
    };

    if !is_allowed {
        return Err("File path was not dropped onto the application window.".to_string());
    }

    if !canonical.is_file() {
        return Err("Dropped item is not a readable file.".to_string());
    }

    let meta = std::fs::metadata(&canonical).map_err(|e| e.to_string())?;
    if meta.len() > MAX_DROPPED_FILE_BYTES {
        return Err("Dropped file exceeds the 512 MB desktop import limit.".to_string());
    }

    let bytes = std::fs::read(&canonical).map_err(|e| e.to_string())?;
    Ok(tauri::ipc::Response::new(bytes))
}

fn has_valid_updater_pubkey(app: &AppHandle) -> bool {
    app.config()
        .plugins
        .0
        .get("updater")
        .and_then(|val| val.get("pubkey"))
        .and_then(|v| v.as_str())
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
}

#[tauri::command]
fn is_updater_configured(app: AppHandle) -> bool {
    #[cfg(desktop)]
    {
        has_valid_updater_pubkey(&app)
    }
    #[cfg(not(desktop))]
    {
        false
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    if !(trimmed.starts_with("https://") || trimmed.starts_with("http://")) {
        return Err("Only http:// and https:// URLs are allowed.".to_string());
    }
    if trimmed.chars().any(|c| c.is_control()) {
        return Err("URL contains invalid control characters.".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("rundll32")
            .arg("url.dll,FileProtocolHandler")
            .arg(trimmed)
            .spawn()
            .or_else(|_| std::process::Command::new("explorer").arg(trimmed).spawn())
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        std::process::Command::new("xdg-open")
            .arg(trimmed)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
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
        .plugin(tauri_plugin_process::init())
        .manage(Mutex::new(System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        )))
        .manage(Mutex::new(McpStdioState::default()))
        .manage(CloseToTrayState(AtomicBool::new(false)))
        .manage(OpenedCliFileState(Mutex::new(None)))
        .manage(DroppedFilesAllowlist(Mutex::new(VecDeque::new())))
        .manage(WindowGeometryState(Mutex::new(None)))
        .manage(AutoClickerState::default())
        .manage(KeepAwakeState::default())
        .invoke_handler(tauri::generate_handler![
            get_system_telemetry,
            mcp_read_clipboard,
            mcp_write_clipboard,
            mcp_stdio_ready,
            mcp_stdio_tx,
            set_close_to_tray,
            take_opened_cli_file,
            read_dropped_file,
            is_updater_configured,
            open_external_url,
            desktop_list_processes,
            desktop_list_ports,
            desktop_kill_process,
            desktop_net_ping,
            desktop_net_tcp_check,
            desktop_net_dns_lookup,
            desktop_net_interfaces,
            desktop_net_wol,
            desktop_autoclicker_start,
            desktop_autoclicker_stop,
            desktop_autoclicker_status,
            desktop_autoclicker_set_hotkey,
            desktop_cursor_position,
            desktop_keepawake_start,
            desktop_keepawake_stop,
            desktop_keepawake_status
        ])
        .setup(|app| {
            #[cfg(desktop)]
            if has_valid_updater_pubkey(app.handle()) {
                app.handle().plugin(tauri_plugin_updater::Builder::new().build())?;
            }

            let is_mcp_stdio = std::env::args().any(|arg| arg == "--mcp-stdio");
            if cfg!(debug_assertions) && !is_mcp_stdio {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Some(main_win) = app.get_webview_window("main") {
                restore_window_state(app.handle(), &main_win);
            }

            if !is_mcp_stdio {
                if let Some(arg_path) = std::env::args().skip(1).find(|arg| !arg.starts_with('-')) {
                    let path_buf = PathBuf::from(&arg_path);
                    if path_buf.is_file() {
                        let cli_state = app.state::<OpenedCliFileState>();
                        if let Ok(mut guard) = cli_state.0.lock() {
                            *guard = Some(arg_path);
                        }
                    }
                }

                let show_item =
                    MenuItem::with_id(app, "show", "Show OmniDesk", true, None::<&str>)?;
                let hide_item =
                    MenuItem::with_id(app, "hide", "Hide to Tray", true, None::<&str>)?;
                let reset_bounds_item =
                    MenuItem::with_id(app, "reset_window", "Reset Window Size", true, None::<&str>)?;
                let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
                let tray_menu = Menu::with_items(
                    app,
                    &[&show_item, &hide_item, &reset_bounds_item, &quit_item],
                )?;

                let mut tray_builder = TrayIconBuilder::new()
                    .menu(&tray_menu)
                    .tooltip("OmniDesk")
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "show" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.hide();
                            }
                        }
                        "reset_window" => {
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.unmaximize();
                                let _ = win.set_size(PhysicalSize::new(
                                    DEFAULT_WINDOW_WIDTH,
                                    DEFAULT_WINDOW_HEIGHT,
                                ));
                                let _ = win.center();
                                let _ = win.show();
                                let _ = win.set_focus();
                                capture_window_state(&win);
                                flush_window_state(app);
                            }
                        }
                        "quit" => {
                            shutdown_desktop_workers(app);
                            flush_window_state(app);
                            app.exit(0);
                        }
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            let app = tray.app_handle();
                            if let Some(win) = app.get_webview_window("main") {
                                let _ = win.show();
                                let _ = win.unminimize();
                                let _ = win.set_focus();
                            }
                        }
                    });

                if let Some(icon) = app.default_window_icon().cloned() {
                    tray_builder = tray_builder.icon(icon);
                }

                tray_builder.build(app)?;
            }

            let ac_state = app.state::<AutoClickerState>();
            spawn_global_hotkey_watcher(std::sync::Arc::clone(&ac_state.0));
            spawn_mcp_stdio_reader(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::Resized(_) | WindowEvent::Moved(_) => {
                if let Some(webview_win) = window.app_handle().get_webview_window(window.label()) {
                    capture_window_state(&webview_win);
                }
            }
            WindowEvent::CloseRequested { api, .. } => {
                if let Some(webview_win) = window.app_handle().get_webview_window(window.label()) {
                    capture_window_state(&webview_win);
                }
                flush_window_state(window.app_handle());

                let close_to_tray = window
                    .app_handle()
                    .state::<CloseToTrayState>()
                    .0
                    .load(Ordering::Relaxed);
                if close_to_tray {
                    api.prevent_close();
                    let _ = window.hide();
                } else {
                    shutdown_desktop_workers(window.app_handle());
                }
            }
            WindowEvent::DragDrop(tauri::DragDropEvent::Drop { paths, .. }) => {
                let allowlist = window.app_handle().state::<DroppedFilesAllowlist>();
                if let Ok(mut guard) = allowlist.0.lock() {
                    for p in paths {
                        if p.is_file() {
                            let normalized = normalize_drop_path(p);
                            if !guard.iter().any(|existing| existing == &normalized) {
                                if guard.len() >= MAX_TRACKED_DROPPED_PATHS {
                                    guard.pop_front();
                                }
                                guard.push_back(normalized);
                            }
                        }
                    }
                }
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
