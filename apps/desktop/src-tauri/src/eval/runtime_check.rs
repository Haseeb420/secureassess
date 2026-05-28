use std::collections::HashMap;
use std::process::Command;

/// Returns a map of language → available (true/false).
/// Each entry reflects whether the required runtime binary is on PATH.
#[tauri::command]
pub fn get_available_runtimes() -> HashMap<String, bool> {
    let checks: &[(&str, &[&str])] = &[
        ("python",     &["python3", "--version"]),
        ("javascript", &["node",    "--version"]),
        ("typescript", &["npx",     "ts-node", "--version"]),
        ("java",       &["javac",   "--version"]),
        ("cpp",        &["g++",     "--version"]),
        ("go",         &["go",      "version"]),
    ];

    checks
        .iter()
        .map(|(lang, argv)| {
            let ok = Command::new(argv[0])
                .args(&argv[1..])
                .output()
                .map(|o| o.status.success())
                .unwrap_or(false);
            (lang.to_string(), ok)
        })
        .collect()
}
