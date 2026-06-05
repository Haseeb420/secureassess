use std::path::Path;
use std::process::Stdio;
use std::time::{Duration, Instant};

use tokio::io::AsyncWriteExt;
use tokio::time::timeout;

use super::{
    types::{ExecutionRequest, ExecutionResult, ExecutionStatus},
    EvaluationBackend,
};

pub struct LocalExecutor;

#[async_trait::async_trait]
impl EvaluationBackend for LocalExecutor {
    async fn run(&self, req: ExecutionRequest) -> ExecutionResult {
        let work_dir = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());

        if let Err(e) = tokio::fs::create_dir_all(&work_dir).await {
            return ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout: String::new(),
                stderr: format!("Failed to create temp dir: {e}"),
                execution_time_ms: 0,
                compile_error: None,
            };
        }

        let result = run_in_dir(&req, &work_dir).await;
        let _ = tokio::fs::remove_dir_all(&work_dir).await;
        result
    }
}

struct LangConfig {
    filename: &'static str,
    compile: Option<Vec<String>>,
    run: Vec<String>,
}

async fn run_in_dir(req: &ExecutionRequest, work_dir: &Path) -> ExecutionResult {
    let dir = work_dir.to_string_lossy();

    let cfg = match req.language.as_str() {
        "python" => LangConfig {
            filename: "solution.py",
            compile: None,
            // On Windows: use the Python Launcher (py.exe) installed by the official
            // Python installer. On Unix: python3 is the standard command.
            run: vec![
                if cfg!(target_os = "windows") { "py" } else { "python3" }.into(),
                format!("{dir}/solution.py"),
            ],
        },
        "javascript" => LangConfig {
            filename: "solution.js",
            compile: None,
            run: vec!["node".into(), format!("{dir}/solution.js")],
        },
        "typescript" => LangConfig {
            filename: "solution.ts",
            compile: None,
            run: vec!["npx".into(), "ts-node".into(), format!("{dir}/solution.ts")],
        },
        "java" => LangConfig {
            filename: "Solution.java",
            compile: Some(vec!["javac".into(), format!("{dir}/Solution.java")]),
            run: vec![
                "java".into(),
                "-cp".into(),
                dir.into_owned(),
                "Solution".into(),
            ],
        },
        "cpp" => LangConfig {
            filename: "solution.cpp",
            compile: Some(vec![
                "g++".into(),
                "-o".into(),
                format!("{dir}/solution_bin"),
                format!("{dir}/solution.cpp"),
            ]),
            run: vec![format!("{dir}/solution_bin")],
        },
        "go" => LangConfig {
            filename: "solution.go",
            compile: None,
            run: vec!["go".into(), "run".into(), format!("{dir}/solution.go")],
        },
        lang => {
            return ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout: String::new(),
                stderr: format!("Unsupported language: {lang}"),
                execution_time_ms: 0,
                compile_error: None,
            };
        }
    };

    // Write source to temp file
    if let Err(e) = tokio::fs::write(work_dir.join(cfg.filename), &req.source_code).await {
        return ExecutionResult {
            status: ExecutionStatus::RuntimeError,
            stdout: String::new(),
            stderr: format!("Failed to write source: {e}"),
            execution_time_ms: 0,
            compile_error: None,
        };
    }

    // Compile step for compiled languages
    if let Some(compile_cmd) = cfg.compile {
        let (prog, args) = compile_cmd
            .split_first()
            .expect("compile_cmd is never empty");
        match tokio::process::Command::new(prog)
            .args(args)
            .output()
            .await
        {
            Ok(out) if out.status.success() => {}
            Ok(out) => {
                return ExecutionResult {
                    status: ExecutionStatus::CompileError,
                    stdout: String::new(),
                    stderr: String::new(),
                    execution_time_ms: 0,
                    compile_error: Some(String::from_utf8_lossy(&out.stderr).into_owned()),
                };
            }
            Err(e) => {
                return ExecutionResult {
                    status: ExecutionStatus::CompileError,
                    stdout: String::new(),
                    stderr: String::new(),
                    execution_time_ms: 0,
                    compile_error: Some(format!("Compiler not found: {e}")),
                };
            }
        }
    }

    // Spawn the run process
    let (prog, args) = cfg.run.split_first().expect("run_cmd is never empty");
    let mut child = match tokio::process::Command::new(prog)
        .args(args)
        .kill_on_drop(true)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
    {
        Ok(c) => c,
        Err(e) => {
            return ExecutionResult {
                status: ExecutionStatus::RuntimeError,
                stdout: String::new(),
                stderr: format!("Failed to spawn process: {e}"),
                execution_time_ms: 0,
                compile_error: None,
            };
        }
    };

    // Write stdin and close the handle to signal EOF
    if let Some(mut stdin) = child.stdin.take() {
        let _ = stdin.write_all(req.stdin.as_bytes()).await;
    }

    let start = Instant::now();

    match timeout(
        Duration::from_millis(req.time_limit_ms),
        child.wait_with_output(),
    )
    .await
    {
        Err(_elapsed) => ExecutionResult {
            status: ExecutionStatus::TimeLimitExceeded,
            stdout: String::new(),
            stderr: String::new(),
            execution_time_ms: req.time_limit_ms,
            compile_error: None,
        },
        Ok(Ok(out)) => {
            let elapsed_ms = start.elapsed().as_millis() as u64;
            if out.status.success() {
                ExecutionResult {
                    status: ExecutionStatus::Accepted,
                    stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
                    stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
                    execution_time_ms: elapsed_ms,
                    compile_error: None,
                }
            } else {
                ExecutionResult {
                    status: ExecutionStatus::RuntimeError,
                    stdout: String::from_utf8_lossy(&out.stdout).into_owned(),
                    stderr: String::from_utf8_lossy(&out.stderr).into_owned(),
                    execution_time_ms: elapsed_ms,
                    compile_error: None,
                }
            }
        }
        Ok(Err(e)) => ExecutionResult {
            status: ExecutionStatus::RuntimeError,
            stdout: String::new(),
            stderr: format!("Process wait error: {e}"),
            execution_time_ms: 0,
            compile_error: None,
        },
    }
}

