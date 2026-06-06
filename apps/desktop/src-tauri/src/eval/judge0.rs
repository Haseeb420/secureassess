use reqwest::Client;
use serde::{Deserialize, Serialize};

use super::{
    types::{ExecutionRequest, ExecutionResult, ExecutionStatus},
    EvaluationBackend,
};

pub struct Judge0Client {
    pub base_url: String,
    client: Client,
}

impl Judge0Client {
    pub fn new() -> Self {
        // Priority: runtime env (dotenvy in dev) → compile-time baked value (CI secret).
        let base_url = std::env::var("JUDGE0_URL")
            .or_else(|_| std::env::var("VITE_JUDGE0_URL"))
            .unwrap_or_else(|_| {
                option_env!("VITE_JUDGE0_URL").unwrap_or("").to_string()
            })
            .trim_end_matches('/')
            .to_string();
        Self {
            base_url,
            client: Client::new(),
        }
    }
}

// Judge0 CE 1.13.1 language IDs — verified against live /languages endpoint.
fn language_id(lang: &str) -> Option<u32> {
    match lang {
        "python"     => Some(71), // Python 3.8.1
        "javascript" => Some(63), // Node.js 12.14.0
        "typescript" => Some(74), // TypeScript 3.7.4
        "java"       => Some(62), // Java OpenJDK 13.0.1
        "cpp"        => Some(54), // C++ GCC 9.2.0
        "c"          => Some(50), // C GCC 9.2.0
        "csharp"     => Some(51), // C# Mono 6.6.0.161
        "go"         => Some(60), // Go 1.13.5
        "rust"       => Some(73), // Rust 1.40.0
        "ruby"       => Some(72), // Ruby 2.7.0
        "kotlin"     => Some(78), // Kotlin 1.3.70
        "swift"      => Some(83), // Swift 5.2.3
        "php"        => Some(68), // PHP 7.4.1
        "r"          => Some(80), // R 4.0.0
        "scala"      => Some(81), // Scala 2.13.2
        "bash"       => Some(46), // Bash 5.0.0
        "haskell"    => Some(61), // Haskell GHC 8.8.1
        "lua"        => Some(64), // Lua 5.3.5
        "perl"       => Some(85), // Perl 5.28.1
        "elixir"     => Some(57), // Elixir 1.9.4
        _ => None,
    }
}

#[derive(Serialize)]
struct Judge0Submission {
    source_code: String,
    language_id: u32,
    stdin: String,
    cpu_time_limit: f64, // seconds
    memory_limit: u64,   // KB
}

#[derive(Deserialize, Debug)]
struct Judge0Response {
    stdout: Option<String>,
    stderr: Option<String>,
    compile_output: Option<String>,
    time: Option<String>, // e.g. "0.002"
    status: Judge0Status,
}

#[derive(Deserialize, Debug)]
struct Judge0Status {
    id: u32,
    description: String,
}

#[async_trait::async_trait]
impl EvaluationBackend for Judge0Client {
    async fn run(&self, req: ExecutionRequest) -> ExecutionResult {
        if self.base_url.is_empty() {
            return ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout: String::new(),
                stderr: "Judge0 URL not configured. Set VITE_JUDGE0_URL in apps/desktop/.env".into(),
                execution_time_ms: 0,
                compile_error: None,
            };
        }

        let lang_id = match language_id(&req.language) {
            Some(id) => id,
            None => {
                return ExecutionResult {
                    status: ExecutionStatus::RuntimeError,
                    stdout: String::new(),
                    stderr: format!("Unsupported language for Judge0: {}", req.language),
                    execution_time_ms: 0,
                    compile_error: None,
                }
            }
        };

        let body = Judge0Submission {
            source_code: req.source_code,
            language_id: lang_id,
            stdin: req.stdin,
            cpu_time_limit: req.time_limit_ms as f64 / 1000.0,
            memory_limit: req.memory_limit_mb * 1024, // MB → KB
        };

        let url = format!("{}/submissions?base64_encoded=false&wait=true", self.base_url);

        let response = match self.client.post(&url).json(&body).send().await {
            Ok(r) => r,
            Err(e) => {
                return ExecutionResult {
                    status: ExecutionStatus::RuntimeError,
                    stdout: String::new(),
                    stderr: format!("Judge0 request failed: {e}"),
                    execution_time_ms: 0,
                    compile_error: None,
                };
            }
        };

        let http_status = response.status();
        let body_text = match response.text().await {
            Ok(t) => t,
            Err(e) => {
                return ExecutionResult {
                    status: ExecutionStatus::RuntimeError,
                    stdout: String::new(),
                    stderr: format!("Failed to read Judge0 response: {e}"),
                    execution_time_ms: 0,
                    compile_error: None,
                };
            }
        };

        if !http_status.is_success() {
            return ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout: String::new(),
                stderr: format!("Judge0 HTTP {}: {}", http_status.as_u16(), body_text.trim()),
                execution_time_ms: 0,
                compile_error: None,
            };
        }

        let result: Judge0Response = match serde_json::from_str(&body_text) {
            Ok(r) => r,
            Err(e) => {
                return ExecutionResult {
                    status: ExecutionStatus::RuntimeError,
                    stdout: String::new(),
                    stderr: format!("Judge0 parse error: {e}\nBody: {body_text}"),
                    execution_time_ms: 0,
                    compile_error: None,
                };
            }
        };

        let execution_time_ms = result
            .time
            .as_deref()
            .and_then(|t| t.parse::<f64>().ok())
            .map(|s| (s * 1000.0) as u64)
            .unwrap_or(0);

        let stdout = result.stdout.unwrap_or_default();
        let stderr = result.stderr.unwrap_or_default();

        match result.status.id {
            3 => ExecutionResult {
                status: ExecutionStatus::Accepted,
                stdout,
                stderr,
                execution_time_ms,
                compile_error: None,
            },
            4 => ExecutionResult {
                status: ExecutionStatus::WrongAnswer,
                stdout,
                stderr,
                execution_time_ms,
                compile_error: None,
            },
            5 => ExecutionResult {
                status: ExecutionStatus::TimeLimitExceeded,
                stdout: String::new(),
                stderr: String::new(),
                execution_time_ms: req.time_limit_ms,
                compile_error: None,
            },
            6 => ExecutionResult {
                status: ExecutionStatus::CompileError,
                stdout: String::new(),
                stderr: String::new(),
                execution_time_ms: 0,
                compile_error: Some(
                    result.compile_output.unwrap_or_else(|| result.status.description.clone())
                ),
            },
            _ => ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout,
                stderr: format!(
                    "{}\n{}",
                    result.status.description,
                    result.compile_output.unwrap_or_default()
                )
                .trim()
                .to_string(),
                execution_time_ms,
                compile_error: None,
            },
        }
    }
}
