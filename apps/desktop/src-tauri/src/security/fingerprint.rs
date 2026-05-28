use sha2::{Digest, Sha256};
use sqlx::SqlitePool;
use sysinfo::{CpuRefreshKind, RefreshKind, System};
use tauri::State;

use crate::db::DbPool;

pub fn generate_machine_fingerprint() -> String {
    let hostname = get_hostname();
    let mac = get_mac_address();
    let cpu_brand = get_cpu_brand();
    let os_version = System::os_version().unwrap_or_default();

    let combined = format!("{hostname}||{mac}||{cpu_brand}||{os_version}");
    let hash = Sha256::digest(combined.as_bytes());
    hash.iter().map(|b| format!("{b:02x}")).collect()
}

pub async fn get_or_create_fingerprint(db: &SqlitePool) -> String {
    if let Ok(Some(row)) = sqlx::query_as::<_, (String,)>(
        "SELECT value FROM device_settings WHERE key = 'fingerprint'",
    )
    .fetch_optional(db)
    .await
    {
        return row.0;
    }

    let fp = generate_machine_fingerprint();

    let _ = sqlx::query(
        "INSERT OR IGNORE INTO device_settings (key, value) VALUES ('fingerprint', ?1)",
    )
    .bind(&fp)
    .execute(db)
    .await;

    fp
}

#[tauri::command]
pub async fn get_machine_fingerprint(db: State<'_, DbPool>) -> Result<String, String> {
    Ok(get_or_create_fingerprint(&db.0).await)
}

fn get_hostname() -> String {
    std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown-host".to_string())
}

fn get_mac_address() -> String {
    #[cfg(target_os = "macos")]
    {
        if let Ok(out) = std::process::Command::new("ifconfig")
            .arg("en0")
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("ether ") {
                    return trimmed["ether ".len()..].trim().to_string();
                }
            }
        }
    }
    #[cfg(target_os = "windows")]
    {
        if let Ok(out) = std::process::Command::new("getmac")
            .args(["/fo", "csv", "/nh"])
            .output()
        {
            let text = String::from_utf8_lossy(&out.stdout);
            if let Some(line) = text.lines().next() {
                let parts: Vec<&str> = line.split(',').collect();
                if let Some(mac) = parts.first() {
                    return mac.trim_matches('"').to_string();
                }
            }
        }
    }
    "00:00:00:00:00:00".to_string()
}

fn get_cpu_brand() -> String {
    let mut sys =
        System::new_with_specifics(RefreshKind::nothing().with_cpu(CpuRefreshKind::nothing()));
    sys.refresh_cpu_all();
    sys.cpus()
        .first()
        .map(|c| c.brand().to_string())
        .unwrap_or_default()
}
