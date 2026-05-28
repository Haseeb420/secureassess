use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use tauri::State;
use uuid::Uuid;

use crate::db::models::TestCaseRow;
use crate::db::DbPool;
use crate::sync::queue::enqueue;
use super::{get_backend, types::{ExecutionRequest, ExecutionStatus}, EvaluationBackend};

// ── Response types ────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct TestCaseOutcome {
    pub test_case_id: String,
    pub passed: bool,
    pub stdout: String,
    pub stderr: String,
    pub execution_time_ms: u64,
    pub status: String,
    pub compile_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RunResult {
    pub outcomes: Vec<TestCaseOutcome>,
    pub compile_error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SubmitResult {
    pub score: f64,
    pub total_tests: usize,
    pub passed_tests: usize,
    pub outcomes: Vec<TestCaseOutcome>,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn status_to_str(status: &ExecutionStatus) -> &'static str {
    match status {
        ExecutionStatus::Accepted => "accepted",
        ExecutionStatus::WrongAnswer => "wrong_answer",
        ExecutionStatus::TimeLimitExceeded => "time_limit_exceeded",
        ExecutionStatus::RuntimeError => "runtime_error",
        ExecutionStatus::CompileError => "compile_error",
    }
}

async fn fetch_test_cases(
    db: &sqlx::SqlitePool,
    question_id: &str,
    include_hidden: bool,
) -> Result<Vec<TestCaseRow>, String> {
    sqlx::query_as::<_, TestCaseRow>(
        "SELECT id, question_id, input, expected_output, is_hidden, time_limit_ms, memory_limit_mb
         FROM test_cases
         WHERE question_id = ?1 AND (is_hidden = 0 OR ?2 = 1)
         ORDER BY rowid ASC",
    )
    .bind(question_id)
    .bind(include_hidden as i64)
    .fetch_all(db)
    .await
    .map_err(|e| e.to_string())
}

async fn run_cases(
    backend: &dyn EvaluationBackend,
    source_code: &str,
    language: &str,
    test_cases: &[TestCaseRow],
) -> Result<RunResult, String> {
    let mut outcomes = Vec::new();

    for tc in test_cases {
        let req = ExecutionRequest {
            source_code: source_code.to_string(),
            language: language.to_string(),
            stdin: tc.input.clone(),
            time_limit_ms: tc.time_limit_ms as u64,
            memory_limit_mb: tc.memory_limit_mb as u64,
        };

        let result = backend.run(req).await;

        // Stop immediately if any test case fails to compile
        if result.status == ExecutionStatus::CompileError {
            return Ok(RunResult {
                compile_error: result.compile_error,
                outcomes: vec![],
            });
        }

        let expected = tc.expected_output.trim();
        let actual = result.stdout.trim();

        let (passed, status_str) = match &result.status {
            ExecutionStatus::Accepted => {
                if actual == expected {
                    (true, "accepted".to_string())
                } else {
                    (false, "wrong_answer".to_string())
                }
            }
            other => (false, status_to_str(other).to_string()),
        };

        outcomes.push(TestCaseOutcome {
            test_case_id: tc.id.clone(),
            passed,
            stdout: result.stdout,
            stderr: result.stderr,
            execution_time_ms: result.execution_time_ms,
            status: status_str,
            compile_error: None,
        });
    }

    Ok(RunResult { outcomes, compile_error: None })
}

// ── Tauri commands ────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn run_sample_tests(
    db: State<'_, DbPool>,
    question_id: String,
    language: String,
    source_code: String,
) -> Result<RunResult, String> {
    let test_cases = fetch_test_cases(&db.0, &question_id, false).await?;

    if test_cases.is_empty() {
        return Ok(RunResult { outcomes: vec![], compile_error: None });
    }

    let backend = get_backend();
    run_cases(backend.as_ref(), &source_code, &language, &test_cases).await
}

#[tauri::command]
pub async fn submit_solution(
    db: State<'_, DbPool>,
    session_id: String,
    question_id: String,
    language: String,
    source_code: String,
) -> Result<SubmitResult, String> {
    let test_cases = fetch_test_cases(&db.0, &question_id, true).await?;

    let backend = get_backend();
    let run = run_cases(backend.as_ref(), &source_code, &language, &test_cases).await?;

    // If nothing compiled, score is 0
    if run.compile_error.is_some() {
        return Ok(SubmitResult {
            score: 0.0,
            total_tests: test_cases.len(),
            passed_tests: 0,
            outcomes: vec![],
        });
    }

    let total = run.outcomes.len();
    let passed = run.outcomes.iter().filter(|o| o.passed).count();
    let score = if total > 0 {
        (passed as f64 / total as f64) * 100.0
    } else {
        0.0
    };

    let now = Utc::now().to_rfc3339();

    // Persist each outcome to local evaluation_results
    for outcome in &run.outcomes {
        let result_id = Uuid::new_v4().to_string();
        sqlx::query(
            "INSERT INTO evaluation_results
               (id, session_id, question_id, language, test_case_id, passed, status,
                stdout, stderr, execution_time_ms, compile_error, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        )
        .bind(&result_id)
        .bind(&session_id)
        .bind(&question_id)
        .bind(&language)
        .bind(&outcome.test_case_id)
        .bind(outcome.passed as i64)
        .bind(&outcome.status)
        .bind(&outcome.stdout)
        .bind(&outcome.stderr)
        .bind(outcome.execution_time_ms as i64)
        .bind(&outcome.compile_error)
        .bind(&now)
        .execute(&db.0)
        .await
        .map_err(|e| e.to_string())?;
    }

    // Enqueue submission payload for server sync, deduplicated by session+question
    let hash_input = format!("{session_id}:{question_id}");
    let submission_hash: String = Sha256::digest(hash_input.as_bytes())
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect();

    let payload = json!({
        "session_id": session_id,
        "question_id": question_id,
        "language": language,
        "source_code": source_code,
        "score": score,
        "passed_tests": passed,
        "total_tests": total,
        "submitted_at": now,
        "outcomes": run.outcomes,
    })
    .to_string();

    let _ = enqueue(&db.0, "submission", &payload, Some(&submission_hash)).await;

    Ok(SubmitResult {
        score,
        total_tests: total,
        passed_tests: passed,
        outcomes: run.outcomes,
    })
}
