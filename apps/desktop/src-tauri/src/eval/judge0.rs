use super::{
    types::{ExecutionRequest, ExecutionResult},
    EvaluationBackend,
};

pub struct Judge0Client {
    pub base_url: String,
}

impl Judge0Client {
    pub fn new() -> Self {
        Self {
            base_url: std::env::var("JUDGE0_URL").unwrap_or_default(),
        }
    }
}

#[async_trait::async_trait]
impl EvaluationBackend for Judge0Client {
    async fn run(&self, _req: ExecutionRequest) -> ExecutionResult {
        // TODO: implement when migrating to server
        // POST to self.base_url/submissions, poll for result, map status codes
        unimplemented!("Judge0 backend not yet implemented")
    }
}
