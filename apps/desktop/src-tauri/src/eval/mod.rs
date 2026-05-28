pub mod judge0;
pub mod local;
pub mod types;

pub use types::{ExecutionRequest, ExecutionResult};

#[async_trait::async_trait]
pub trait EvaluationBackend: Send + Sync {
    async fn run(&self, req: ExecutionRequest) -> ExecutionResult;
}

pub fn get_backend() -> Box<dyn EvaluationBackend> {
    match std::env::var("EXECUTION_BACKEND").as_deref() {
        Ok("judge0") => Box::new(judge0::Judge0Client::new()),
        _ => Box::new(local::LocalExecutor),
    }
}
