use std::time::Duration;

use sysinfo::System;
use tauri::{AppHandle, Emitter};

use super::types::ForbiddenProcess;

struct ForbiddenEntry {
    keyword: &'static str,
    category: &'static str,
}

const FORBIDDEN: &[ForbiddenEntry] = &[
    // browsers
    ForbiddenEntry { keyword: "chrome",          category: "browser" },
    ForbiddenEntry { keyword: "firefox",         category: "browser" },
    ForbiddenEntry { keyword: "safari",          category: "browser" },
    ForbiddenEntry { keyword: "msedge",          category: "browser" },
    ForbiddenEntry { keyword: "brave",           category: "browser" },
    ForbiddenEntry { keyword: "opera",           category: "browser" },
    ForbiddenEntry { keyword: "arc",             category: "browser" },
    // ai_tools
    ForbiddenEntry { keyword: "chatgpt",         category: "ai_tool" },
    ForbiddenEntry { keyword: "cursor",          category: "ai_tool" },
    ForbiddenEntry { keyword: "notion",          category: "ai_tool" },
    ForbiddenEntry { keyword: "copilot",         category: "ai_tool" },
    ForbiddenEntry { keyword: "perplexity",      category: "ai_tool" },
    // communication
    ForbiddenEntry { keyword: "slack",           category: "communication" },
    ForbiddenEntry { keyword: "teams",           category: "communication" },
    ForbiddenEntry { keyword: "discord",         category: "communication" },
    ForbiddenEntry { keyword: "zoom",            category: "communication" },
    ForbiddenEntry { keyword: "telegram",        category: "communication" },
    ForbiddenEntry { keyword: "whatsapp",        category: "communication" },
    ForbiddenEntry { keyword: "signal",          category: "communication" },
    // remote_desktop
    ForbiddenEntry { keyword: "teamviewer",      category: "remote_desktop" },
    ForbiddenEntry { keyword: "anydesk",         category: "remote_desktop" },
    ForbiddenEntry { keyword: "vnc",             category: "remote_desktop" },
    ForbiddenEntry { keyword: "parsec",          category: "remote_desktop" },
    ForbiddenEntry { keyword: "rustdesk",        category: "remote_desktop" },
    // screen_recording
    ForbiddenEntry { keyword: "obs",             category: "screen_recording" },
    ForbiddenEntry { keyword: "camtasia",        category: "screen_recording" },
    ForbiddenEntry { keyword: "loom",            category: "screen_recording" },
    ForbiddenEntry { keyword: "screenflow",      category: "screen_recording" },
    ForbiddenEntry { keyword: "quicktimeplayer", category: "screen_recording" },
    ForbiddenEntry { keyword: "kap",             category: "screen_recording" },
    // external_ide
    ForbiddenEntry { keyword: "code",            category: "external_ide" },
    ForbiddenEntry { keyword: "xcode",           category: "external_ide" },
    ForbiddenEntry { keyword: "intellij",        category: "external_ide" },
    ForbiddenEntry { keyword: "pycharm",         category: "external_ide" },
    ForbiddenEntry { keyword: "webstorm",        category: "external_ide" },
    ForbiddenEntry { keyword: "sublime",         category: "external_ide" },
    ForbiddenEntry { keyword: "fleet",           category: "external_ide" },
    ForbiddenEntry { keyword: "zed",             category: "external_ide" },
];

pub fn scan_processes() -> Vec<ForbiddenProcess> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut found = Vec::new();

    for (pid, process) in sys.processes() {
        let name_lower = process.name().to_string_lossy().to_lowercase();
        for entry in FORBIDDEN {
            if name_lower.contains(entry.keyword) {
                found.push(ForbiddenProcess {
                    name: process.name().to_string_lossy().into_owned(),
                    pid: pid.as_u32(),
                    category: entry.category.to_string(),
                });
                break; // one category match per process is enough
            }
        }
    }

    found
}

#[tauri::command]
pub fn check_forbidden_processes() -> Vec<ForbiddenProcess> {
    scan_processes()
}

pub fn start_process_monitor(app_handle: AppHandle, interval_secs: u64) {
    std::thread::spawn(move || loop {
        let violations = scan_processes();
        for process in violations {
            let _ = app_handle.emit("security:process-violation", &process);
        }
        std::thread::sleep(Duration::from_secs(interval_secs));
    });
}
