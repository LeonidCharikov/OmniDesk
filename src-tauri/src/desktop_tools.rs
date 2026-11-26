use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::{IpAddr, Ipv4Addr, SocketAddr, ToSocketAddrs, TcpStream, UdpSocket};
use std::process::{Child, Command};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use sysinfo::{CpuRefreshKind, DiskKind, Disks, MemoryRefreshKind, Networks, Pid, RefreshKind, System};
use tauri::{AppHandle, Manager, State};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn new_hidden_command(program: &str) -> Command {
    #[allow(unused_mut)]
    let mut cmd = Command::new(program);
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    cmd
}

// ─── Shared Native Worker States ─────────────────────────────────────────────

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AutoClickerConfig {
    pub mode: String,          // "mouse" | "key"
    pub button: String,        // "left" | "right" | "middle"
    pub click_type: String,    // "single" | "double"
    pub key: String,           // e.g. "Space", "Enter", "A", "F5"
    pub interval_ms: u64,      // 10..=3_600_000
    pub jitter_ms: u64,        // 0..=5_000
    pub use_fixed_pos: bool,
    pub x: i32,
    pub y: i32,
    pub start_delay_sec: u64,  // 0..=30
    pub stop_mode: String,     // "infinite" | "count" | "duration"
    pub max_count: u64,        // 1..=1_000_000
    pub max_duration_sec: u64, // 1..=86_400
    pub hotkey: String,        // "F6" | "F7" | "F8" | "F9" | "F10"
}

