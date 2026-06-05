pub mod commands;
pub mod judge0;
pub mod local;
pub mod runtime_check;
pub mod types;

pub use types::{ExecutionRequest, ExecutionResult};

#[async_trait::async_trait]
pub trait EvaluationBackend: Send + Sync {
    async fn run(&self, req: ExecutionRequest) -> ExecutionResult;
}

pub fn get_backend() -> Box<dyn EvaluationBackend> {
    // Accept both EXECUTION_BACKEND (server convention) and VITE_EXECUTION_BACKEND
    // (desktop .env convention, loaded by dotenvy at startup).
    let backend = std::env::var("EXECUTION_BACKEND")
        .or_else(|_| std::env::var("VITE_EXECUTION_BACKEND"))
        .unwrap_or_default();
    match backend.as_str() {
        "judge0" => Box::new(judge0::Judge0Client::new()),
        _ => Box::new(local::LocalExecutor),
    }
}
