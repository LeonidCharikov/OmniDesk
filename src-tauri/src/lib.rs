use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, RefreshKind, System};
use tauri::State;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_os::init())
        .manage(Mutex::new(System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        )))
        .invoke_handler(tauri::generate_handler![get_system_telemetry])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
