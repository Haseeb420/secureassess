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

#[cfg(not(target_os = "macos"))]
fn get_focused_window_title() -> String {
    // TODO: implement via GetForegroundWindow on Windows
    "SecureAssess".to_string()
}
