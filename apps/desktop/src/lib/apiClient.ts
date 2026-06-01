import type { Question } from '@secureassess/shared-types'
import { useAssessmentStore } from '../store/assessmentStore'

const BASE = import.meta.env.VITE_API_BASE_URL as string

function authHeaders(): Record<string, string> {
  const token = useAssessmentStore.getState().authToken
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders() })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const resBody = await res.json().catch(() => ({}))
    throw new Error((resBody as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── API shapes (snake_case from FastAPI) ─────────────────────────────────────

interface ApiAssessment {
  id: string
  title: string
  duration_minutes: number
  allowed_languages: string[]
  question_ids: string[]
  security_level: string
  status: string
}

interface ApiTestCase {
  id: string
  input: string
  expected_output: string
  is_hidden: boolean
}

interface ApiQuestion {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  time_limit_ms: number
  memory_limit_mb: number
  type: string
  tags: string[]
  test_cases: ApiTestCase[]
}

// ── Mappers ──────────────────────────────────────────────────────────────────

function toQuestion(q: ApiQuestion): Question {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    timeLimitMs: q.time_limit_ms,
    memoryLimitMb: q.memory_limit_mb,
    sampleTests: q.test_cases.map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expected_output,
      isHidden: tc.is_hidden,
    })),
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export type { ApiAssessment }

export async function createServerSession(
  sessionId: string,
  assessmentId: string,
  assessmentTitle: string,
  totalQuestions: number,
): Promise<void> {
  await apiPost('/sessions', {
    session_id: sessionId,
    assessment_id: assessmentId,
    assessment_title: assessmentTitle,
    total_questions: totalQuestions,
  })
}

export async function fetchMyAssessment(): Promise<ApiAssessment> {
  return apiFetch<ApiAssessment>('/assessments/my')
}

export async function fetchQuestion(id: string): Promise<Question> {
  const q = await apiFetch<ApiQuestion>(`/questions/${id}`)
  return toQuestion(q)
}

export async function fetchAssessmentWithQuestions(): Promise<{
  assessment: ApiAssessment
  questions: Question[]
}> {
  const assessment = await fetchMyAssessment()
  const questions = await Promise.all(assessment.question_ids.map(fetchQuestion))
  return { assessment, questions }
}
