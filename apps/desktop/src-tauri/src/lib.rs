mod db;
mod eval;
mod security;
mod sync;

use db::commands::{
    get_active_session, get_code_snapshot, get_latest_snapshot, get_security_events, get_session,
    get_test_cases, lock_assessment, mark_session_complete, save_code_snapshot,
    save_security_event, save_session, save_session_state, save_snapshot, save_test_cases,
    update_timer,
};
use eval::commands::{run_sample_tests, submit_solution};
use eval::runtime_check::get_available_runtimes;
use db::encryption::get_db_key;
use db::migrations::init_pool;
use db::DbPool;
use security::display::validate_displays;
use security::fingerprint::get_machine_fingerprint;
use security::kiosk::{enter_kiosk_mode, exit_kiosk_mode, AssessmentActiveFlag};
use security::processes::check_forbidden_processes;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{Emitter, Manager};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let assessment_flag = Arc::new(AtomicBool::new(false));
    let flag_for_watchdog = Arc::clone(&assessment_flag);

    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            app.manage(AssessmentActiveFlag(assessment_flag));

            let key = get_db_key();
            let app_data_dir = app.path().app_data_dir()
                .expect("failed to get app data dir");
            std::fs::create_dir_all(&app_data_dir)
                .expect("failed to create app data dir");
            let db_path = app_data_dir.join(format!("secureassess_{}.db", &key[..8]));
            let pool = tauri::async_runtime::block_on(init_pool(&db_path))
                .expect("Failed to initialize database");
            app.manage(DbPool(pool));

            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(sync::worker::start_sync_worker(app_handle));

            let watchdog_handle = app.handle().clone();
            security::fullscreen_guard::start_fullscreen_watchdog(watchdog_handle, flag_for_watchdog);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let flag = window.state::<AssessmentActiveFlag>();
                if flag.0.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.app_handle().emit("window:close-requested", ());
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            // security
            validate_displays,
            check_forbidden_processes,
            enter_kiosk_mode,
            exit_kiosk_mode,
            get_machine_fingerprint,
            // db – session
            save_session,
            save_session_state,
            get_session,
            get_active_session,
            mark_session_complete,
            lock_assessment,
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
