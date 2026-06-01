use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub fn start_fullscreen_watchdog<R: Runtime>(
    app_handle: AppHandle<R>,
    assessment_active: Arc<AtomicBool>,
) {
    std::thread::spawn(move || loop {
        std::thread::sleep(Duration::from_millis(500));

        if !assessment_active.load(Ordering::Relaxed) {
            continue;
        }

        if let Some(window) = app_handle.get_webview_window("main") {
            let is_fullscreen = window.is_fullscreen().unwrap_or(false);
            if !is_fullscreen {
                tracing::warn!("Fullscreen exited during assessment — restoring");
                let _ = window.set_fullscreen(true);
                let _ = window.set_always_on_top(true);
                let _ = app_handle.emit("security:fullscreen-restored", ());
            }
        }
    });
}
