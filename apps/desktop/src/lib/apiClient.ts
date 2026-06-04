import type {
  Question,
  Token,
  Assessment,
  AssessmentQuestion,
  TokenValidationResult,
} from '@secureassess/shared-types'
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

// ── Raw API shapes for validate token response ────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RawRecord = Record<string, any>

// ── Mappers ───────────────────────────────────────────────────────────────────

function toQuestion(q: ApiQuestion): Question {
  return {
    id: q.id,
    title: q.title,
    description: q.description,
    difficulty: q.difficulty,
    timeLimitMs: q.time_limit_ms,
    memoryLimitMb: q.memory_limit_mb,
    isManuallyScored: false,
    sampleTests: (q.test_cases ?? []).map((tc) => ({
      id: tc.id,
      input: tc.input,
      expectedOutput: tc.expected_output,
      isHidden: tc.is_hidden,
    })),
  }
}

function normalizeToken(raw: RawRecord): Token {
  return {
    id:             raw['id'],
    candidateEmail: raw['candidateEmail'] ?? raw['candidate_email'] ?? '',
    candidateName:  raw['candidateName']  ?? raw['candidate_name']  ?? '',
    assessmentId:   raw['assessmentId']   ?? raw['assessment_id']   ?? '',
    mockIds:        raw['mockIds']        ?? raw['mock_ids']         ?? [],
    expiryAt:       raw['expiryAt']       ?? raw['expiry_at']        ?? '',
    usageLimit:     raw['usageLimit']     ?? raw['usage_limit']      ?? 1,
    usedCount:      raw['usedCount']      ?? raw['used_count']       ?? 0,
    tokenValue:     raw['tokenValue']     ?? raw['token_value']      ?? '',
    organizationId: raw['organizationId'] ?? raw['organization_id'],
    createdBy:      raw['createdBy']      ?? raw['created_by']       ?? '',
    createdAt:      raw['createdAt']      ?? raw['created_at']       ?? '',
    notes:          raw['notes'],
  }
}

function normalizeAssessment(raw: RawRecord): Assessment {
  // questions array from /tokens/validate is a flat list of question objects
  const rawQuestions: RawRecord[] = raw['questions'] ?? []
  const questions: AssessmentQuestion[] = rawQuestions.map((q, i) => ({
    id: null,
    weightage: 0,
    orderIndex: i,
    question: {
      id:               q['id'] ?? '',
      title:            q['title'] ?? '',
      description:      q['description'] ?? '',
      type:             q['type'] ?? 'coding',
      difficulty:       q['difficulty'],
      timeLimitMs:      q['time_limit_ms']   ?? q['timeLimitMs']   ?? 5000,
      memoryLimitMb:    q['memory_limit_mb'] ?? q['memoryLimitMb'] ?? 256,
      isManuallyScored: q['type'] === 'text',
      options:          q['options'],
      sampleTests:      (q['test_cases'] ?? q['sampleTests'] ?? []).map((tc: RawRecord) => ({
        id:             tc['id'],
        input:          tc['input'],
        expectedOutput: tc['expected_output'] ?? tc['expectedOutput'] ?? '',
        isHidden:       tc['is_hidden']       ?? tc['isHidden']       ?? false,
      })),
    },
  }))

  return {
    id:           raw['id'],
    title:        raw['title'] ?? '',
    description:  raw['description'],
    type:         raw['assessment_type'] ?? raw['type'] ?? 'open',
    deadlineAt:   raw['deadline_at']   ?? raw['deadlineAt'],
    windowStart:  raw['window_start']  ?? raw['windowStart'],
    windowEnd:    raw['window_end']    ?? raw['windowEnd'],
    timezone:     raw['timezone']      ?? 'UTC',
    durationMins: raw['duration_minutes'] ?? raw['durationMins'] ?? 0,
    isMock:       raw['is_mock']       ?? raw['isMock']       ?? false,
    questions,
    createdAt:    raw['created_at']    ?? raw['createdAt']    ?? '',
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

export async function validateToken(tokenValue: string): Promise<TokenValidationResult> {
  const res = await fetch(`${BASE}/tokens/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_value: tokenValue }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { detail?: string }).detail ?? `Request failed: ${res.status}`)
  }

  const raw: RawRecord = await res.json()

  if (!raw['valid']) {
    return { valid: false, reason: raw['reason'] ?? 'not_found' }
  }

  return {
    valid:      true,
    token:      normalizeToken(raw['token'] ?? {}),
    assessment: normalizeAssessment(raw['assessment'] ?? {}),
    mocks:      (raw['mocks'] ?? []).map((m: RawRecord) => normalizeAssessment(m)),
  }
}

export async function fetchAssessmentWithQuestions(): Promise<{
  assessment: ApiAssessment
  questions: Question[]
}> {
  const assessment = await fetchMyAssessment()
  const questions = await Promise.all(assessment.question_ids.map(fetchQuestion))
  return { assessment, questions }
}