impl Default for AutoClickerConfig {
    fn default() -> Self {
        Self {
            mode: "mouse".to_string(),
            button: "left".to_string(),
            click_type: "single".to_string(),
            key: "Space".to_string(),
            interval_ms: 100,
            jitter_ms: 0,
            use_fixed_pos: false,
            x: 0,
            y: 0,
            start_delay_sec: 2,
            stop_mode: "infinite".to_string(),
            max_count: 100,
            max_duration_sec: 60,
            hotkey: "F6".to_string(),
        }
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct AutoClickerStatus {
    pub running: bool,
    pub countdown_remaining_sec: u64,
    pub total_actions: u64,
    pub elapsed_sec: u64,
    pub cursor_x: i32,
    pub cursor_y: i32,
    pub global_hotkey_supported: bool,
    pub active_hotkey: String,
    pub last_error: Option<String>,
}

pub struct AutoClickerInner {
    pub running: AtomicBool,
    pub stop_signal: AtomicBool,
    pub total_actions: AtomicU64,
    pub countdown_remaining_sec: AtomicU64,
    pub started_at_epoch_ms: AtomicU64,
    pub generation: AtomicU64,
    pub active_hotkey: Mutex<String>,
    pub last_config: Mutex<AutoClickerConfig>,
    pub last_error: Mutex<Option<String>>,
}

impl Default for AutoClickerInner {
    fn default() -> Self {
        Self {
            running: AtomicBool::new(false),
            stop_signal: AtomicBool::new(false),
            total_actions: AtomicU64::new(0),
            countdown_remaining_sec: AtomicU64::new(0),
            started_at_epoch_ms: AtomicU64::new(0),
            generation: AtomicU64::new(0),
            active_hotkey: Mutex::new("F6".to_string()),
            last_config: Mutex::new(AutoClickerConfig::default()),
            last_error: Mutex::new(None),
        }
    }
}

pub struct AutoClickerState(pub Arc<AutoClickerInner>);

impl Default for AutoClickerState {
    fn default() -> Self {
        Self(Arc::new(AutoClickerInner::default()))
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct KeepAwakeConfig {
    pub keep_display: bool,
    pub jiggle_mouse: bool,
    pub jiggle_interval_sec: u64, // 10..=600
    pub duration_minutes: u64,    // 0 = indefinite, else 1..=1440
}

#[derive(Clone, Debug, Serialize)]
pub struct KeepAwakeStatus {
    pub active: bool,
    pub keep_display: bool,
    pub jiggle_mouse: bool,
    pub jiggle_interval_sec: u64,
    pub duration_minutes: u64,
    pub elapsed_sec: u64,
    pub remaining_sec: Option<u64>,
    pub jiggle_count: u64,
    pub last_error: Option<String>,
}

pub struct KeepAwakeInner {
    pub active: AtomicBool,
    pub stop_signal: AtomicBool,
    pub generation: AtomicU64,
    pub jiggle_count: AtomicU64,
    pub started_at_epoch_ms: AtomicU64,
    pub config: Mutex<KeepAwakeConfig>,
    pub helper_child: Mutex<Option<Child>>,
    pub last_error: Mutex<Option<String>>,
}

impl Default for KeepAwakeInner {
    fn default() -> Self {
        Self {
            active: AtomicBool::new(false),
            stop_signal: AtomicBool::new(false),
            generation: AtomicU64::new(0),
            jiggle_count: AtomicU64::new(0),
            started_at_epoch_ms: AtomicU64::new(0),
            config: Mutex::new(KeepAwakeConfig {
                keep_display: true,
                jiggle_mouse: false,
                jiggle_interval_sec: 45,
                duration_minutes: 0,
            }),
            helper_child: Mutex::new(None),
            last_error: Mutex::new(None),
        }
    }
}

pub struct KeepAwakeState(pub Arc<KeepAwakeInner>);

impl Default for KeepAwakeState {
    fn default() -> Self {
        Self(Arc::new(KeepAwakeInner::default()))
    }
}

fn now_epoch_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

// ─── Platform Native Input & Power Primitives ────────────────────────────────

#[cfg(target_os = "windows")]
mod platform_native {
    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct Point {
        pub x: i32,
        pub y: i32,
    }

    const MOUSEEVENTF_MOVE: u32 = 0x0001;
    const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    const MOUSEEVENTF_RIGHTDOWN: u32 = 0x0008;
    const MOUSEEVENTF_RIGHTUP: u32 = 0x0010;
    const MOUSEEVENTF_MIDDLEDOWN: u32 = 0x0020;
    const MOUSEEVENTF_MIDDLEUP: u32 = 0x0040;
    const KEYEVENTF_KEYUP: u32 = 0x0002;

    const ES_CONTINUOUS: u32 = 0x8000_0000;
    const ES_SYSTEM_REQUIRED: u32 = 0x0000_0001;
    const ES_DISPLAY_REQUIRED: u32 = 0x0000_0002;

    #[link(name = "user32")]
    unsafe extern "system" {
        fn GetCursorPos(lp_point: *mut Point) -> i32;
        fn SetCursorPos(x: i32, y: i32) -> i32;
        fn mouse_event(dw_flags: u32, dx: i32, dy: i32, dw_data: u32, dw_extra_info: usize);
        fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
        fn GetAsyncKeyState(v_key: i32) -> i16;
    }

    #[link(name = "kernel32")]
    unsafe extern "system" {
        fn SetThreadExecutionState(es_flags: u32) -> u32;
    }

    pub fn get_cursor_pos() -> (i32, i32) {
        let mut pt = Point { x: 0, y: 0 };
        let ok = unsafe { GetCursorPos(&mut pt) };
        if ok != 0 { (pt.x, pt.y) } else { (0, 0) }
    }

    pub fn send_mouse_click(button: &str, double_click: bool, fixed_pos: Option<(i32, i32)>) -> Result<(), String> {
        if let Some((x, y)) = fixed_pos {
            unsafe {
                SetCursorPos(x, y);
            }
        }
        let (down, up) = match button {
            "right" => (MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP),
            "middle" => (MOUSEEVENTF_MIDDLEDOWN, MOUSEEVENTF_MIDDLEUP),
            _ => (MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP),
        };
        let clicks = if double_click { 2 } else { 1 };
        for idx in 0..clicks {
            unsafe {
                mouse_event(down, 0, 0, 0, 0);
                mouse_event(up, 0, 0, 0, 0);
            }
            if idx == 0 && double_click {
                std::thread::sleep(std::time::Duration::from_millis(35));
            }
        }
        Ok(())
    }

    pub fn jiggle_mouse_1px() -> Result<(), String> {
        unsafe {
            mouse_event(MOUSEEVENTF_MOVE, 1, 0, 0, 0);
            std::thread::sleep(std::time::Duration::from_millis(25));
            mouse_event(MOUSEEVENTF_MOVE, -1, 0, 0, 0);
        }
        Ok(())
    }

    fn map_key_to_vk(key: &str) -> Option<u8> {
        let upper = key.trim().to_uppercase();
        if upper.len() == 1 {
            let b = upper.as_bytes()[0];
            if b.is_ascii_uppercase() || b.is_ascii_digit() {
                return Some(b);
            }
        }
        match upper.as_str() {
            "SPACE" => Some(0x20),
            "ENTER" | "RETURN" => Some(0x0D),
            "TAB" => Some(0x09),
            "ESCAPE" | "ESC" => Some(0x1B),
            "BACKSPACE" => Some(0x08),
            "LEFT" => Some(0x25),
            "UP" => Some(0x26),
            "RIGHT" => Some(0x27),
            "DOWN" => Some(0x28),
            "F1" => Some(0x70),
            "F2" => Some(0x71),
            "F3" => Some(0x72),
            "F4" => Some(0x73),
            "F5" => Some(0x74),
            "F6" => Some(0x75),
            "F7" => Some(0x76),
            "F8" => Some(0x77),
            "F9" => Some(0x78),
            "F10" => Some(0x79),
            "F11" => Some(0x7A),
            "F12" => Some(0x7B),
            _ => None,
        }
    }

    pub fn send_key_press(key: &str) -> Result<(), String> {
        let vk = map_key_to_vk(key).ok_or_else(|| format!("Unsupported key: {}", key))?;
        unsafe {
            keybd_event(vk, 0, 0, 0);
            std::thread::sleep(std::time::Duration::from_millis(18));
            keybd_event(vk, 0, KEYEVENTF_KEYUP, 0);
        }
        Ok(())
    }

    pub fn is_hotkey_pressed(hotkey: &str) -> bool {
        let Some(vk) = map_key_to_vk(hotkey) else {
            return false;
        };
        let state = unsafe { GetAsyncKeyState(vk as i32) };
        (state as u16 & 0x8000) != 0
    }

    pub fn global_hotkey_supported() -> bool {
        true
    }

    pub fn set_keep_awake(active: bool, keep_display: bool) {
        let flags = if !active {
            ES_CONTINUOUS
        } else if keep_display {
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED
        } else {
            ES_CONTINUOUS | ES_SYSTEM_REQUIRED
        };
        unsafe {
            SetThreadExecutionState(flags);
        }
    }
}

#[cfg(target_os = "macos")]
mod platform_native {
    use std::ffi::c_void;

    #[repr(C)]
    #[derive(Clone, Copy)]
    pub struct CGPoint {
        pub x: f64,
        pub y: f64,
    }

    const K_CG_EVENT_LEFT_MOUSE_DOWN: u32 = 1;
    const K_CG_EVENT_LEFT_MOUSE_UP: u32 = 2;
    const K_CG_EVENT_RIGHT_MOUSE_DOWN: u32 = 3;
    const K_CG_EVENT_RIGHT_MOUSE_UP: u32 = 4;
    const K_CG_EVENT_MOUSE_MOVED: u32 = 5;
    const K_CG_EVENT_OTHER_MOUSE_DOWN: u32 = 25;
    const K_CG_EVENT_OTHER_MOUSE_UP: u32 = 26;
    const K_CG_MOUSE_BUTTON_LEFT: u32 = 0;
    const K_CG_MOUSE_BUTTON_RIGHT: u32 = 1;
    const K_CG_MOUSE_BUTTON_CENTER: u32 = 2;
    const K_CG_HID_EVENT_TAP: u32 = 0;

    #[link(name = "CoreGraphics", kind = "framework")]
    unsafe extern "C" {
        fn CGEventCreate(source: *const c_void) -> *mut c_void;
        fn CGEventGetLocation(event: *const c_void) -> CGPoint;
        fn CGEventCreateMouseEvent(
            source: *const c_void,
            mouse_type: u32,
            mouse_cursor_position: CGPoint,
            mouse_button: u32,
        ) -> *mut c_void;
        fn CGEventCreateKeyboardEvent(
            source: *const c_void,
            virtual_key: u16,
            key_down: bool,
        ) -> *mut c_void;
        fn CGEventPost(tap: u32, event: *mut c_void);
    }

    #[link(name = "CoreFoundation", kind = "framework")]
    unsafe extern "C" {
        fn CFRelease(cf: *const c_void);
    }

    pub fn get_cursor_pos() -> (i32, i32) {
        unsafe {
            let ev = CGEventCreate(std::ptr::null());
            if ev.is_null() {
                return (0, 0);
            }
            let pt = CGEventGetLocation(ev);
            CFRelease(ev);
            (pt.x.round() as i32, pt.y.round() as i32)
        }
    }

    pub fn send_mouse_click(button: &str, double_click: bool, fixed_pos: Option<(i32, i32)>) -> Result<(), String> {
        let (x, y) = fixed_pos.unwrap_or_else(get_cursor_pos);
        let pt = CGPoint { x: x as f64, y: y as f64 };
        let (down_ty, up_ty, btn) = match button {
            "right" => (K_CG_EVENT_RIGHT_MOUSE_DOWN, K_CG_EVENT_RIGHT_MOUSE_UP, K_CG_MOUSE_BUTTON_RIGHT),
            "middle" => (K_CG_EVENT_OTHER_MOUSE_DOWN, K_CG_EVENT_OTHER_MOUSE_UP, K_CG_MOUSE_BUTTON_CENTER),
            _ => (K_CG_EVENT_LEFT_MOUSE_DOWN, K_CG_EVENT_LEFT_MOUSE_UP, K_CG_MOUSE_BUTTON_LEFT),
        };
        let clicks = if double_click { 2 } else { 1 };
        for idx in 0..clicks {
            unsafe {
                let down = CGEventCreateMouseEvent(std::ptr::null(), down_ty, pt, btn);
                let up = CGEventCreateMouseEvent(std::ptr::null(), up_ty, pt, btn);
                if !down.is_null() {
                    CGEventPost(K_CG_HID_EVENT_TAP, down);
                    CFRelease(down);
                }
                if !up.is_null() {
                    CGEventPost(K_CG_HID_EVENT_TAP, up);
                    CFRelease(up);
                }
            }
            if idx == 0 && double_click {
                std::thread::sleep(std::time::Duration::from_millis(35));
            }
        }
        Ok(())
    }

    pub fn jiggle_mouse_1px() -> Result<(), String> {
        let (x, y) = get_cursor_pos();
        let p1 = CGPoint { x: (x + 1) as f64, y: y as f64 };
        let p2 = CGPoint { x: x as f64, y: y as f64 };
        unsafe {
            let m1 = CGEventCreateMouseEvent(std::ptr::null(), K_CG_EVENT_MOUSE_MOVED, p1, K_CG_MOUSE_BUTTON_LEFT);
            if !m1.is_null() {
                CGEventPost(K_CG_HID_EVENT_TAP, m1);
                CFRelease(m1);
            }
            std::thread::sleep(std::time::Duration::from_millis(25));
            let m2 = CGEventCreateMouseEvent(std::ptr::null(), K_CG_EVENT_MOUSE_MOVED, p2, K_CG_MOUSE_BUTTON_LEFT);
            if !m2.is_null() {
                CGEventPost(K_CG_HID_EVENT_TAP, m2);
                CFRelease(m2);
            }
        }
        Ok(())
    }

    fn map_key_to_mac_keycode(key: &str) -> Option<u16> {
        match key.trim().to_uppercase().as_str() {
            "A" => Some(0x00), "S" => Some(0x01), "D" => Some(0x02), "F" => Some(0x03),
            "H" => Some(0x04), "G" => Some(0x05), "Z" => Some(0x06), "X" => Some(0x07),
            "C" => Some(0x08), "V" => Some(0x09), "B" => Some(0x0B), "Q" => Some(0x0C),
            "W" => Some(0x0D), "E" => Some(0x0E), "R" => Some(0x0F), "Y" => Some(0x10),
            "T" => Some(0x11), "1" => Some(0x12), "2" => Some(0x13), "3" => Some(0x14),
            "4" => Some(0x15), "6" => Some(0x16), "5" => Some(0x17), "9" => Some(0x19),
            "7" => Some(0x1A), "8" => Some(0x1C), "0" => Some(0x1D), "O" => Some(0x1F),
            "U" => Some(0x20), "I" => Some(0x22), "P" => Some(0x23), "L" => Some(0x25),
            "J" => Some(0x26), "K" => Some(0x28), "N" => Some(0x2D), "M" => Some(0x2E),
            "ENTER" | "RETURN" => Some(0x24),
            "TAB" => Some(0x30),
            "SPACE" => Some(0x31),
            "BACKSPACE" => Some(0x33),
            "ESCAPE" | "ESC" => Some(0x35),
            "LEFT" => Some(0x7B),
            "RIGHT" => Some(0x7C),
            "DOWN" => Some(0x7D),
            "UP" => Some(0x7E),
            "F1" => Some(0x7A), "F2" => Some(0x78), "F3" => Some(0x63), "F4" => Some(0x76),
            "F5" => Some(0x60), "F6" => Some(0x61), "F7" => Some(0x62), "F8" => Some(0x64),
            "F9" => Some(0x65), "F10" => Some(0x6D), "F11" => Some(0x67), "F12" => Some(0x6F),
            _ => None,
        }
    }

    pub fn send_key_press(key: &str) -> Result<(), String> {
        let code = map_key_to_mac_keycode(key).ok_or_else(|| format!("Unsupported key: {}", key))?;
        unsafe {
            let down = CGEventCreateKeyboardEvent(std::ptr::null(), code, true);
            let up = CGEventCreateKeyboardEvent(std::ptr::null(), code, false);
            if !down.is_null() {
                CGEventPost(K_CG_HID_EVENT_TAP, down);
                CFRelease(down);
            }
            std::thread::sleep(std::time::Duration::from_millis(18));
            if !up.is_null() {
                CGEventPost(K_CG_HID_EVENT_TAP, up);
                CFRelease(up);
            }
        }
        Ok(())
    }

    pub fn is_hotkey_pressed(_hotkey: &str) -> bool {
        false
    }

    pub fn global_hotkey_supported() -> bool {
        false
    }

    pub fn set_keep_awake(_active: bool, _keep_display: bool) {}
}

#[cfg(all(unix, not(target_os = "macos")))]
mod platform_native {
    use std::process::Command;

    pub fn get_cursor_pos() -> (i32, i32) {
        let Ok(out) = Command::new("xdotool").args(["getmouselocation", "--shell"]).output() else {
            return (0, 0);
        };
        let text = String::from_utf8_lossy(&out.stdout);
        let mut x = 0;
        let mut y = 0;
        for line in text.lines() {
            if let Some(v) = line.strip_prefix("X=") {
                x = v.trim().parse().unwrap_or(0);
            } else if let Some(v) = line.strip_prefix("Y=") {
                y = v.trim().parse().unwrap_or(0);
            }
        }
        (x, y)
    }

    pub fn send_mouse_click(button: &str, double_click: bool, fixed_pos: Option<(i32, i32)>) -> Result<(), String> {
        if let Some((x, y)) = fixed_pos {
            let _ = Command::new("xdotool")
                .args(["mousemove", &x.to_string(), &y.to_string()])
                .status();
        }
        let btn = match button {
            "right" => "3",
            "middle" => "2",
            _ => "1",
        };
        let repeat = if double_click { "2" } else { "1" };
        let status = Command::new("xdotool")
            .args(["click", "--repeat", repeat, "--delay", "35", btn])
            .status()
            .map_err(|_| "xdotool is required on Linux X11 for Auto-Clicker (install with: sudo apt install xdotool)".to_string())?;
        if !status.success() {
            return Err("xdotool click command exited with an error.".to_string());
        }
        Ok(())
    }

    pub fn jiggle_mouse_1px() -> Result<(), String> {
        let status = Command::new("xdotool")
            .args(["mousemove_relative", "--", "1", "0"])
            .status()
            .map_err(|_| "xdotool is required on Linux for Mouse Jiggler (sudo apt install xdotool)".to_string())?;
        if status.success() {
            std::thread::sleep(std::time::Duration::from_millis(25));
            let _ = Command::new("xdotool")
                .args(["mousemove_relative", "--", "-1", "0"])
                .status();
        }
        Ok(())
    }

    fn map_key_to_x11(key: &str) -> Option<&'static str> {
        match key.trim().to_uppercase().as_str() {
            "SPACE" => Some("space"),
            "ENTER" | "RETURN" => Some("Return"),
            "TAB" => Some("Tab"),
            "ESCAPE" | "ESC" => Some("Escape"),
            "BACKSPACE" => Some("BackSpace"),
            "LEFT" => Some("Left"),
            "RIGHT" => Some("Right"),
            "UP" => Some("Up"),
            "DOWN" => Some("Down"),
            "F1" => Some("F1"), "F2" => Some("F2"), "F3" => Some("F3"), "F4" => Some("F4"),
            "F5" => Some("F5"), "F6" => Some("F6"), "F7" => Some("F7"), "F8" => Some("F8"),
            "F9" => Some("F9"), "F10" => Some("F10"), "F11" => Some("F11"), "F12" => Some("F12"),
            _ => None,
        }
    }

    pub fn send_key_press(key: &str) -> Result<(), String> {
        let trimmed = key.trim();
        let xkey: String = if let Some(mapped) = map_key_to_x11(trimmed) {
            mapped.to_string()
        } else if trimmed.len() == 1 && trimmed.as_bytes()[0].is_ascii_alphanumeric() {
            trimmed.to_lowercase()
        } else {
            return Err(format!("Unsupported key: {}", key));
        };
        let status = Command::new("xdotool")
            .args(["key", &xkey])
            .status()
            .map_err(|_| "xdotool is required on Linux X11 for Key Presser (sudo apt install xdotool)".to_string())?;
        if !status.success() {
            return Err("xdotool key command failed.".to_string());
        }
        Ok(())
    }

    pub fn is_hotkey_pressed(_hotkey: &str) -> bool {
        false
    }

    pub fn global_hotkey_supported() -> bool {
        false
    }

    pub fn set_keep_awake(_active: bool, _keep_display: bool) {}
}

// ─── 1. Port & Process Manager Commands ──────────────────────────────────────

#[derive(Clone, Debug, Serialize)]
pub struct DesktopProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_mb: f64,
    pub status: String,
    pub cmd: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct DesktopListeningPort {
    pub protocol: String,
    pub local_address: String,
    pub port: u16,
    pub state: String,
    pub pid: u32,
    pub process_name: String,
}

#[derive(Default)]
pub struct ProcessMonitorState(pub Mutex<Option<System>>);

pub fn clear_process_monitor_cache(app: &AppHandle) {
    if let Some(state) = app.try_state::<ProcessMonitorState>() {
        if let Ok(mut guard) = state.0.lock() {
            *guard = None;
        }
    }
}

#[tauri::command]
pub fn desktop_release_process_cache(state: State<'_, ProcessMonitorState>) {
    if let Ok(mut guard) = state.0.lock() {
        *guard = None;
    }
}

#[tauri::command]
pub fn desktop_list_processes(
    limit: Option<usize>,
    state: State<'_, ProcessMonitorState>,
) -> Result<Vec<DesktopProcessInfo>, String> {
    let max_items = limit.unwrap_or(150).clamp(10, 500);
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let sys = guard.get_or_insert_with(|| {
        System::new_with_specifics(RefreshKind::new().with_cpu(CpuRefreshKind::everything()))
    });
    sys.refresh_processes();
    let core_count = sys.cpus().len().max(1) as f32;

    let mut list: Vec<DesktopProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, proc_info)| {
            let cmd_joined = proc_info.cmd().join(" ");
            let cmd_trimmed = if cmd_joined.chars().count() > 160 {
                format!("{}...", cmd_joined.chars().take(157).collect::<String>())
            } else {
                cmd_joined
            };
            let raw_cpu = proc_info.cpu_usage() / core_count;
            let norm_cpu = if raw_cpu.is_finite() {
                (raw_cpu.clamp(0.0, 100.0) * 10.0).round() / 10.0
            } else {
                0.0
            };
            DesktopProcessInfo {
                pid: pid.as_u32(),
                name: proc_info.name().to_string(),
                cpu_usage: norm_cpu,
                memory_mb: ((proc_info.memory() as f64 / (1024.0 * 1024.0)) * 10.0).round() / 10.0,
                status: format!("{:?}", proc_info.status()),
                cmd: cmd_trimmed,
            }
        })
        .collect();

    list.sort_by(|a, b| {
        b.memory_mb
            .partial_cmp(&a.memory_mb)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    list.truncate(max_items);
    Ok(list)
}

#[tauri::command]
pub fn desktop_kill_process(pid: u32, state: State<'_, ProcessMonitorState>) -> Result<bool, String> {
    if pid == 0 {
        return Err("Refusing to terminate system PID 0.".to_string());
    }
    if pid == std::process::id() {
        return Err("Refusing to terminate OmniDesk itself.".to_string());
    }
    let mut guard = state.0.lock().map_err(|e| e.to_string())?;
    let sys = guard.get_or_insert_with(System::new);
    sys.refresh_processes();
    let Some(process) = sys.process(Pid::from_u32(pid)) else {
        return Err(format!("Process with PID {} was not found.", pid));
    };
    if process.kill() {
        Ok(true)
    } else {
        Err(format!(
            "Could not terminate PID {} (insufficient permissions or protected OS process).",
            pid
        ))
    }
}

fn parse_addr_and_port(endpoint: &str) -> Option<(String, u16)> {
    let trimmed = endpoint.trim();
    if trimmed.is_empty() || trimmed == "*:*" {
        return None;
    }
    if let Some(bracket_end) = trimmed.rfind("]:") {
        let addr = &trimmed[..=bracket_end];
        let port = trimmed[bracket_end + 2..].parse::<u16>().ok()?;
        return Some((addr.to_string(), port));
    }
    let colon_idx = trimmed.rfind(':')?;
    let addr = &trimmed[..colon_idx];
    let port = trimmed[colon_idx + 1..].parse::<u16>().ok()?;
    Some((addr.to_string(), port))
}

#[tauri::command]
pub fn desktop_list_ports(state: State<'_, ProcessMonitorState>) -> Result<Vec<DesktopListeningPort>, String> {
    let pid_names: HashMap<u32, String> = {
        let mut guard = state.0.lock().map_err(|e| e.to_string())?;
        if let Some(sys) = guard.as_mut() {
            sys.refresh_processes();
            sys.processes()
                .iter()
                .map(|(pid, p)| (pid.as_u32(), p.name().to_string()))
                .collect()
        } else {
            drop(guard);
            let mut temp_sys = System::new();
            temp_sys.refresh_processes();
            temp_sys
                .processes()
                .iter()
                .map(|(pid, p)| (pid.as_u32(), p.name().to_string()))
                .collect()
        }
    };

    let mut ports: Vec<DesktopListeningPort> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let output = new_hidden_command("netstat")
            .args(["-ano"])
            .output()
            .map_err(|e| format!("Failed to execute netstat: {}", e))?;
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            let cols: Vec<&str> = line.split_whitespace().collect();
            if cols.len() < 4 {
                continue;
            }
            let proto = cols[0].to_uppercase();
            if proto == "TCP" && cols.len() >= 5 {
                let state_str = cols[3].to_uppercase();
                if state_str != "LISTENING" {
                    continue;
                }
                if let (Some((addr, port)), Ok(pid)) =
                    (parse_addr_and_port(cols[1]), cols[4].parse::<u32>())
                {
                    ports.push(DesktopListeningPort {
                        protocol: "TCP".to_string(),
                        local_address: addr,
                        port,
                        state: "LISTEN".to_string(),
                        pid,
                        process_name: pid_names
                            .get(&pid)
                            .cloned()
                            .unwrap_or_else(|| "System".to_string()),
                    });
                }
            } else if proto == "UDP" && cols.len() >= 4 {
                if let (Some((addr, port)), Ok(pid)) =
                    (parse_addr_and_port(cols[1]), cols[3].parse::<u32>())
                {
                    ports.push(DesktopListeningPort {
                        protocol: "UDP".to_string(),
                        local_address: addr,
                        port,
                        state: "BOUND".to_string(),
                        pid,
                        process_name: pid_names
                            .get(&pid)
                            .cloned()
                            .unwrap_or_else(|| "System".to_string()),
                    });
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        if let Ok(output) = new_hidden_command("lsof")
            .args(["-nP", "-iTCP", "-sTCP:LISTEN"])
            .output()
        {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines().skip(1) {
                let cols: Vec<&str> = line.split_whitespace().collect();
                if cols.len() < 9 {
                    continue;
                }
                let pid = cols[1].parse::<u32>().unwrap_or(0);
                let name_col = cols.get(8).copied().unwrap_or("");
                let endpoint = name_col.trim_end_matches("(LISTEN)");
                if let Some((addr, port)) = parse_addr_and_port(endpoint) {
                    ports.push(DesktopListeningPort {
                        protocol: "TCP".to_string(),
                        local_address: addr,
                        port,
                        state: "LISTEN".to_string(),
                        pid,
                        process_name: pid_names
                            .get(&pid)
                            .cloned()
                            .unwrap_or_else(|| cols[0].to_string()),
                    });
                }
            }
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        if let Ok(output) = new_hidden_command("ss").args(["-tulnp"]).output() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines().skip(1) {
                let cols: Vec<&str> = line.split_whitespace().collect();
                if cols.len() < 5 {
                    continue;
                }
                let proto = cols[0].to_uppercase();
                let state_str = cols[1].to_uppercase();
                let local = cols[4];
                let Some((addr, port)) = parse_addr_and_port(local) else {
                    continue;
                };
                let rest = if cols.len() > 6 {
                    cols[6..].join(" ")
                } else {
                    String::new()
                };
                let pid = rest
                    .split("pid=")
                    .nth(1)
                    .and_then(|s| s.split(|c: char| !c.is_ascii_digit()).next())
                    .and_then(|d| d.parse::<u32>().ok())
                    .unwrap_or(0);
                let proc_name = pid_names.get(&pid).cloned().unwrap_or_else(|| {
                    rest.split('"')
                        .nth(1)
                        .unwrap_or("Unknown")
                        .to_string()
                });
                ports.push(DesktopListeningPort {
                    protocol: if proto.starts_with("UDP") {
                        "UDP".to_string()
                    } else {
                        "TCP".to_string()
                    },
                    local_address: addr,
                    port,
                    state: state_str,
                    pid,
                    process_name: proc_name,
                });
            }
        }
    }

    // Deduplicate identical (protocol, local_address, port, pid) entries and sort by port
    ports.sort_by(|a, b| a.port.cmp(&b.port).then_with(|| a.protocol.cmp(&b.protocol)));
    ports.dedup_by(|a, b| {
        a.port == b.port
            && a.protocol == b.protocol
            && a.pid == b.pid
            && a.local_address == b.local_address
    });
    Ok(ports)
}

// ─── 2. Native Network Diagnostics & Wake-on-LAN Commands ────────────────────

fn is_valid_host(host: &str) -> bool {
    let trimmed = host.trim();
    if trimmed.is_empty() || trimmed.len() > 253 || trimmed.starts_with('-') {
        return false;
    }
    trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || matches!(c, '.' | '-' | ':'))
}

#[derive(Clone, Debug, Serialize)]
pub struct PingResult {
    pub host: String,
    pub sent: u32,
    pub received: u32,
    pub loss_percent: f64,
    pub rtts_ms: Vec<f64>,
    pub min_ms: Option<f64>,
    pub avg_ms: Option<f64>,
    pub max_ms: Option<f64>,
    pub raw_output: String,
    pub success: bool,
}

fn extract_ping_rtts(output: &str) -> Vec<f64> {
    let mut rtts = Vec::new();
    for line in output.lines() {
        let lower = line.to_lowercase();
        if let Some(pos) = lower.find("time=").or_else(|| lower.find("time<")) {
            let after = &lower[pos + 5..];
            let num_str: String = after
                .chars()
                .take_while(|c| c.is_ascii_digit() || *c == '.')
                .collect();
            if let Ok(val) = num_str.parse::<f64>() {
                rtts.push(val);
            }
        }
    }
    rtts
}

#[tauri::command]
pub fn desktop_net_ping(host: String, count: Option<u32>) -> Result<PingResult, String> {
    let trimmed = host.trim().to_string();
    if !is_valid_host(&trimmed) {
        return Err("Invalid hostname or IP address.".to_string());
    }
    let packets = count.unwrap_or(4).clamp(1, 10);
    let count_arg = packets.to_string();

    #[cfg(target_os = "windows")]
    let output = new_hidden_command("ping")
        .args(["-n", &count_arg, "-w", "2000", &trimmed])
        .output()
        .map_err(|e| format!("Failed to execute ping: {}", e))?;

    #[cfg(target_os = "macos")]
    let output = new_hidden_command("ping")
        .args(["-c", &count_arg, "-W", "2000", &trimmed])
        .output()
        .map_err(|e| format!("Failed to execute ping: {}", e))?;

    #[cfg(all(unix, not(target_os = "macos")))]
    let output = new_hidden_command("ping")
        .args(["-c", &count_arg, "-W", "2", &trimmed])
        .output()
        .map_err(|e| format!("Failed to execute ping: {}", e))?;

    let raw_stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let raw_stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let combined = if raw_stderr.trim().is_empty() {
        raw_stdout
    } else {
        format!("{}\n{}", raw_stdout, raw_stderr)
    };

    let rtts = extract_ping_rtts(&combined);
    let received = (rtts.len() as u32).min(packets);
    let loss_percent = if packets > 0 {
        (((packets - received) as f64 / packets as f64) * 1000.0).round() / 10.0
    } else {
        100.0
    };
    let min_ms = rtts.iter().copied().reduce(f64::min);
    let max_ms = rtts.iter().copied().reduce(f64::max);
    let avg_ms = if rtts.is_empty() {
        None
    } else {
        let sum: f64 = rtts.iter().sum();
        Some(((sum / rtts.len() as f64) * 100.0).round() / 100.0)
    };

    Ok(PingResult {
        host: trimmed,
        sent: packets,
        received,
        loss_percent,
        rtts_ms: rtts,
        min_ms,
        avg_ms,
        max_ms,
        raw_output: combined.trim().to_string(),
        success: output.status.success() && received > 0,
    })
}

#[derive(Clone, Debug, Serialize)]
pub struct TcpCheckResult {
    pub host: String,
    pub port: u16,
    pub resolved_ip: Option<String>,
    pub open: bool,
    pub latency_ms: u64,
    pub error: Option<String>,
}

#[tauri::command]
pub fn desktop_net_tcp_check(
    host: String,
    port: u16,
    timeout_ms: Option<u64>,
) -> Result<TcpCheckResult, String> {
    let trimmed = host.trim().to_string();
    if !is_valid_host(&trimmed) {
        return Err("Invalid hostname or IP address.".to_string());
    }
    let timeout = Duration::from_millis(timeout_ms.unwrap_or(2000).clamp(200, 10_000));
    let start = Instant::now();
    let target = format!("{}:{}", trimmed, port);

    let addrs: Vec<SocketAddr> = match target.to_socket_addrs() {
        Ok(iter) => iter.collect(),
        Err(e) => {
            return Ok(TcpCheckResult {
                host: trimmed,
                port,
                resolved_ip: None,
                open: false,
                latency_ms: start.elapsed().as_millis() as u64,
                error: Some(format!("DNS resolution failed: {}", e)),
            });
        }
    };

    let Some(first_addr) = addrs.first().copied() else {
        return Ok(TcpCheckResult {
            host: trimmed,
            port,
            resolved_ip: None,
            open: false,
            latency_ms: start.elapsed().as_millis() as u64,
            error: Some("No IP addresses resolved for host.".to_string()),
        });
    };

    match TcpStream::connect_timeout(&first_addr, timeout) {
        Ok(_) => Ok(TcpCheckResult {
            host: trimmed,
            port,
            resolved_ip: Some(first_addr.ip().to_string()),
            open: true,
            latency_ms: start.elapsed().as_millis() as u64,
            error: None,
        }),
        Err(e) => Ok(TcpCheckResult {
            host: trimmed,
            port,
            resolved_ip: Some(first_addr.ip().to_string()),
            open: false,
            latency_ms: start.elapsed().as_millis() as u64,
            error: Some(e.to_string()),
        }),
    }
}

#[derive(Clone, Debug, Serialize)]
pub struct DnsLookupResult {
    pub host: String,
    pub record_type: String,
    pub ipv4: Vec<String>,
    pub ipv6: Vec<String>,
    pub raw_records: String,
    pub elapsed_ms: u64,
}

#[tauri::command]
pub fn desktop_net_dns_lookup(
    host: String,
    record_type: Option<String>,
) -> Result<DnsLookupResult, String> {
    let trimmed = host.trim().to_string();
    if !is_valid_host(&trimmed) {
        return Err("Invalid hostname.".to_string());
    }
    let rtype = match record_type
        .unwrap_or_else(|| "A".to_string())
        .trim()
        .to_uppercase()
        .as_str()
    {
        "A" => "A",
        "AAAA" => "AAAA",
        "MX" => "MX",
        "TXT" => "TXT",
        "NS" => "NS",
        "CNAME" => "CNAME",
        _ => "A",
    }
    .to_string();

    let start = Instant::now();
    let mut ipv4 = Vec::new();
    let mut ipv6 = Vec::new();
    if let Ok(addrs) = format!("{}:80", trimmed).to_socket_addrs() {
        for addr in addrs {
            match addr.ip() {
                IpAddr::V4(v4) => {
                    let s = v4.to_string();
                    if !ipv4.contains(&s) {
                        ipv4.push(s);
                    }
                }
                IpAddr::V6(v6) => {
                    let s = v6.to_string();
                    if !ipv6.contains(&s) {
                        ipv6.push(s);
                    }
                }
            }
        }
    }

    let raw_records = {
        let type_flag = format!("-type={}", rtype);
        match new_hidden_command("nslookup")
            .args([type_flag.as_str(), trimmed.as_str()])
            .output()
        {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let stderr = String::from_utf8_lossy(&out.stderr).trim().to_string();
                if stdout.is_empty() { stderr } else { stdout }
            }
            Err(_) => String::new(),
        }
    };

    Ok(DnsLookupResult {
        host: trimmed,
        record_type: rtype,
        ipv4,
        ipv6,
        raw_records,
        elapsed_ms: start.elapsed().as_millis() as u64,
    })
}

#[derive(Clone, Debug, Serialize)]
pub struct NetworkInterfaceInfo {
    pub name: String,
    pub mac_address: String,
    pub received_mb: f64,
    pub transmitted_mb: f64,
}

#[derive(Clone, Debug, Serialize)]
pub struct HostNetworkSummary {
    pub primary_local_ip: Option<String>,
    pub interfaces: Vec<NetworkInterfaceInfo>,
}

#[tauri::command]
pub fn desktop_net_interfaces() -> Result<HostNetworkSummary, String> {
    let primary_local_ip = UdpSocket::bind("0.0.0.0:0")
        .ok()
        .and_then(|sock| {
            sock.connect("8.8.8.8:80").ok()?;
            sock.local_addr().ok().map(|addr| addr.ip().to_string())
        });

    let networks = Networks::new_with_refreshed_list();
    let mut interfaces: Vec<NetworkInterfaceInfo> = networks
        .list()
        .iter()
        .map(|(name, data)| NetworkInterfaceInfo {
            name: name.clone(),
            mac_address: data.mac_address().to_string(),
            received_mb: ((data.total_received() as f64 / (1024.0 * 1024.0)) * 100.0).round() / 100.0,
            transmitted_mb: ((data.total_transmitted() as f64 / (1024.0 * 1024.0)) * 100.0).round() / 100.0,
        })
        .collect();

    interfaces.sort_by(|a, b| {
        (b.received_mb + b.transmitted_mb)
            .partial_cmp(&(a.received_mb + a.transmitted_mb))
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    Ok(HostNetworkSummary {
        primary_local_ip,
        interfaces,
    })
}

fn parse_mac_bytes(mac: &str) -> Result<[u8; 6], String> {
    let clean: String = mac
        .trim()
        .chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect();
    if clean.len() != 12 {
        return Err("Invalid MAC address. Expected 12 hex digits (e.g. AA:BB:CC:DD:EE:FF).".to_string());
    }
    let mut bytes = [0u8; 6];
    for i in 0..6 {
        bytes[i] = u8::from_str_radix(&clean[i * 2..i * 2 + 2], 16)
            .map_err(|_| "Invalid hex byte in MAC address.".to_string())?;
    }
    Ok(bytes)
}

#[tauri::command]
pub fn desktop_net_wol(
    mac: String,
    broadcast_ip: Option<String>,
    port: Option<u16>,
) -> Result<String, String> {
    let mac_bytes = parse_mac_bytes(&mac)?;
    let target_ip: Ipv4Addr = broadcast_ip
        .unwrap_or_else(|| "255.255.255.255".to_string())
        .trim()
        .parse()
        .map_err(|_| "Invalid IPv4 broadcast address (e.g. 255.255.255.255 or 192.168.1.255).".to_string())?;
    let target_port = port.unwrap_or(9);

    let mut packet = [0u8; 102];
    for b in &mut packet[0..6] {
        *b = 0xFF;
    }
    for i in 0..16 {
        let start = 6 + i * 6;
        packet[start..start + 6].copy_from_slice(&mac_bytes);
    }

    let socket = UdpSocket::bind("0.0.0.0:0").map_err(|e| format!("UDP bind failed: {}", e))?;
    socket
        .set_broadcast(true)
        .map_err(|e| format!("Failed to enable UDP broadcast: {}", e))?;
    let dest = SocketAddr::new(IpAddr::V4(target_ip), target_port);
    socket
        .send_to(&packet, dest)
        .map_err(|e| format!("Failed to send Wake-on-LAN packet: {}", e))?;

    let normalized_mac = mac_bytes
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<_>>()
        .join(":");
    Ok(format!(
        "Sent 102-byte Magic Packet to {} via {}:{}",
        normalized_mac, target_ip, target_port
    ))
}

// ─── 3. Auto-Clicker & Key Presser Commands ──────────────────────────────────

fn spawn_autoclicker_worker(inner: Arc<AutoClickerInner>, config: AutoClickerConfig) {
    let run_gen = inner.generation.fetch_add(1, Ordering::SeqCst) + 1;
    inner.stop_signal.store(false, Ordering::SeqCst);
    inner.total_actions.store(0, Ordering::SeqCst);
    inner.countdown_remaining_sec.store(config.start_delay_sec.min(30), Ordering::SeqCst);
    inner.started_at_epoch_ms.store(now_epoch_ms(), Ordering::SeqCst);
    inner.running.store(true, Ordering::SeqCst);

    if let Ok(mut hk) = inner.active_hotkey.lock() {
        *hk = config.hotkey.clone();
    }
    if let Ok(mut cfg) = inner.last_config.lock() {
        *cfg = config.clone();
    }
    if let Ok(mut err) = inner.last_error.lock() {
        *err = None;
    }

    std::thread::spawn(move || {
        // Countdown before starting
        let delay_sec = config.start_delay_sec.min(30);
        for rem in (1..=delay_sec).rev() {
            if inner.stop_signal.load(Ordering::SeqCst)
                || inner.generation.load(Ordering::SeqCst) != run_gen
            {
                inner.running.store(false, Ordering::SeqCst);
                inner.countdown_remaining_sec.store(0, Ordering::SeqCst);
                return;
            }
            inner.countdown_remaining_sec.store(rem, Ordering::SeqCst);
            for _ in 0..10 {
                if inner.stop_signal.load(Ordering::SeqCst)
                    || inner.generation.load(Ordering::SeqCst) != run_gen
                {
                    inner.running.store(false, Ordering::SeqCst);
                    inner.countdown_remaining_sec.store(0, Ordering::SeqCst);
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
        inner.countdown_remaining_sec.store(0, Ordering::SeqCst);
        let run_start = Instant::now();
        inner.started_at_epoch_ms.store(now_epoch_ms(), Ordering::SeqCst);

        let base_interval = config.interval_ms.clamp(10, 3_600_000);
        let jitter = config.jitter_ms.min(5_000);
        let max_count = config.max_count.clamp(1, 1_000_000);
        let max_duration = Duration::from_secs(config.max_duration_sec.clamp(1, 86_400));
        let mut prng: u64 = now_epoch_ms() ^ 0x9E37_79B9_7F4A_7C15;

        while !inner.stop_signal.load(Ordering::SeqCst)
            && inner.generation.load(Ordering::SeqCst) == run_gen
        {
            if config.stop_mode == "duration" && run_start.elapsed() >= max_duration {
                break;
            }

            let action_res = if config.mode == "key" {
                platform_native::send_key_press(&config.key)
            } else {
                let pos = if config.use_fixed_pos {
                    Some((config.x, config.y))
                } else {
                    None
                };
                platform_native::send_mouse_click(
                    &config.button,
                    config.click_type == "double",
                    pos,
                )
            };

            if let Err(msg) = action_res {
                if let Ok(mut err) = inner.last_error.lock() {
                    *err = Some(msg);
                }
                break;
            }

            let done = inner.total_actions.fetch_add(1, Ordering::SeqCst) + 1;
            if config.stop_mode == "count" && done >= max_count {
                break;
            }

            // Compute next sleep with optional symmetric jitter using xorshift64
            let sleep_ms = if jitter > 0 {
                prng ^= prng << 13;
                prng ^= prng >> 7;
                prng ^= prng << 17;
                let span = jitter.saturating_mul(2).saturating_add(1);
                let offset = (prng % span) as i64 - jitter as i64;
                (base_interval as i64 + offset).max(10) as u64
            } else {
                base_interval
            };

            let deadline = Instant::now() + Duration::from_millis(sleep_ms);
            while Instant::now() < deadline {
                if inner.stop_signal.load(Ordering::SeqCst)
                    || inner.generation.load(Ordering::SeqCst) != run_gen
                {
                    break;
                }
                let rem = deadline.saturating_duration_since(Instant::now());
                std::thread::sleep(rem.min(Duration::from_millis(25)));
            }
        }

        if inner.generation.load(Ordering::SeqCst) == run_gen {
            inner.running.store(false, Ordering::SeqCst);
            inner.countdown_remaining_sec.store(0, Ordering::SeqCst);
        }
    });
}

pub fn spawn_global_hotkey_watcher(inner: Arc<AutoClickerInner>) {
    if !platform_native::global_hotkey_supported() {
        return;
    }
    std::thread::spawn(move || {
        let mut was_down = false;
        loop {
            let is_down = inner
                .active_hotkey
                .lock()
                .map(|g| platform_native::is_hotkey_pressed(g.as_str()))
                .unwrap_or_else(|_| platform_native::is_hotkey_pressed("F6"));
            if is_down && !was_down {
                if inner.running.load(Ordering::SeqCst) {
                    inner.stop_signal.store(true, Ordering::SeqCst);
                } else {
                    let cfg = inner
                        .last_config
                        .lock()
                        .map(|g| g.clone())
                        .unwrap_or_default();
                    let mut instant_cfg = cfg;
                    instant_cfg.start_delay_sec = 0;
                    spawn_autoclicker_worker(Arc::clone(&inner), instant_cfg);
                }
            }
            was_down = is_down;
            std::thread::sleep(Duration::from_millis(45));
        }
    });
}

#[tauri::command]
pub fn desktop_autoclicker_start(
    config: AutoClickerConfig,
    state: State<'_, AutoClickerState>,
) -> Result<AutoClickerStatus, String> {
    if config.interval_ms < 10 {
        return Err("Interval must be at least 10 ms for OS safety.".to_string());
    }
    spawn_autoclicker_worker(Arc::clone(&state.0), config);
    desktop_autoclicker_status(state)
}

#[tauri::command]
pub fn desktop_autoclicker_stop(state: State<'_, AutoClickerState>) -> Result<AutoClickerStatus, String> {
    state.0.stop_signal.store(true, Ordering::SeqCst);
    state.0.running.store(false, Ordering::SeqCst);
    state.0.countdown_remaining_sec.store(0, Ordering::SeqCst);
    desktop_autoclicker_status(state)
}

#[tauri::command]
pub fn desktop_autoclicker_set_hotkey(
    hotkey: String,
    state: State<'_, AutoClickerState>,
) -> Result<String, String> {
    let cleaned = match hotkey.trim().to_uppercase().as_str() {
        "F6" => "F6",
        "F7" => "F7",
        "F8" => "F8",
        "F9" => "F9",
        "F10" => "F10",
        _ => return Err("Hotkey must be one of F6, F7, F8, F9, or F10.".to_string()),
    }
    .to_string();
    if let Ok(mut hk) = state.0.active_hotkey.lock() {
        *hk = cleaned.clone();
    }
    if let Ok(mut cfg) = state.0.last_config.lock() {
        cfg.hotkey = cleaned.clone();
    }
    Ok(cleaned)
}

#[tauri::command]
pub fn desktop_autoclicker_status(
    state: State<'_, AutoClickerState>,
) -> Result<AutoClickerStatus, String> {
    let running = state.0.running.load(Ordering::SeqCst);
    let countdown_remaining_sec = state.0.countdown_remaining_sec.load(Ordering::SeqCst);
    let total_actions = state.0.total_actions.load(Ordering::SeqCst);
    let started = state.0.started_at_epoch_ms.load(Ordering::SeqCst);
    let elapsed_sec = if running && countdown_remaining_sec == 0 && started > 0 {
        now_epoch_ms().saturating_sub(started) / 1000
    } else {
        0
    };
    let (cursor_x, cursor_y) = platform_native::get_cursor_pos();
    let active_hotkey = state
        .0
        .active_hotkey
        .lock()
        .map(|g| g.clone())
        .unwrap_or_else(|_| "F6".to_string());
    let last_error = state.0.last_error.lock().ok().and_then(|g| g.clone());

    Ok(AutoClickerStatus {
        running,
        countdown_remaining_sec,
        total_actions,
        elapsed_sec,
        cursor_x,
        cursor_y,
        global_hotkey_supported: platform_native::global_hotkey_supported(),
        active_hotkey,
        last_error,
    })
}

#[tauri::command]
pub fn desktop_cursor_position() -> (i32, i32) {
    platform_native::get_cursor_pos()
}

// ─── 4. Keep-Awake (Caffeine) & Mouse Jiggler Commands ───────────────────────

fn stop_keepawake_inner(inner: &KeepAwakeInner) {
    inner.stop_signal.store(true, Ordering::SeqCst);
    inner.active.store(false, Ordering::SeqCst);
    inner.generation.fetch_add(1, Ordering::SeqCst);
    platform_native::set_keep_awake(false, false);

    if let Ok(mut guard) = inner.helper_child.lock() {
        if let Some(mut child) = guard.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

#[tauri::command]
pub fn desktop_keepawake_start(
    config: KeepAwakeConfig,
    state: State<'_, KeepAwakeState>,
) -> Result<KeepAwakeStatus, String> {
    let inner = Arc::clone(&state.0);
    stop_keepawake_inner(&inner);

    let sanitized = KeepAwakeConfig {
        keep_display: config.keep_display,
        jiggle_mouse: config.jiggle_mouse,
        jiggle_interval_sec: config.jiggle_interval_sec.clamp(10, 600),
        duration_minutes: config.duration_minutes.min(1440),
    };

    let run_gen = inner.generation.fetch_add(1, Ordering::SeqCst) + 1;
    inner.stop_signal.store(false, Ordering::SeqCst);
    inner.jiggle_count.store(0, Ordering::SeqCst);
    inner.started_at_epoch_ms.store(now_epoch_ms(), Ordering::SeqCst);
    inner.active.store(true, Ordering::SeqCst);

    if let Ok(mut cfg) = inner.config.lock() {
        *cfg = sanitized.clone();
    }
    if let Ok(mut err) = inner.last_error.lock() {
        *err = None;
    }

    // Spawn native macOS/Linux inhibitor subprocess if applicable
    #[cfg(target_os = "macos")]
    {
        let args: Vec<&str> = if sanitized.keep_display {
            vec!["-d", "-i"]
        } else {
            vec!["-i"]
        };
        if let Ok(child) = Command::new("caffeinate").args(&args).spawn() {
            if let Ok(mut guard) = inner.helper_child.lock() {
                *guard = Some(child);
            }
        }
    }

    #[cfg(all(unix, not(target_os = "macos")))]
    {
        let what = if sanitized.keep_display {
            "idle:sleep"
        } else {
            "sleep"
        };
        if let Ok(child) = Command::new("systemd-inhibit")
            .args([
                "--what",
                what,
                "--who=OmniDesk",
                "--why=Keep-Awake session active",
                "sleep",
                "86400",
            ])
            .spawn()
        {
            if let Ok(mut guard) = inner.helper_child.lock() {
                *guard = Some(child);
            }
        }
    }

    let worker_inner = Arc::clone(&inner);
    std::thread::spawn(move || {
        // On Windows SetThreadExecutionState is per-thread, so keep it alive on this dedicated worker thread!
        platform_native::set_keep_awake(true, sanitized.keep_display);

        let start = Instant::now();
        let max_duration = if sanitized.duration_minutes > 0 {
            Some(Duration::from_secs(sanitized.duration_minutes * 60))
        } else {
            None
        };
        let mut last_jiggle = Instant::now();
        let jiggle_every = Duration::from_secs(sanitized.jiggle_interval_sec);

        while !worker_inner.stop_signal.load(Ordering::SeqCst)
            && worker_inner.generation.load(Ordering::SeqCst) == run_gen
        {
            if let Some(limit) = max_duration {
                if start.elapsed() >= limit {
                    break;
                }
            }

            if sanitized.jiggle_mouse && last_jiggle.elapsed() >= jiggle_every {
                if let Err(e) = platform_native::jiggle_mouse_1px() {
                    if let Ok(mut err) = worker_inner.last_error.lock() {
                        *err = Some(e);
                    }
                } else {
                    worker_inner.jiggle_count.fetch_add(1, Ordering::SeqCst);
                }
                last_jiggle = Instant::now();
            }

            std::thread::sleep(Duration::from_millis(250));
        }

        platform_native::set_keep_awake(false, false);
        if worker_inner.generation.load(Ordering::SeqCst) == run_gen {
            stop_keepawake_inner(&worker_inner);
        }
    });

    desktop_keepawake_status(state)
}

#[tauri::command]
pub fn desktop_keepawake_stop(state: State<'_, KeepAwakeState>) -> Result<KeepAwakeStatus, String> {
    stop_keepawake_inner(&state.0);
    desktop_keepawake_status(state)
}

#[tauri::command]
pub fn desktop_keepawake_status(
    state: State<'_, KeepAwakeState>,
) -> Result<KeepAwakeStatus, String> {
    let active = state.0.active.load(Ordering::SeqCst);
    let cfg = state
        .0
        .config
        .lock()
        .map(|g| g.clone())
        .unwrap_or(KeepAwakeConfig {
            keep_display: true,
            jiggle_mouse: false,
            jiggle_interval_sec: 45,
            duration_minutes: 0,
        });
    let started = state.0.started_at_epoch_ms.load(Ordering::SeqCst);
    let elapsed_sec = if active && started > 0 {
        now_epoch_ms().saturating_sub(started) / 1000
    } else {
        0
    };
    let remaining_sec = if active && cfg.duration_minutes > 0 {
        Some((cfg.duration_minutes * 60).saturating_sub(elapsed_sec))
    } else {
        None
    };
    let jiggle_count = state.0.jiggle_count.load(Ordering::SeqCst);
    let last_error = state.0.last_error.lock().ok().and_then(|g| g.clone());

    Ok(KeepAwakeStatus {
        active,
        keep_display: cfg.keep_display,
        jiggle_mouse: cfg.jiggle_mouse,
        jiggle_interval_sec: cfg.jiggle_interval_sec,
        duration_minutes: cfg.duration_minutes,
        elapsed_sec,
        remaining_sec,
        jiggle_count,
        last_error,
    })
}

pub fn shutdown_desktop_workers(app: &AppHandle) {
    if let Some(ac) = app.try_state::<AutoClickerState>() {
        ac.0.stop_signal.store(true, Ordering::SeqCst);
        ac.0.running.store(false, Ordering::SeqCst);
    }
    if let Some(ka) = app.try_state::<KeepAwakeState>() {
        stop_keepawake_inner(&ka.0);
    }
    if let Some(ch) = app.try_state::<CrosshairOverlayState>() {
        ch.0.active.store(false, Ordering::SeqCst);
    }
    if let Some(overlay) = app.get_webview_window(CROSSHAIR_WINDOW_LABEL) {
        let _ = overlay.close();
    }
    clear_process_monitor_cache(app);
}

// ─── 4b. Native Always-On-Top Click-Through Crosshair Overlay ────────────────

pub const CROSSHAIR_WINDOW_LABEL: &str = "crosshair-overlay";
const CROSSHAIR_OVERLAY_LOGICAL_SIZE: f64 = 240.0;

#[derive(Clone, Debug, Serialize)]
pub struct DesktopMonitorInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f64,
    pub is_primary: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct CrosshairOverlayStatus {
    pub active: bool,
    pub monitor_index: usize,
    pub hotkey: String,
    pub global_hotkey_supported: bool,
    pub config_json: Option<String>,
}

pub struct CrosshairOverlayInner {
    pub active: AtomicBool,
    pub monitor_index: Mutex<usize>,
    pub offset_x: Mutex<i32>,
    pub offset_y: Mutex<i32>,
    pub hotkey: Mutex<String>,
    pub config_json: Mutex<Option<String>>,
}

impl Default for CrosshairOverlayInner {
    fn default() -> Self {
        Self {
            active: AtomicBool::new(false),
            monitor_index: Mutex::new(0),
            offset_x: Mutex::new(0),
            offset_y: Mutex::new(0),
            hotkey: Mutex::new("F8".to_string()),
            config_json: Mutex::new(None),
        }
    }
}

pub struct CrosshairOverlayState(pub Arc<CrosshairOverlayInner>);

impl Default for CrosshairOverlayState {
    fn default() -> Self {
        Self(Arc::new(CrosshairOverlayInner::default()))
    }
}

fn position_crosshair_window(
    app: &AppHandle,
    win: &tauri::WebviewWindow,
    monitor_index: usize,
    offset_x: i32,
    offset_y: i32,
) {
    let monitors = app.available_monitors().unwrap_or_default();
    let target = monitors
        .get(monitor_index)
        .or_else(|| monitors.first());

    if let Some(mon) = target {
        let scale = mon.scale_factor().max(0.5);
        let mon_pos = mon.position();
        let mon_size = mon.size();
        let phys_overlay = (CROSSHAIR_OVERLAY_LOGICAL_SIZE * scale).round() as i32;
        let dx = (offset_x.clamp(-400, 400) as f64 * scale).round() as i32;
        let dy = (offset_y.clamp(-400, 400) as f64 * scale).round() as i32;
        let x = mon_pos.x + (mon_size.width as i32 - phys_overlay) / 2 + dx;
        let y = mon_pos.y + (mon_size.height as i32 - phys_overlay) / 2 + dy;
        let _ = win.set_position(tauri::PhysicalPosition::new(x, y));
    } else {
        let _ = win.center();
    }
}

fn build_crosshair_status(inner: &CrosshairOverlayInner) -> CrosshairOverlayStatus {
    let active = inner.active.load(Ordering::SeqCst);
    let monitor_index = inner.monitor_index.lock().map(|g| *g).unwrap_or(0);
    let hotkey = inner
        .hotkey
        .lock()
        .map(|g| g.clone())
        .unwrap_or_else(|_| "F8".to_string());
    let config_json = inner.config_json.lock().ok().and_then(|g| g.clone());

    CrosshairOverlayStatus {
        active,
        monitor_index,
        hotkey,
        global_hotkey_supported: platform_native::global_hotkey_supported(),
        config_json,
    }
}

fn show_or_update_crosshair_internal(
    app: &AppHandle,
    inner: &CrosshairOverlayInner,
    config_json: Option<String>,
    monitor_index: Option<usize>,
    offset_x: Option<i32>,
    offset_y: Option<i32>,
) -> Result<CrosshairOverlayStatus, String> {
    if let Some(cfg) = config_json {
        if cfg.len() > 16_384 {
            return Err("Crosshair config payload is too large.".to_string());
        }
        if let Ok(mut guard) = inner.config_json.lock() {
            *guard = Some(cfg);
        }
    }
    if let Some(idx) = monitor_index {
        if let Ok(mut guard) = inner.monitor_index.lock() {
            *guard = idx;
        }
    }
    if let Some(ox) = offset_x {
        if let Ok(mut guard) = inner.offset_x.lock() {
            *guard = ox.clamp(-400, 400);
        }
    }
    if let Some(oy) = offset_y {
        if let Ok(mut guard) = inner.offset_y.lock() {
            *guard = oy.clamp(-400, 400);
        }
    }

    let mon_idx = inner.monitor_index.lock().map(|g| *g).unwrap_or(0);
    let ox = inner.offset_x.lock().map(|g| *g).unwrap_or(0);
    let oy = inner.offset_y.lock().map(|g| *g).unwrap_or(0);
    let current_cfg = inner.config_json.lock().ok().and_then(|g| g.clone());

    let win = if let Some(existing) = app.get_webview_window(CROSSHAIR_WINDOW_LABEL) {
        existing
    } else {
        let created = tauri::WebviewWindowBuilder::new(
            app,
            CROSSHAIR_WINDOW_LABEL,
            tauri::WebviewUrl::App("index.html?window=crosshair-overlay".into()),
        )
        .title("OmniDesk Crosshair Overlay")
        .inner_size(CROSSHAIR_OVERLAY_LOGICAL_SIZE, CROSSHAIR_OVERLAY_LOGICAL_SIZE)
        .decorations(false)
        .transparent(true)
        .always_on_top(true)
        .skip_taskbar(true)
        .shadow(false)
        .resizable(false)
        .focusable(false)
        .visible(false)
        .build()
        .map_err(|e| format!("Failed to create crosshair overlay window: {}", e))?;
        let _ = created.set_ignore_cursor_events(true);
        created
    };

    position_crosshair_window(app, &win, mon_idx, ox, oy);
    let _ = win.set_always_on_top(true);
    let _ = win.set_ignore_cursor_events(true);
    let _ = win.show();

    if let Some(cfg) = current_cfg {
        use tauri::Emitter;
        let _ = app.emit_to(CROSSHAIR_WINDOW_LABEL, "omnidesk:crosshair-config", cfg);
    }

    inner.active.store(true, Ordering::SeqCst);
    let status = build_crosshair_status(inner);
    {
        use tauri::Emitter;
        let _ = app.emit_to("main", "omnidesk:crosshair-status", status.clone());
    }
    Ok(status)
}

fn hide_crosshair_internal(app: &AppHandle, inner: &CrosshairOverlayInner) -> CrosshairOverlayStatus {
    if let Some(win) = app.get_webview_window(CROSSHAIR_WINDOW_LABEL) {
        let _ = win.hide();
        let _ = win.close();
    }
    inner.active.store(false, Ordering::SeqCst);
    let status = build_crosshair_status(inner);
    {
        use tauri::Emitter;
        let _ = app.emit_to("main", "omnidesk:crosshair-status", status.clone());
    }
    status
}

pub fn spawn_crosshair_hotkey_watcher(app: AppHandle, inner: Arc<CrosshairOverlayInner>) {
    if !platform_native::global_hotkey_supported() {
        return;
    }
    std::thread::spawn(move || {
        let mut was_down = false;
        loop {
            let is_down = inner
                .hotkey
                .lock()
                .map(|g| platform_native::is_hotkey_pressed(g.as_str()))
                .unwrap_or(false);
            if is_down && !was_down {
                if inner.active.load(Ordering::SeqCst) {
                    let _ = hide_crosshair_internal(&app, &inner);
                } else {
                    let _ = show_or_update_crosshair_internal(&app, &inner, None, None, None, None);
                }
            }
            was_down = is_down;
            std::thread::sleep(Duration::from_millis(45));
        }
    });
}

#[tauri::command]
pub fn desktop_crosshair_list_monitors(app: AppHandle) -> Result<Vec<DesktopMonitorInfo>, String> {
    let primary_pos = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| (*m.position(), *m.size()));
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let mut out = Vec::with_capacity(monitors.len());
    for (idx, mon) in monitors.iter().enumerate() {
        let pos = mon.position();
        let size = mon.size();
        let is_primary = primary_pos
            .map(|(pp, ps)| pp.x == pos.x && pp.y == pos.y && ps.width == size.width && ps.height == size.height)
            .unwrap_or(idx == 0);
        let raw_name = mon.name().cloned().unwrap_or_default();
        let name = if raw_name.trim().is_empty() {
            format!("Display {}", idx + 1)
        } else {
            raw_name
        };
        out.push(DesktopMonitorInfo {
            index: idx,
            name,
            width: size.width,
            height: size.height,
            x: pos.x,
            y: pos.y,
            scale_factor: mon.scale_factor(),
            is_primary,
        });
    }
    Ok(out)
}

#[tauri::command]
pub fn desktop_crosshair_open(
    app: AppHandle,
    config_json: String,
    monitor_index: Option<usize>,
    offset_x: Option<i32>,
    offset_y: Option<i32>,
    state: State<'_, CrosshairOverlayState>,
) -> Result<CrosshairOverlayStatus, String> {
    show_or_update_crosshair_internal(
        &app,
        &state.0,
        Some(config_json),
        monitor_index,
        offset_x,
        offset_y,
    )
}

#[tauri::command]
pub fn desktop_crosshair_update(
    app: AppHandle,
    config_json: String,
    monitor_index: Option<usize>,
    offset_x: Option<i32>,
    offset_y: Option<i32>,
    state: State<'_, CrosshairOverlayState>,
) -> Result<CrosshairOverlayStatus, String> {
    if config_json.len() > 16_384 {
        return Err("Crosshair config payload is too large.".to_string());
    }
    if let Ok(mut guard) = state.0.config_json.lock() {
        *guard = Some(config_json.clone());
    }
    if let Some(idx) = monitor_index {
        if let Ok(mut guard) = state.0.monitor_index.lock() {
            *guard = idx;
        }
    }
    if let Some(ox) = offset_x {
        if let Ok(mut guard) = state.0.offset_x.lock() {
            *guard = ox.clamp(-400, 400);
        }
    }
    if let Some(oy) = offset_y {
        if let Ok(mut guard) = state.0.offset_y.lock() {
            *guard = oy.clamp(-400, 400);
        }
    }

    if state.0.active.load(Ordering::SeqCst) {
        if let Some(win) = app.get_webview_window(CROSSHAIR_WINDOW_LABEL) {
            let mon_idx = state.0.monitor_index.lock().map(|g| *g).unwrap_or(0);
            let ox = state.0.offset_x.lock().map(|g| *g).unwrap_or(0);
            let oy = state.0.offset_y.lock().map(|g| *g).unwrap_or(0);
            position_crosshair_window(&app, &win, mon_idx, ox, oy);
            let _ = win.set_always_on_top(true);
            let _ = win.set_ignore_cursor_events(true);
            use tauri::Emitter;
            let _ = app.emit_to(CROSSHAIR_WINDOW_LABEL, "omnidesk:crosshair-config", config_json);
        }
    }

    Ok(build_crosshair_status(&state.0))
}

#[tauri::command]
pub fn desktop_crosshair_hide(
    app: AppHandle,
    state: State<'_, CrosshairOverlayState>,
) -> Result<CrosshairOverlayStatus, String> {
    Ok(hide_crosshair_internal(&app, &state.0))
}

#[tauri::command]
pub fn desktop_crosshair_status(
    state: State<'_, CrosshairOverlayState>,
) -> Result<CrosshairOverlayStatus, String> {
    Ok(build_crosshair_status(&state.0))
}

#[tauri::command]
pub fn desktop_crosshair_set_hotkey(
    hotkey: String,
    state: State<'_, CrosshairOverlayState>,
) -> Result<String, String> {
    let upper = hotkey.trim().to_uppercase();
    let valid = matches!(
        upper.as_str(),
        "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8" | "F9" | "F10" | "F11" | "F12"
    );
    if !valid {
        return Err("Crosshair hotkey must be between F1 and F12.".to_string());
    }
    if let Ok(mut guard) = state.0.hotkey.lock() {
        *guard = upper.clone();
    }
    Ok(upper)
}

// ─── 5. Native PC Hardware Specs & Disk Inventory ────────────────────────────

#[derive(Clone, Debug, Serialize)]
pub struct DiskDriveInfo {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub kind: String,
    pub used_gb: f64,
    pub total_gb: f64,
    pub available_gb: f64,
    pub is_removable: bool,
}

#[derive(Clone, Debug, Serialize)]
pub struct GpuInfo {
    pub name: String,
    pub vendor: String,
    pub vram_mb: Option<u64>,
    pub driver_version: Option<String>,
}

#[derive(Clone, Debug, Serialize)]
pub struct HardwareSpecs {
    pub cpu_brand: String,
    pub cpu_vendor: String,
    pub cpu_arch: String,
    pub physical_cores: usize,
    pub logical_cores: usize,
    pub base_freq_mhz: u64,
    pub ram_total_gb: f64,
    pub ram_summary: Option<String>,
    pub swap_total_gb: f64,
    pub gpus: Vec<GpuInfo>,
    pub display_resolution: Option<String>,
    pub motherboard: Option<String>,
    pub system_model: Option<String>,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub hostname: String,
    pub disks: Vec<DiskDriveInfo>,
}

#[derive(Default)]
struct PlatformHardwareDetails {
    gpus: Vec<GpuInfo>,
    display_resolution: Option<String>,
    ram_summary: Option<String>,
    motherboard: Option<String>,
    system_model: Option<String>,
}

pub fn collect_disk_drives() -> Vec<DiskDriveInfo> {
    let bytes_per_gib = 1024.0 * 1024.0 * 1024.0;
    let disks = Disks::new_with_refreshed_list();
    let mut seen_mounts: Vec<String> = Vec::new();
    let mut results: Vec<DiskDriveInfo> = Vec::new();

    for disk in disks.list() {
        let total_bytes = disk.total_space();
        if total_bytes == 0 {
            continue;
        }
        let mount = disk.mount_point().to_string_lossy().to_string();
        if seen_mounts.iter().any(|m| m == &mount) {
            continue;
        }
        seen_mounts.push(mount.clone());

        let avail_bytes = disk.available_space();
        let used_bytes = total_bytes.saturating_sub(avail_bytes);
        let kind_str = match disk.kind() {
            DiskKind::SSD => "SSD",
            DiskKind::HDD => "HDD",
            DiskKind::Unknown(_) => "Disk",
        };
        let raw_name = disk.name().to_string_lossy().trim().to_string();
        let name = if raw_name.is_empty() {
            mount.clone()
        } else {
            raw_name
        };

        results.push(DiskDriveInfo {
            name,
            mount_point: mount,
            file_system: disk.file_system().to_string_lossy().to_string(),
            kind: kind_str.to_string(),
            used_gb: (used_bytes as f64 / bytes_per_gib * 100.0).round() / 100.0,
            total_gb: (total_bytes as f64 / bytes_per_gib * 100.0).round() / 100.0,
            available_gb: (avail_bytes as f64 / bytes_per_gib * 100.0).round() / 100.0,
            is_removable: disk.is_removable(),
        });
    }

    results
}

fn clean_opt_string(input: Option<&str>) -> Option<String> {
    let trimmed = input?.trim();
    if trimmed.is_empty() {
        return None;
    }
    let lower = trimmed.to_lowercase();
    if lower == "to be filled by o.e.m."
        || lower == "default string"
        || lower == "system product name"
        || lower == "system manufacturer"
        || lower == "not specified"
        || lower == "unknown"
        || lower == "none"
    {
        return None;
    }
    Some(trimmed.to_string())
}

fn infer_gpu_vendor(name: &str, raw_vendor: &str) -> String {
    let combined = format!("{} {}", raw_vendor, name).to_lowercase();
    if combined.contains("nvidia") || combined.contains("geforce") || combined.contains("quadro") || combined.contains("rtx") || combined.contains("gtx") {
        "NVIDIA".to_string()
    } else if combined.contains("amd") || combined.contains("radeon") || combined.contains("advanced micro devices") {
        "AMD".to_string()
    } else if combined.contains("intel") || combined.contains("arc") || combined.contains("iris") || combined.contains("uhd") {
        "Intel".to_string()
    } else if combined.contains("apple") {
        "Apple".to_string()
    } else if !raw_vendor.trim().is_empty() {
        raw_vendor.trim().to_string()
    } else {
        "GPU".to_string()
    }
}

#[cfg(any(target_os = "windows", all(unix, not(target_os = "macos"))))]
fn query_nvidia_smi_gpus() -> Vec<GpuInfo> {
    let Ok(output) = new_hidden_command("nvidia-smi")
        .args([
            "--query-gpu=name,memory.total,driver_version",
            "--format=csv,noheader,nounits",
        ])
        .output()
    else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut gpus = Vec::new();
    for line in stdout.lines() {
        let parts: Vec<&str> = line.split(',').map(|s| s.trim()).collect();
        if parts.is_empty() || parts[0].is_empty() {
            continue;
        }
        let name = parts[0].to_string();
        let vram_mb = parts.get(1).and_then(|s| s.parse::<u64>().ok());
        let driver_version = parts
            .get(2)
            .map(|s| s.to_string())
            .filter(|s| !s.is_empty());
        gpus.push(GpuInfo {
            name,
            vendor: "NVIDIA".to_string(),
            vram_mb,
            driver_version,
        });
    }
    gpus
}

#[cfg(target_os = "windows")]
fn query_platform_hardware_details() -> PlatformHardwareDetails {
    let mut details = PlatformHardwareDetails::default();

    let ps_script = r#"
$regVram = @{}
try {
  Get-ItemProperty -Path 'HKLM:\SYSTEM\ControlSet001\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}\0*' -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.DriverDesc -and $_.'HardwareInformation.qwMemorySize') {
      $val = $_.'HardwareInformation.qwMemorySize'
      if ($val -is [byte[]]) {
        if ($val.Length -ge 8) { $bytes = [BitConverter]::ToUInt64($val, 0) }
        elseif ($val.Length -ge 4) { $bytes = [BitConverter]::ToUInt32($val, 0) }
        else { $bytes = 0 }
      } else {
        $bytes = [uint64]$val
      }
      if ($bytes -gt 0) { $regVram[$_.DriverDesc.Trim()] = [math]::Round($bytes / 1048576) }
    }
  }
} catch {}

$gpus = @()
$displayRes = $null
try {
  Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | ForEach-Object {
    $name = if ($_.Name) { $_.Name.Trim() } else { '' }
    if ($name) {
      $vramMb = $null
      if ($regVram.ContainsKey($name)) {
        $vramMb = [uint64]$regVram[$name]
      } elseif ($_.AdapterRAM -and $_.AdapterRAM -gt 0) {
        $vramMb = [uint64][math]::Round([double]$_.AdapterRAM / 1048576)
      }
      $gpus += [pscustomobject]@{
        name = $name
        vendor = if ($_.AdapterCompatibility) { $_.AdapterCompatibility.Trim() } else { '' }
        vram_mb = $vramMb
        driver_version = if ($_.DriverVersion) { $_.DriverVersion.Trim() } else { $null }
      }
      if (-not $displayRes -and $_.CurrentHorizontalResolution -and $_.CurrentVerticalResolution) {
        $hz = if ($_.CurrentRefreshRate) { " @ $($_.CurrentRefreshRate) Hz" } else { '' }
        $displayRes = "$($_.CurrentHorizontalResolution)x$($_.CurrentVerticalResolution)$hz"
      }
    }
  }
} catch {}

$ramSummary = $null
try {
  $sticks = @(Get-CimInstance Win32_PhysicalMemory -ErrorAction SilentlyContinue)
  if ($sticks.Count -gt 0) {
    $memTypes = @{ 20='DDR'; 21='DDR2'; 24='DDR3'; 26='DDR4'; 30='LPDDR4'; 34='DDR5'; 35='LPDDR5' }
    $first = $sticks[0]
    $typeCode = [int]$first.SMBIOSMemoryType
    $memType = if ($memTypes.ContainsKey($typeCode)) { $memTypes[$typeCode] } else { '' }
    $speed = if ($first.ConfiguredClockSpeed) { $first.ConfiguredClockSpeed } elseif ($first.Speed) { $first.Speed } else { $null }
    $capGb = [math]::Round(($first.Capacity / 1073741824), 0)
    $allSame = ($sticks | Select-Object -ExpandProperty Capacity -Unique).Count -eq 1
    $prefix = if ($allSame) { "$($sticks.Count)x ${capGb} GB" } else { "$($sticks.Count) modules" }
    $parts = @($prefix)
    if ($memType) { $parts += $memType }
    if ($speed) { $parts += "@ $speed MHz" }
    $ramSummary = ($parts -join ' ').Trim()
  }
} catch {}

$board = $null
try {
  $bb = Get-CimInstance Win32_BaseBoard -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($bb) {
    $board = ("$($bb.Manufacturer) $($bb.Product)").Trim()
  }
} catch {}

$model = $null
try {
  $cs = Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($cs) {
    $model = ("$($cs.Manufacturer) $($cs.Model)").Trim()
  }
} catch {}

[pscustomobject]@{
  gpus = $gpus
  display_resolution = $displayRes
  ram_summary = $ramSummary
  motherboard = $board
  system_model = $model
} | ConvertTo-Json -Compress -Depth 4
"#;

    if let Ok(output) = new_hidden_command("powershell")
        .args(["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps_script])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(stdout.trim()) {
                if let Some(gpu_list) = val.get("gpus") {
                    let items: Vec<&serde_json::Value> = if let Some(arr) = gpu_list.as_array() {
                        arr.iter().collect()
                    } else if gpu_list.is_object() {
                        vec![gpu_list]
                    } else {
                        Vec::new()
                    };
                    for item in items {
                        if let Some(name) = item.get("name").and_then(|v| v.as_str()) {
                            let raw_vendor = item.get("vendor").and_then(|v| v.as_str()).unwrap_or("");
                            let vram_mb = item.get("vram_mb").and_then(|v| v.as_u64()).filter(|&m| m > 0);
                            let driver_version = item
                                .get("driver_version")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                                .filter(|s| !s.is_empty());
                            details.gpus.push(GpuInfo {
                                name: name.to_string(),
                                vendor: infer_gpu_vendor(name, raw_vendor),
                                vram_mb,
                                driver_version,
                            });
                        }
                    }
                }
                details.display_resolution = clean_opt_string(
                    val.get("display_resolution").and_then(|v| v.as_str()),
                );
                details.ram_summary = clean_opt_string(
                    val.get("ram_summary").and_then(|v| v.as_str()),
                );
                details.motherboard = clean_opt_string(
                    val.get("motherboard").and_then(|v| v.as_str()),
                );
                details.system_model = clean_opt_string(
                    val.get("system_model").and_then(|v| v.as_str()),
                );
            }
        }
    }

    // Refine NVIDIA VRAM / driver via nvidia-smi if present (handles >4GB VRAM reliably even if registry key is absent)
    let nv_gpus = query_nvidia_smi_gpus();
    for nv in nv_gpus {
        if let Some(existing) = details
            .gpus
            .iter_mut()
            .find(|g| g.vendor == "NVIDIA" && (g.name.eq_ignore_ascii_case(&nv.name) || g.name.to_lowercase().contains(&nv.name.to_lowercase())))
        {
            if nv.vram_mb.is_some() {
                existing.vram_mb = nv.vram_mb;
            }
            if nv.driver_version.is_some() {
                existing.driver_version = nv.driver_version;
            }
        } else if !details.gpus.iter().any(|g| g.name.eq_ignore_ascii_case(&nv.name)) {
            details.gpus.push(nv);
        }
    }

    details
}

#[cfg(target_os = "macos")]
fn query_platform_hardware_details() -> PlatformHardwareDetails {
    let mut details = PlatformHardwareDetails::default();

    if let Ok(output) = new_hidden_command("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(arr) = val.get("SPDisplaysDataType").and_then(|v| v.as_array()) {
                    for item in arr {
                        let name = item
                            .get("sppci_model")
                            .or_else(|| item.get("_name"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("Apple GPU")
                            .trim()
                            .to_string();
                        let raw_vendor = item
                            .get("spdisplays_vendor")
                            .or_else(|| item.get("sppci_vendor"))
                            .and_then(|v| v.as_str())
                            .unwrap_or("");
                        let vram_str = item
                            .get("spdisplays_vram")
                            .or_else(|| item.get("spdisplays_vram_shared"))
                            .and_then(|v| v.as_str());
                        let vram_mb = vram_str.and_then(|s| {
                            let parts: Vec<&str> = s.split_whitespace().collect();
                            let num = parts.first()?.parse::<f64>().ok()?;
                            let unit = parts.get(1).copied().unwrap_or("MB").to_uppercase();
                            if unit.starts_with("GB") {
                                Some((num * 1024.0).round() as u64)
                            } else {
                                Some(num.round() as u64)
                            }
                        });
                        let cores_note = item
                            .get("sppci_cores")
                            .and_then(|v| v.as_str())
                            .map(|c| format!("{} GPU cores", c));
                        details.gpus.push(GpuInfo {
                            vendor: infer_gpu_vendor(&name, raw_vendor),
                            name,
                            vram_mb,
                            driver_version: cores_note,
                        });

                        if details.display_resolution.is_none() {
                            if let Some(ndrvs) = item.get("spdisplays_ndrvs").and_then(|v| v.as_array()) {
                                if let Some(first_disp) = ndrvs.first() {
                                    details.display_resolution = first_disp
                                        .get("_spdisplays_resolution")
                                        .or_else(|| first_disp.get("_spdisplays_pixels"))
                                        .and_then(|v| v.as_str())
                                        .map(|s| s.trim().to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if let Ok(output) = new_hidden_command("sysctl").args(["-n", "hw.model"]).output() {
        if output.status.success() {
            details.system_model = clean_opt_string(Some(&String::from_utf8_lossy(&output.stdout)));
        }
    }

    if let Ok(output) = new_hidden_command("system_profiler")
        .args(["SPMemoryDataType", "-json"])
        .output()
    {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&stdout) {
                if let Some(arr) = val.get("SPMemoryDataType").and_then(|v| v.as_array()) {
                    if let Some(first) = arr.first() {
                        if let Some(mem_type) = first.get("dimm_type").and_then(|v| v.as_str()) {
                            let mfr = first
                                .get("dimm_manufacturer")
                                .and_then(|v| v.as_str())
                                .unwrap_or("");
                            let summary = format!("{} {}", mfr, mem_type).trim().to_string();
                            if !summary.is_empty() {
                                details.ram_summary = Some(summary);
                            }
                        }
                    }
                }
            }
        }
    }

    details
}

#[cfg(all(unix, not(target_os = "macos")))]
fn query_platform_hardware_details() -> PlatformHardwareDetails {
    let mut details = PlatformHardwareDetails::default();

    let nv_gpus = query_nvidia_smi_gpus();
    details.gpus.extend(nv_gpus);

    if let Ok(output) = new_hidden_command("lspci").output() {
        if output.status.success() {
            let stdout = String::from_utf8_lossy(&output.stdout);
            for line in stdout.lines() {
                if line.contains("VGA compatible controller:")
                    || line.contains("3D controller:")
                    || line.contains("Display controller:")
                {
                    if let Some((_, desc)) = line.split_once("controller:") {
                        let name = desc.trim().to_string();
                        if !name.is_empty() {
                            let vendor = infer_gpu_vendor(&name, "");
                            let already_nv = vendor == "NVIDIA"
                                && details.gpus.iter().any(|g| g.vendor == "NVIDIA");
                            if !already_nv {
                                details.gpus.push(GpuInfo {
                                    name,
                                    vendor,
                                    vram_mb: None,
                                    driver_version: None,
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    let read_dmi = |file: &str| -> Option<String> {
        let path = format!("/sys/devices/virtual/dmi/id/{}", file);
        let raw = std::fs::read_to_string(path).ok()?;
        clean_opt_string(Some(&raw))
    };

    let board_vendor = read_dmi("board_vendor");
    let board_name = read_dmi("board_name");
    details.motherboard = match (board_vendor, board_name) {
        (Some(v), Some(n)) => Some(format!("{} {}", v, n)),
        (None, Some(n)) => Some(n),
        (Some(v), None) => Some(v),
        (None, None) => None,
    };

    let sys_vendor = read_dmi("sys_vendor");
    let prod_name = read_dmi("product_name");
    details.system_model = match (sys_vendor, prod_name) {
        (Some(v), Some(n)) => Some(format!("{} {}", v, n)),
        (None, Some(n)) => Some(n),
        (Some(v), None) => Some(v),
        (None, None) => None,
    };

    details
}

fn collect_hardware_specs_blocking() -> HardwareSpecs {
    let sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );

    let first_cpu = sys.cpus().first();
    let cpu_brand = first_cpu
        .map(|c| c.brand().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Unknown CPU".to_string());
    let cpu_vendor = first_cpu
        .map(|c| c.vendor_id().trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "Unknown".to_string());
    let base_freq_mhz = first_cpu.map(|c| c.frequency()).unwrap_or(0);
    let logical_cores = sys.cpus().len();
    let physical_cores = sys.physical_core_count().unwrap_or(logical_cores);

    let bytes_per_gib = 1024.0 * 1024.0 * 1024.0;
    let ram_total_gb = (sys.total_memory() as f64 / bytes_per_gib * 100.0).round() / 100.0;
    let swap_total_gb = (sys.total_swap() as f64 / bytes_per_gib * 100.0).round() / 100.0;

    let os_name = System::long_os_version()
        .or_else(System::name)
        .unwrap_or_else(|| std::env::consts::OS.to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());
    let kernel_version = System::kernel_version().unwrap_or_else(|| "Unknown".to_string());
    let hostname = System::host_name().unwrap_or_else(|| "localhost".to_string());

    let platform_details = query_platform_hardware_details();
    let disks = collect_disk_drives();

    HardwareSpecs {
        cpu_brand,
        cpu_vendor,
        cpu_arch: std::env::consts::ARCH.to_string(),
        physical_cores,
        logical_cores,
        base_freq_mhz,
        ram_total_gb,
        ram_summary: platform_details.ram_summary,
        swap_total_gb,
        gpus: platform_details.gpus,
        display_resolution: platform_details.display_resolution,
        motherboard: platform_details.motherboard,
        system_model: platform_details.system_model,
        os_name,
        os_version,
        kernel_version,
        hostname,
        disks,
    }
}

#[tauri::command]
pub async fn desktop_get_hardware_specs() -> Result<HardwareSpecs, String> {
    tauri::async_runtime::spawn_blocking(collect_hardware_specs_blocking)
        .await
        .map_err(|e| e.to_string())
}
