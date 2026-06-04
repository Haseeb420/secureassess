import type {
  QuestionForCandidate,
  StartAttemptResponse,
  SubmitAnswerRequest,
  SubmitAnswerResponse,
  CompleteAttemptResponse,
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

interface ApiStartAttemptResponse {
  attempt_id: string
  questions: ApiQuestion[]
}

interface ApiSubmitAnswerResponse {
  question_id: string
  accepted: boolean
  next_question_available: boolean
}

interface ApiCompleteAttemptResponse {
  final_score: number
  total_time_secs: number
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

// ── Public API ────────────────────────────────────────────────────────────────

export async function startAttempt(tokenValue: string): Promise<StartAttemptResponse> {
  const res = await fetch(`${BASE}/attempts/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_value: tokenValue }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Start attempt failed: ${res.status}`)
  }

  const data: ApiStartAttemptResponse = await res.json()
  const response: StartAttemptResponse = {
    attemptId: data.attempt_id,
    questions: data.questions.map(toQuestionForCandidate),
  }

  useAssessmentStore.getState().setAttempt(response.attemptId, response.questions)
  return response
}

export async function submitAnswer(params: SubmitAnswerRequest): Promise<SubmitAnswerResponse> {
  const res = await fetch(`${BASE}/attempts/${params.attemptId}/answers`, {
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
    }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Submit answer failed: ${res.status}`)
  }

  const data: ApiSubmitAnswerResponse = await res.json()
  const response: SubmitAnswerResponse = {
    questionId:            data.question_id,
    accepted:              data.accepted,
    nextQuestionAvailable: data.next_question_available,
  }

  if (response.accepted) {
    const store = useAssessmentStore.getState()
    store.markQuestionSubmitted(response.questionId)
    store.advanceQuestion()
  }

  return response
}

export async function completeAttempt(attemptId: string): Promise<CompleteAttemptResponse> {
  const res = await fetch(`${BASE}/attempts/${attemptId}/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Complete attempt failed: ${res.status}`)
  }

  const data: ApiCompleteAttemptResponse = await res.json()
  const response: CompleteAttemptResponse = {
    finalScore:    data.final_score,
    totalTimeSecs: data.total_time_secs,
  }

  useAssessmentStore.getState().setFinalScore(response.finalScore)
  return response
}
