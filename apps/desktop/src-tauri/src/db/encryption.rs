use sha2::{Digest, Sha256};

pub fn get_db_key() -> String {
    let hostname = get_hostname();
    let mac = get_mac_address();
    let raw = format!("{hostname}{mac}secureassess-salt");
    let hash = Sha256::digest(raw.as_bytes());
    let hex: String = hash.iter().map(|b| format!("{b:02x}")).collect();
    hex[..32].to_string()
}

fn get_hostname() -> String {
    std::process::Command::new("hostname")
        .output()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .unwrap_or_else(|_| "unknown-host".to_string())
}

fn get_mac_address() -> String {
    // Walk network interfaces and return the first non-loopback MAC
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
                // CSV format: "mac-addr","transport-name"
                let parts: Vec<&str> = line.split(',').collect();
                if let Some(mac) = parts.first() {
                    return mac.trim_matches('"').to_string();
                }
            }
        }
    }

    "00:00:00:00:00:00".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn key_is_32_chars() {
        let key = get_db_key();
        assert_eq!(key.len(), 32, "DB key must be exactly 32 hex chars");
    }

    #[test]
    fn key_is_deterministic() {
        assert_eq!(get_db_key(), get_db_key());
    }
}
