use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ExecutionStatus {
    Accepted,
    WrongAnswer,
    TimeLimitExceeded,
    RuntimeError,
    CompileError,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionRequest {
    pub source_code: String,
    pub language: String,
    pub stdin: String,
    pub time_limit_ms: u64,
    pub memory_limit_mb: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionResult {
    pub status: ExecutionStatus,
    pub stdout: String,
    pub stderr: String,
    pub execution_time_ms: u64,
    pub compile_error: Option<String>,
}
