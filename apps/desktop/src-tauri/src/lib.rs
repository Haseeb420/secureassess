mod db;
mod eval;
mod security;
mod sync;

use db::commands::{
    get_active_session, get_code_snapshot, get_latest_snapshot, get_security_events, get_session,
    get_test_cases, mark_session_complete, save_code_snapshot, save_security_event, save_session,
    save_session_state, save_snapshot, save_test_cases, update_timer,
};
use eval::commands::{run_sample_tests, submit_solution};
use eval::runtime_check::get_available_runtimes;
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

            let key = get_db_key();
            let db_url = format!("sqlite:secureassess_{}.db", &key[..8]);
            let pool = tauri::async_runtime::block_on(init_pool(&db_url))
                .expect("Failed to initialize database");
            app.manage(DbPool(pool));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(sync::worker::start_sync_worker(app_handle));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // security
            validate_displays,
            check_forbidden_processes,
            enter_kiosk_mode,
            exit_kiosk_mode,
            // db – session
            save_session,
            save_session_state,
            get_session,
            get_active_session,
            mark_session_complete,
            update_timer,
            // db – snapshot
            save_code_snapshot,
            save_snapshot,
            get_code_snapshot,
            get_latest_snapshot,
            // db – events
            save_security_event,
            get_security_events,
            // db – test cases
            save_test_cases,
            get_test_cases,
            // eval
            run_sample_tests,
            submit_solution,
            get_available_runtimes,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
