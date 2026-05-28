const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text)
  }
  return res.json() as Promise<T>
}

// ── Assessments ───────────────────────────────────────────────────────────────

export interface Assessment {
  id: string
  title: string
  status: 'active' | 'archived'
  duration_minutes: number
  allowed_languages: string[]
  security_level: 'standard' | 'strict'
  candidate_count: number
  created_at: string
}

export interface CreateAssessmentBody {
  title: string
  duration_minutes: number
  allowed_languages: string[]
  security_level: 'standard' | 'strict'
  question_ids: string[]
}

export interface AssessmentDetail extends Assessment {
  candidates: CandidateRow[]
}

export interface CandidateRow {
  id: string
  name: string
  email: string
  status: 'not_started' | 'in_progress' | 'completed'
  score: number | null
}

export const assessmentsApi = {
  list: () => apiFetch<Assessment[]>('/assessments'),
  create: (body: CreateAssessmentBody) =>
    apiFetch<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(body) }),
  get: (id: string) => apiFetch<AssessmentDetail>(`/assessments/${id}`),
  patch: (id: string, body: Partial<CreateAssessmentBody>) =>
    apiFetch<Assessment>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id: string) =>
    apiFetch<Assessment>(`/assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' }),
    }),
}

// ── Questions ─────────────────────────────────────────────────────────────────

export interface Question {
  id: string
  title: string
  type: 'coding' | 'debugging' | 'sql' | 'mcq' | 'system_design'
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  time_limit_ms: number
  memory_limit_mb: number
  created_at: string
}

export interface TestCase {
  input: string
  expected_output: string
  is_hidden: boolean
}

export interface CreateQuestionBody {
  title: string
  description: string
  type: Question['type']
  difficulty: Question['difficulty']
  time_limit_ms: number
  memory_limit_mb: number
  tags: string[]
  test_cases: TestCase[]
}

export const questionsApi = {
  list: (params?: { type?: string; difficulty?: string; tags?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)),
    ).toString()
    return apiFetch<Question[]>(`/questions${qs ? `?${qs}` : ''}`)
  },
  create: (body: CreateQuestionBody) =>
    apiFetch<Question>('/questions', { method: 'POST', body: JSON.stringify(body) }),
  get: (id: string) => apiFetch<Question>(`/questions/${id}`),
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface Session {
  id: string
  candidate_id: string
  candidate_name: string
  candidate_email: string
  assessment_id: string
  assessment_title: string
  status: 'active' | 'idle' | 'completed' | 'terminated'
  questions_done: number
  total_questions: number
  violation_count: number
  started_at: string
}

export interface SecurityEvent {
  id: string
  type: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface SessionDetail extends Session {
  security_events: SecurityEvent[]
}

export const sessionsApi = {
  list: (status?: string) =>
    apiFetch<Session[]>(`/sessions${status ? `?status=${status}` : ''}`),
  get: (id: string) => apiFetch<SessionDetail>(`/sessions/${id}`),
  terminate: (id: string) =>
    apiFetch<{ ok: boolean }>(`/sessions/${id}/terminate`, { method: 'POST' }),
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface Report {
  session_id: string
  candidate_name: string
  candidate_email: string
  assessment_title: string
  final_score: number
  submissions: SubmissionRow[]
  violations: ViolationSummary[]
}

export interface SubmissionRow {
  question_id: string
  question_title: string
  submitted_at: string
  score: number
  passed_tests: number
  total_tests: number
}

export interface ViolationSummary {
  type: string
  count: number
  first_occurrence: string
}

export const reportsApi = {
  get: (sessionId: string) => apiFetch<Report>(`/reports/${sessionId}`),
}
