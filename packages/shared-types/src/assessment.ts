export interface TestCase {
  id: string
  input: string
  expectedOutput: string
  isHidden: boolean
}

export interface Question {
  id: string
  title: string
  description: string // markdown
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimitMs: number
  memoryLimitMb: number
  sampleTests: TestCase[]
}

export interface ExecutionResult {
  testCaseId: string
  passed: boolean
  stdout: string
  stderr: string
  executionTimeMs: number
  memoryUsedMb: number
  status:
    | 'accepted'
    | 'wrong_answer'
    | 'time_limit'
    | 'runtime_error'
    | 'compile_error'
}

export interface SubmissionResult {
  score: number // 0-100
  totalTests: number
  passedTests: number
  results: ExecutionResult[]
}
