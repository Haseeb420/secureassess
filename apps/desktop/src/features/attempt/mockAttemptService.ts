import type {
  CompleteMockResponse,
  MockAnswerRequest,
  MockQuestionResult,
  MockTestOutcome,
  QuestionForCandidate,
  StartAttemptResponse,
  TestCase,
} from '@secureassess/shared-types'
import { useAssessmentStore } from '../../store/assessmentStore'

const BASE = import.meta.env.VITE_API_BASE_URL as string

// ── API response shapes (snake_case from FastAPI) ─────────────────────────────

interface ApiSampleTest {
  id: string
  input: string
  expected_output: string
  is_hidden: boolean
}

interface ApiMcqOption {
  id: string
  text: string
}

interface ApiQuestion {
  id: string
  title: string
  description: string
  type: string
  difficulty?: 'easy' | 'medium' | 'hard'
  weightage: number
  order_index: number
  time_limit_ms: number
  memory_limit_mb: number
  options?: ApiMcqOption[]
  sample_tests?: ApiSampleTest[]
}

interface ApiStartMockResponse {
  attempt_id: string
  questions: ApiQuestion[]
}

interface ApiMockTestOutcome {
  index: number
  passed: boolean
  time_msec: number
  input: string
  expected_output: string
  actual_output: string
}

interface ApiMockQuestionResult {
  question_id: string
  question_title: string
  question_type: string
  your_answer: Record<string, unknown>
  is_correct?: boolean | null
  correct_option?: { id: string; text: string } | null
  test_outcomes?: ApiMockTestOutcome[]
  explanation?: string | null
}

interface ApiCompleteMockResponse {
  question_results: ApiMockQuestionResult[]
}

// ── Mappers ───────────────────────────────────────────────────────────────────

function toTestCase(tc: ApiSampleTest): TestCase {
  return {
    id: tc.id,
    input: tc.input,
    expectedOutput: tc.expected_output,
    isHidden: tc.is_hidden,
  }
}

function toQuestionForCandidate(q: ApiQuestion): QuestionForCandidate {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    type: q.type as QuestionForCandidate['type'],
    difficulty: q.difficulty,
    weightage: q.weightage,
    orderIndex: q.order_index,
    timeLimitMs: q.time_limit_ms,
    memoryLimitMb: q.memory_limit_mb,
    options: q.options,
    sampleTests: q.sample_tests?.map(toTestCase),
  }
}

function toMockTestOutcome(o: ApiMockTestOutcome): MockTestOutcome {
  return {
    index:          o.index,
    passed:         o.passed,
    timeMsec:       o.time_msec,
    input:          o.input,
    expectedOutput: o.expected_output,
    actualOutput:   o.actual_output,
  }
}

function toMockQuestionResult(r: ApiMockQuestionResult): MockQuestionResult {
  return {
    questionId:     r.question_id,
    questionTitle:  r.question_title,
    questionType:   r.question_type as MockQuestionResult['questionType'],
    yourAnswer:     r.your_answer as MockQuestionResult['yourAnswer'],
    isCorrect:      r.is_correct ?? null,
    correctOption:  r.correct_option ?? null,
    testOutcomes:   r.test_outcomes?.map(toMockTestOutcome),
    explanation:    r.explanation ?? null,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function startMock(
  tokenValue: string,
  mockId: string,
): Promise<StartAttemptResponse> {
  const res = await fetch(`${BASE}/mock-attempts/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_value: tokenValue, mock_id: mockId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Start mock failed: ${res.status}`)
  }
  const data: ApiStartMockResponse = await res.json()
  const response: StartAttemptResponse = {
    attemptId: data.attempt_id,
    questions: data.questions.map(toQuestionForCandidate),
  }
  const store = useAssessmentStore.getState()
  store.setIsMock(true)
  store.setMockAttemptId(response.attemptId)
  store.setAttempt(response.attemptId, response.questions)
  return response
}

export async function submitMockAnswer(
  params: MockAnswerRequest & {
    testOutcomes?: Array<{
      testCaseId: string
      passed: boolean
      timeMsec: number
      stdout?: string
      stderr?: string
    }>
  },
): Promise<{ accepted: boolean; next: boolean }> {
  const res = await fetch(`${BASE}/mock-attempts/${params.attemptId}/answers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      attempt_id:      params.attemptId,
      question_id:     params.questionId,
      question_type:   params.questionType,
      answer_text:     params.answerText ?? null,
      selected_option: params.selectedOption ?? null,
      source_code:     params.sourceCode ?? null,
      language:        params.language ?? null,
      test_results:    params.testResults ?? null,
      test_outcomes:   params.testOutcomes ?? null,
    }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Submit mock answer failed: ${res.status}`)
  }
  const data: { accepted: boolean; next_question_available: boolean } = await res.json()
  if (data.accepted) {
    const store = useAssessmentStore.getState()
    store.markQuestionSubmitted(params.questionId)
    store.advanceQuestion()
  }
  return { accepted: data.accepted, next: data.next_question_available }
}

export async function completeMock(attemptId: string): Promise<CompleteMockResponse> {
  const res = await fetch(`${BASE}/mock-attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Complete mock failed: ${res.status}`)
  }
  const data: ApiCompleteMockResponse = await res.json()
  const response: CompleteMockResponse = {
    questionResults: data.question_results.map(toMockQuestionResult),
  }
  useAssessmentStore.getState().setMockResults(response.questionResults)
  return response
}
