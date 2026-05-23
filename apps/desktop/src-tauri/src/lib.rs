mod db;
mod security;

use db::commands::{
    get_latest_snapshot, get_security_events, get_session, save_security_event, save_session,
    save_snapshot, update_timer,
};
use db::encryption::get_db_key;
use db::migrations::init_pool;
use db::DbPool;
use security::display::validate_displays;
use security::kiosk::{enter_kiosk_mode, exit_kiosk_mode};
use security::processes::check_forbidden_processes;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // Derive encryption key from machine fingerprint
            let key = get_db_key();
            // Use first 8 chars of key in filename so each machine gets its own DB
            let db_url = format!("sqlite:secureassess_{}.db", &key[..8]);

            let pool = tauri::async_runtime::block_on(init_pool(&db_url))
                .expect("Failed to initialize database");

            app.manage(DbPool(pool));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // security
            validate_displays,
            check_forbidden_processes,
            enter_kiosk_mode,
            exit_kiosk_mode,
            // db
            save_session,
            get_session,
            update_timer,
            save_snapshot,
            get_latest_snapshot,
            save_security_event,
            get_security_events,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
