use std::time::Duration;

use chrono::Utc;
use tauri::{AppHandle, Emitter};

#[derive(serde::Serialize, Clone)]
struct FocusLossPayload {
    timestamp: String,
    window_title: String,
}

pub fn start_focus_monitor(app_handle: AppHandle, interval_ms: u64) {
    std::thread::spawn(move || loop {
        let title = get_focused_window_title();
        let is_our_app = title
            .to_lowercase()
            .contains("secureassess");

        if !is_our_app {
            let payload = FocusLossPayload {
                timestamp: Utc::now().to_rfc3339(),
                window_title: title,
            };
            let _ = app_handle.emit("security:focus-loss", payload);
        }

        std::thread::sleep(Duration::from_millis(interval_ms));
    });
}

#[cfg(target_os = "macos")]
fn get_focused_window_title() -> String {
    // Use AppleScript to get the frontmost application name
    let output = std::process::Command::new("osascript")
        .args(["-e", "tell application \"System Events\" to get name of first application process whose frontmost is true"])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            String::from_utf8_lossy(&o.stdout).trim().to_string()
        }
        _ => String::new(),
    }
}

#[cfg(target_os = "windows")]
fn get_focused_window_title() -> String {
    use windows_sys::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowTextW};
    unsafe {
        let hwnd = GetForegroundWindow();
        if hwnd == 0 {
            return String::new();
        }
        let mut buf = [0u16; 256];
        let len = GetWindowTextW(hwnd, buf.as_mut_ptr(), buf.len() as i32);
        if len <= 0 {
            return String::new();
        }
        String::from_utf16_lossy(&buf[..len as usize])
    }
}

#[cfg(not(any(target_os = "macos", target_os = "windows")))]
fn get_focused_window_title() -> String {
    "SecureAssess".to_string()
}
