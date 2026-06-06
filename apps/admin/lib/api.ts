import { getSession } from './auth-client'

// Always use the Next.js proxy path so browser requests are same-origin.
// next.config.ts rewrites /api/backend/* → FastAPI (localhost:8000) server-side.
const BASE = '/api/backend'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await getSession()
  // Use the Better Auth session token as a Bearer token for the FastAPI backend.
  // FastAPI validates it by looking up the token in the `session` table.
  const token = data?.session?.token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const authHeader = await getAuthHeader()
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...authHeader, ...init?.headers },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new ApiError(text, res.status)
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
  assessment_type: 'open' | 'deadline' | 'window'
  deadline_at?: string
  window_start?: string
  window_end?: string
  timezone: string
  is_mock: boolean
}

export interface AssessmentQuestionInput {
  question_id: string
  weightage: number
  order_index: number
}

export interface AssessmentQuestion {
  id: string | null
  question: Question
  weightage: number
  order_index: number
}

export interface CreateAssessmentBody {
  title: string
  duration_minutes: number
  allowed_languages: string[]
  security_level: 'standard' | 'strict'
  questions: AssessmentQuestionInput[]
  assessment_type?: 'open' | 'deadline' | 'window'
  deadline_at?: string
  window_start?: string
  window_end?: string
  timezone?: string
  is_mock?: boolean
}

export interface PatchAssessmentBody {
  title?: string
  duration_minutes?: number
  allowed_languages?: string[]
  security_level?: string
  questions?: AssessmentQuestionInput[]
  question_ids?: string[]
  status?: string
  assessment_type?: 'open' | 'deadline' | 'window'
  deadline_at?: string
  window_start?: string
  window_end?: string
  timezone?: string
}

export interface AssessmentDetail extends Assessment {
  question_ids: string[]
  assessment_questions: AssessmentQuestion[]
  candidates: CandidateRow[]
}

export interface CandidateRow {
  id: string
  session_id: string
  name: string
  email: string
  status: 'not_started' | 'in_progress' | 'completed' | 'submitted' | 'abandoned' | 'terminated' | string
  score: number | null
}

export interface Invite {
  id: string
  token_value: string
  candidate_email: string
  candidate_name: string
  expiry_at: string         // ISO datetime
  usage_limit: number
  used_count: number
  is_revoked: boolean
  mock_ids: string[]
  notes: string | null
  assessment_id: string
  created_by: string
  created_at: string
  assessment_title?: string
}

export interface CreateInviteBody {
  candidate_email: string
  candidate_name: string
  mock_ids?: string[]
  expiry_at: string         // ISO datetime
  usage_limit?: number
  notes?: string | null
}

export const assessmentsApi = {
  list: () => apiFetch<Assessment[]>('/assessments'),
  create: (body: CreateAssessmentBody) =>
    apiFetch<Assessment>('/assessments', { method: 'POST', body: JSON.stringify(body) }),
  get: (id: string) => apiFetch<AssessmentDetail>(`/assessments/${id}`),
  patch: (id: string, body: PatchAssessmentBody) =>
    apiFetch<Assessment>(`/assessments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  archive: (id: string) =>
    apiFetch<Assessment>(`/assessments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'archived' }),
    }),
  listInvites: (id: string) => apiFetch<Invite[]>(`/assessments/${id}/invites`),
  createInvite: (id: string, body: CreateInviteBody) =>
    apiFetch<Invite>(`/assessments/${id}/invites`, { method: 'POST', body: JSON.stringify(body) }),
}

// ── Questions ─────────────────────────────────────────────────────────────────

export interface McqOption {
  id: string
  text: string
  is_correct: boolean
}

export interface Question {
  id: string
  title: string
  type: 'coding' | 'mcq' | 'text' | 'debugging' | 'sql' | 'system_design'
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
  time_limit_ms?: number
  memory_limit_mb?: number
  tags?: string[]
  test_cases?: TestCase[]
  options?: McqOption[]
}

