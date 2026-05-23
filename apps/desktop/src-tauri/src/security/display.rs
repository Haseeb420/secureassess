use super::types::ValidationResult;
use super::types::ViolationType;

pub fn check_displays() -> ValidationResult {
    let mut violations = Vec::new();

    #[cfg(target_os = "macos")]
    {
        let count = macos_display_count();
        if count > 1 {
            violations.push(ViolationType::MultipleDisplays);
        }
    }

    ValidationResult {
        passed: violations.is_empty(),
        violations,
    }
}

#[cfg(target_os = "macos")]
fn macos_display_count() -> u32 {
    // Placeholder — real implementation in Part B uses CoreGraphics FFI
    1
}
