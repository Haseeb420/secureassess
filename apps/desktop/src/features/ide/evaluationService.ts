import { invoke } from '@tauri-apps/api/core'

export interface TestCaseOutcome {
  test_case_id: string
  passed: boolean
  stdout: string
  stderr: string
  execution_time_ms: number
  status: string
  compile_error: string | null
}

export interface RunResult {
  outcomes: TestCaseOutcome[]
  compile_error: string | null
}

export interface SubmitResult {
  score: number
  total_tests: number
  passed_tests: number
  outcomes: TestCaseOutcome[]
}

export function runSampleTests(
  questionId: string,
  language: string,
  sourceCode: string,
): Promise<RunResult> {
  return invoke<RunResult>('run_sample_tests', { questionId, language, sourceCode })
}

export function submitSolution(
  sessionId: string,
  questionId: string,
  language: string,
  sourceCode: string,
): Promise<SubmitResult> {
  return invoke<SubmitResult>('submit_solution', { sessionId, questionId, language, sourceCode })
}
