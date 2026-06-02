use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Manager, State, WebviewWindow};

// NSApplicationPresentationOptions bit flags (macOS SDK)
// HideDock(2) + HideMenuBar(8) must be paired — Apple enforces this.
// DisableAppleMenu(16) requires HideMenuBar.
// DisableProcessSwitching(32) blocks Cmd+Tab and Mission Control.
// DisableForceQuit(64) blocks Cmd+Option+Esc.
// DisableSessionTermination(128) blocks system log-out/restart.
//
// NOTE: We intentionally do NOT use NSWindowStyleMask.fullScreen / set_fullscreen().
// Native macOS fullscreen creates a separate Space where DisableProcessSwitching
// is ineffective and Escape triggers the fullscreen-exit animation. Instead we
// set the window frame to cover the screen directly, keeping the window in the
// main Space where all presentation options are enforced.
#[cfg(target_os = "macos")]
const KIOSK_PRESENTATION_OPTIONS: u64 = 2 | 8 | 16 | 32 | 64 | 128;

// NSStatusWindowLevel = 25 — above the menu bar and dock, below system alerts.
#[cfg(target_os = "macos")]
pub(crate) const KIOSK_WINDOW_LEVEL: i64 = 25;

#[cfg(target_os = "macos")]
#[repr(C)]
struct NSPoint {
    x: f64,
    y: f64,
}

#[cfg(target_os = "macos")]
#[repr(C)]
struct NSSize {
    width: f64,
    height: f64,
}

#[cfg(target_os = "macos")]
#[repr(C)]
struct NSRect {
    origin: NSPoint,
    size: NSSize,
}

pub struct AssessmentActiveFlag(pub Arc<AtomicBool>);

#[cfg(target_os = "macos")]
fn set_presentation_options(options: u64) {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};
    unsafe {
        let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
        let _: () = msg_send![app, setPresentationOptions: options];
    }
}

/// Cover the main screen with `ns_window` using a direct frame set (no native
/// fullscreen). Must be called on the main thread.
///
/// Using frame-based cover instead of `toggleFullScreen` keeps the window in
/// the primary Space, making `DisableProcessSwitching` effective and removing
/// the Escape-key exit path that native fullscreen exposes.
#[cfg(target_os = "macos")]
pub(crate) unsafe fn apply_kiosk_frame(ns_window: *mut objc::runtime::Object) {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};

    let screen: *mut Object = msg_send![class!(NSScreen), mainScreen];
    let frame: NSRect = msg_send![screen, frame];

    // Cover the full screen with no animation
    let _: () = msg_send![ns_window, setFrame: frame display: 1i8 animate: 0i8];

    // Raise above dock/menubar (NSStatusWindowLevel)
    let _: () = msg_send![ns_window, setLevel: KIOSK_WINDOW_LEVEL];

    // NSWindowCollectionBehaviorStationary(16): stays in place during Spaces transitions
    // NSWindowCollectionBehaviorIgnoresCycle(64): excluded from Cmd+Tab app cycle
    let _: () = msg_send![ns_window, setCollectionBehavior: 80u64]; // 16 | 64

    // Ensure window is front and has keyboard focus
    let _: () = msg_send![ns_window, makeKeyAndOrderFront: std::ptr::null::<Object>()];

    // Activate our app so no other app has keyboard focus
    let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
    let _: () = msg_send![app, activateIgnoringOtherApps: 1i8];
}

#[tauri::command]
pub fn enter_kiosk_mode(
    window: WebviewWindow,
    flag: State<AssessmentActiveFlag>,
) -> Result<(), String> {
    // Disable all window chrome and interaction modes
    window.set_decorations(false).map_err(|e| e.to_string())?;
    window.set_resizable(false).map_err(|e| e.to_string())?;
    window.set_minimizable(false).map_err(|e| e.to_string())?;
    window.set_maximizable(false).map_err(|e| e.to_string())?;
    window.set_closable(false).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        // Apply presentation options first — this hides the dock and menu bar,
        // expanding the usable screen area before we measure the frame.
        set_presentation_options(KIOSK_PRESENTATION_OPTIONS);

        // Allow the dock/menubar hide animation to complete before covering the screen.
        std::thread::sleep(std::time::Duration::from_millis(150));

        let ns_win_ptr = window.ns_window().map_err(|e| e.to_string())? as usize;
        window
            .app_handle()
            .run_on_main_thread(move || unsafe {
                apply_kiosk_frame(ns_win_ptr as *mut objc::runtime::Object);
            })
            .map_err(|e| e.to_string())?;
    }

    flag.0.store(true, Ordering::Relaxed);
    tracing::info!("Kiosk mode activated");
    Ok(())
}

#[tauri::command]
pub fn exit_kiosk_mode(
    window: WebviewWindow,
    flag: State<AssessmentActiveFlag>,
) -> Result<(), String> {
    flag.0.store(false, Ordering::Relaxed);

    #[cfg(target_os = "macos")]
    {
        // Restore default system presentation (shows dock/menubar again)
        set_presentation_options(0);

        let ns_win_ptr = window.ns_window().map_err(|e| e.to_string())? as usize;
        window
            .app_handle()
            .run_on_main_thread(move || {
                use objc::runtime::Object;
                use objc::{msg_send, sel, sel_impl};
                let ns_window = ns_win_ptr as *mut Object;
                unsafe {
                    let _: () = msg_send![ns_window, setLevel: 0i64];
                    let _: () = msg_send![ns_window, setCollectionBehavior: 0u64];
                }
            })
            .map_err(|e| e.to_string())?;
    }

    window.set_closable(true).map_err(|e| e.to_string())?;
    window.set_maximizable(true).map_err(|e| e.to_string())?;
    window.set_minimizable(true).map_err(|e| e.to_string())?;
    window.set_resizable(true).map_err(|e| e.to_string())?;
    window.set_decorations(true).map_err(|e| e.to_string())?;

    // Restore to a normal windowed size and center on screen
    window
        .set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: 1280.0,
            height: 800.0,
        }))
        .map_err(|e| e.to_string())?;
    window.center().map_err(|e| e.to_string())?;

    tracing::info!("Kiosk mode deactivated");
    Ok(())
}
