use tauri::WebviewWindow;

// NSApplicationPresentationOptions bit flags (macOS SDK)
// https://developer.apple.com/documentation/appkit/nsapplicationpresentationoptions
//
// HideDock (2) + HideMenuBar (8) must be paired — Apple enforces this.
// DisableAppleMenu (16) requires HideMenuBar.
// DisableProcessSwitching (32) blocks Cmd+Tab and Mission Control switching.
// DisableForceQuit (64) blocks Cmd+Option+Esc.
// DisableSessionTermination (128) blocks system log-out/restart from the UI.
#[cfg(target_os = "macos")]
const KIOSK_PRESENTATION_OPTIONS: u64 = 2 | 8 | 16 | 32 | 64 | 128;

#[cfg(target_os = "macos")]
fn set_presentation_options(options: u64) {
    use objc::runtime::Object;
    use objc::{class, msg_send, sel, sel_impl};
    unsafe {
        let app: *mut Object = msg_send![class!(NSApplication), sharedApplication];
        let _: () = msg_send![app, setPresentationOptions: options];
    }
}

#[tauri::command]
pub fn enter_kiosk_mode(window: WebviewWindow) -> Result<(), String> {
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window.set_decorations(false).map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    set_presentation_options(KIOSK_PRESENTATION_OPTIONS);

    Ok(())
}

#[tauri::command]
pub fn exit_kiosk_mode(window: WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    set_presentation_options(0); // NSApplicationPresentationDefault — restore everything

    window.set_fullscreen(false).map_err(|e| e.to_string())?;
    window.set_always_on_top(false).map_err(|e| e.to_string())?;
    window.set_decorations(true).map_err(|e| e.to_string())?;

    Ok(())
}