export interface QuestionDetail extends Question {
  description: string
  options: McqOption[]
  test_cases: (TestCase & { id: string })[]
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
  get: (id: string) => apiFetch<QuestionDetail>(`/questions/${id}`),
  update: (id: string, body: CreateQuestionBody) =>
    apiFetch<Question>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
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

export interface AssessmentSummary {
  assessment_id: string
  assessment_title: string
  assessment_status: string
  created_at: string
  total_appeared: number
  total_completed: number
  passed: number
  failed: number
  in_progress: number
  abandoned: number
  avg_score: number | null
  pass_rate: number | null
}

export const reportsApi = {
  get: (sessionId: string) => apiFetch<Report>(`/reports/${sessionId}`),
  assessmentSummary: (passThreshold = 50) =>
    apiFetch<AssessmentSummary[]>(`/reports/assessments?pass_threshold=${passThreshold}`),
}

// ── Tokens ────────────────────────────────────────────────────────────────────

export interface Token {
  id: string
  candidate_email: string
  candidate_name: string
  assessment_id: string
  mock_ids: string[]
  expiry_at: string
  usage_limit: number
  used_count: number
  token_value: string
  created_by: string
  created_at: string
  notes: string | null
  is_revoked: boolean
  assessment_title?: string
}

export interface CreateTokenBody {
  candidate_email: string
  candidate_name: string
  assessment_id: string
  mock_ids?: string[]
  expiry_at: string
  usage_limit: number
  notes?: string | null
}

export interface PatchTokenBody {
  expiry_at?: string
  usage_limit?: number
  mock_ids?: string[]
  notes?: string | null
}

export const tokensApi = {
  list: (params?: { assessment_id?: string; active?: boolean }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(
        Object.entries(params ?? {})
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => [k, String(v)]),
      ),
    ).toString()
    return apiFetch<Token[]>(`/tokens${qs ? `?${qs}` : ''}`)
  },
  create: (body: CreateTokenBody) =>
    apiFetch<Token>('/tokens', { method: 'POST', body: JSON.stringify(body) }),
  get: (id: string) => apiFetch<Token>(`/tokens/${id}`),
  patch: (id: string, body: PatchTokenBody) =>
    apiFetch<Token>(`/tokens/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  revoke: (id: string) =>
    apiFetch<void>(`/tokens/${id}`, { method: 'DELETE' }),
  bulkRevoke: (ids: string[]) =>
    apiFetch<{ revoked: number }>('/tokens/bulk-revoke', { method: 'POST', body: JSON.stringify({ token_ids: ids }) }),
  bulkDelete: (ids: string[]) =>
    apiFetch<{ deleted: number }>('/tokens/bulk-delete', { method: 'POST', body: JSON.stringify({ token_ids: ids }) }),
}

// ── Attempts ──────────────────────────────────────────────────────────────────

export interface TestResult {
  input?: string
  expected_output?: string
  actual_output?: string
  passed: boolean
  time_ms?: number
  is_hidden?: boolean
}

export interface AnswerDetail {
  id: string
  question_id: string
  question_type: 'coding' | 'mcq' | 'text'
  answer_text?: string
  selected_option?: string
  source_code?: string
  language?: string
  test_results?: TestResult[]
  auto_score?: number
  manual_score?: number
  weighted_score?: number
  is_correct?: boolean
  submitted_at: string
  question_title?: string
  question_weightage?: number
  order_index?: number
  question_options?: McqOption[]
}

export interface AttemptListItem {
  id: string
  assessment_id: string
  assessment_title?: string
  candidate_email: string
  candidate_name: string
  status: 'in_progress' | 'completed' | 'abandoned' | 'timed_out'
  started_at: string
  completed_at?: string
  final_score?: number
  total_time_secs?: number
  attempt_number: number
  token_id?: string
  usage_limit?: number
  has_pending_review: boolean
  questions_answered?: number
  total_questions?: number
  duration_minutes?: number
}

export interface AttemptDetail extends AttemptListItem {
  answers: AnswerDetail[]
}

export const attemptsApi = {
  list: (params?: { assessment_id?: string; status?: string; date_from?: string; date_to?: string }) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v)),
    ).toString()
    return apiFetch<AttemptListItem[]>(`/attempts${qs ? `?${qs}` : ''}`)
  },
  get: (id: string) => apiFetch<AttemptDetail>(`/attempts/${id}`),
  scoreAnswer: (attemptId: string, answerId: string, manualScore: number) =>
    apiFetch<{ answer_id: string; manual_score: number; weighted_score: number; new_final_score: number }>(
      `/attempts/${attemptId}/answers/${answerId}/score`,
      { method: 'PATCH', body: JSON.stringify({ manual_score: manualScore }) },
    ),
}
