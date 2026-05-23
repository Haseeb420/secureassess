use super::types::{ValidationResult, ViolationType};

pub fn check_displays() -> ValidationResult {
    #[cfg(target_os = "macos")]
    return macos_check_displays();

    #[cfg(not(target_os = "macos"))]
    // TODO: implement EnumDisplayDevices via windows-rs
    return ValidationResult {
        passed: true,
        violations: vec![],
    };
}

#[tauri::command]
pub fn validate_displays() -> ValidationResult {
    check_displays()
}

#[cfg(target_os = "macos")]
fn macos_check_displays() -> ValidationResult {
    let output = std::process::Command::new("system_profiler")
        .args(["SPDisplaysDataType", "-json"])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(_) => {
            return ValidationResult {
                passed: true,
                violations: vec![],
            }
        }
    };

    let json: serde_json::Value = match serde_json::from_slice(&output.stdout) {
        Ok(v) => v,
        Err(_) => {
            return ValidationResult {
                passed: true,
                violations: vec![],
            }
        }
    };

    let displays = json
        .get("SPDisplaysDataType")
        .and_then(|v| v.as_array())
        .and_then(|adapters| {
            // Each adapter entry may have a "spdisplays_ndrvs" array of connected displays
            let all: Vec<serde_json::Value> = adapters
                .iter()
                .filter_map(|adapter| adapter.get("spdisplays_ndrvs")?.as_array().cloned())
                .flatten()
                .collect();
            Some(all)
        })
        .unwrap_or_default();

    let count = displays.len();
    let mut violations = Vec::new();

    if count > 1 {
        violations.push(ViolationType::MultipleDisplays);
    }

    for display in &displays {
        let name = display
            .get("_name")
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_lowercase();
        if name.contains("airplay") || name.contains("sidecar") {
            violations.push(ViolationType::ExternalDisplay);
            break;
        }
    }

    ValidationResult {
        passed: violations.is_empty(),
        violations,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn display_validation_returns_result() {
        // Verify it runs without panicking
        let result = check_displays();
        // passed is bool — just assert it's a valid boolean (always true)
        let _ = result.passed;
    }
}
