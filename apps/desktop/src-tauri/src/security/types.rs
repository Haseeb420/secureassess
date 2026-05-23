use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "value")]
pub enum ViolationType {
    MultipleDisplays,
    ExternalDisplay,
    ForbiddenProcess(String),
    FocusLoss,
    FullscreenExit,
    ScreenRecording,
    VirtualMachine,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecurityEvent {
    pub id: String,
    pub timestamp: String,
    pub violation: ViolationType,
    pub candidate_id: String,
    pub machine_id: String,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationResult {
    pub passed: bool,
    pub violations: Vec<ViolationType>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ForbiddenProcess {
    pub name: String,
    pub pid: u32,
    pub category: String,
}
