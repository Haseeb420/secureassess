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
    // Priority: runtime env (dotenvy loads .env in dev) → compile-time baked value
    // (option_env! reads the env var during `cargo build`, so CI secrets are embedded
    // into the binary and survive in production where no .env file exists).
    let backend = std::env::var("EXECUTION_BACKEND")
        .or_else(|_| std::env::var("VITE_EXECUTION_BACKEND"))
        .unwrap_or_else(|_| {
            option_env!("VITE_EXECUTION_BACKEND")
                .unwrap_or("local")
                .to_string()
        });
    match backend.as_str() {
        "judge0" => Box::new(judge0::Judge0Client::new()),
        _ => Box::new(local::LocalExecutor),
    }
}
