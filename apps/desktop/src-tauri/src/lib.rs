mod security;

use security::display::validate_displays;
use security::kiosk::{enter_kiosk_mode, exit_kiosk_mode};
use security::processes::check_forbidden_processes;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
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
    .invoke_handler(tauri::generate_handler![
      validate_displays,
      check_forbidden_processes,
      enter_kiosk_mode,
      exit_kiosk_mode,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