#[cfg(test)]
mod tests {
    use super::LocalExecutor;
    use crate::eval::{
        types::{ExecutionRequest, ExecutionStatus},
        EvaluationBackend,
    };

    fn make_req(language: &str, source_code: &str, stdin: &str, time_limit_ms: u64) -> ExecutionRequest {
        ExecutionRequest {
            source_code: source_code.to_string(),
            language: language.to_string(),
            stdin: stdin.to_string(),
            time_limit_ms,
            memory_limit_mb: 64,
        }
    }

    #[tokio::test]
    async fn test_python_hello_world() {
        let req = make_req("python", "print('hello')", "", 5000);
        let result = LocalExecutor.run(req).await;
        assert_eq!(result.status, ExecutionStatus::Accepted);
        assert!(result.stdout.contains("hello"));
    }

    #[tokio::test]
    async fn test_python_timeout() {
        let req = make_req("python", "while True: pass", "", 500);
        let result = LocalExecutor.run(req).await;
        assert_eq!(result.status, ExecutionStatus::TimeLimitExceeded);
    }

    #[tokio::test]
    async fn test_python_runtime_error() {
        let req = make_req("python", "raise Exception('boom')", "", 5000);
        let result = LocalExecutor.run(req).await;
        assert_eq!(result.status, ExecutionStatus::RuntimeError);
    }

    #[tokio::test]
    async fn test_javascript_hello_world() {
        let req = make_req("javascript", "console.log('hello')", "", 5000);
        let result = LocalExecutor.run(req).await;
        assert_eq!(result.status, ExecutionStatus::Accepted);
        assert!(result.stdout.contains("hello"));
    }
}
