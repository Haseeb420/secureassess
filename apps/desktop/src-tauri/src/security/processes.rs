use super::types::{ForbiddenProcess, ValidationResult, ViolationType};

pub fn scan_forbidden_processes() -> (ValidationResult, Vec<ForbiddenProcess>) {
    let found: Vec<ForbiddenProcess> = Vec::new();
    let mut violations = Vec::new();

    for p in &found {
        violations.push(ViolationType::ForbiddenProcess(p.name.clone()));
    }

    let result = ValidationResult {
        passed: violations.is_empty(),
        violations,
    };
    (result, found)
}
