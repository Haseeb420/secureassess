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

        let window = match app_handle.get_webview_window("main") {
            Some(w) => w,
            None => continue,
        };

        // Re-assert kiosk constraints on macOS.
        // We use frame-based kiosk (not native fullscreen), so we check the
        // window level instead of is_fullscreen(). If the level or presentation
        // options have been reset by a system event, restore them immediately.
        #[cfg(target_os = "macos")]
        {
            use crate::security::kiosk::{apply_kiosk_frame, KIOSK_WINDOW_LEVEL};
            use objc::runtime::Object;
            use objc::{class, msg_send, sel, sel_impl};

            if let Ok(ns_win) = window.ns_window() {
                let ns_win_ptr = ns_win as usize;

                let current_level: i64 = unsafe {
                    msg_send![ns_win as *mut Object, level]
                };

                if current_level < KIOSK_WINDOW_LEVEL {
                    tracing::warn!("Kiosk window level changed during assessment — restoring");
                    let _ = app_handle.run_on_main_thread(move || unsafe {
                        apply_kiosk_frame(ns_win_ptr as *mut Object);
                    });
                    let _ = app_handle.emit("security:fullscreen-restored", ());
                }

                // Re-assert presentation options each tick. Another app opening
                // a window at a higher level can reset these; catching it here
                // keeps Cmd+Tab and the dock suppressed throughout the session.
                const KIOSK_OPTS: u64 = 2 | 8 | 16 | 32 | 64 | 128;
                unsafe {
                    let app_obj: *mut Object =
                        msg_send![class!(NSApplication), sharedApplication];
                    let current_opts: u64 = msg_send![app_obj, presentationOptions];
                    if current_opts != KIOSK_OPTS {
                        tracing::warn!("Presentation options changed during assessment — restoring");
                        let _: () = msg_send![app_obj, setPresentationOptions: KIOSK_OPTS];
                    }
                }
            }
        }

        // Windows: re-assert topmost + fullscreen every tick.
        // A UAC prompt or elevated window can steal the topmost position;
        // reasserting it here keeps coverage continuous.
        #[cfg(target_os = "windows")]
        {
            use crate::security::kiosk::apply_kiosk_frame_windows;
            use windows_sys::Win32::UI::WindowsAndMessaging::{
                GetWindowLongW, GWL_EXSTYLE, WS_EX_TOPMOST,
            };

            if let Ok(hwnd) = window.hwnd() {
                let hwnd_val = hwnd.0 as isize;
                let ex_style = unsafe { GetWindowLongW(hwnd_val, GWL_EXSTYLE) };
                if ex_style as u32 & WS_EX_TOPMOST == 0 {
                    tracing::warn!("Window lost topmost during assessment — restoring");
                    unsafe { apply_kiosk_frame_windows(hwnd_val) };
                    let _ = app_handle.emit("security:fullscreen-restored", ());
                }
            }
        }

        // Linux: re-assert fullscreen + always-on-top each tick.
        // GTK compositors (X11 and Wayland) can lose both when a system dialog
        // or notification temporarily takes focus.
        #[cfg(target_os = "linux")]
        {
            if !window.is_fullscreen().unwrap_or(true) {
                tracing::warn!("Window exited fullscreen during assessment — restoring");
                let _ = window.set_fullscreen(true);
                let _ = window.set_always_on_top(true);
                let _ = app_handle.emit("security:fullscreen-restored", ());
            }
        }

        // Belt-and-suspenders: unminimize if the window ended up minimized.
        // set_minimizable(false) should prevent this but we guard anyway.
        if window.is_minimized().unwrap_or(false) {
            tracing::warn!("Window minimized during assessment — restoring");
            let _ = window.unminimize();
            let _ = app_handle.emit("security:fullscreen-restored", ());
        }
    });
}
