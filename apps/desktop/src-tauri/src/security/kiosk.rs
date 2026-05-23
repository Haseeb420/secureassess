use tauri::Window;

#[tauri::command]
pub fn enter_kiosk_mode(window: Window) -> Result<(), String> {
    window.set_fullscreen(true).map_err(|e| e.to_string())?;
    window.set_always_on_top(true).map_err(|e| e.to_string())?;
    window.set_decorations(false).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn exit_kiosk_mode(window: Window) -> Result<(), String> {
    window.set_fullscreen(false).map_err(|e| e.to_string())?;
    window.set_always_on_top(false).map_err(|e| e.to_string())?;
    window.set_decorations(true).map_err(|e| e.to_string())?;
    Ok(())
}
