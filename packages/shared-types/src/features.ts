import type { TestCase } from './assessment'

// ─── TOKEN ───────────────────────────────────────────────────────────────────

export type Token = {
  id:             string
  candidateEmail: string
  candidateName:  string
  assessmentId:   string
  mockIds:        string[]
  expiryAt:       string        // ISO datetime
  usageLimit:     number
  usedCount:      number
  tokenValue:     string
  organizationId?: string
  createdBy:      string
  createdAt:      string
  notes?:         string
}

export type TokenValidationResult =
  | { valid: true;  token: Token; assessment: Assessment; mocks: Assessment[] }
  | { valid: false; reason: 'expired' | 'usage_limit_reached' | 'not_found' | 'assessment_closed' }

// ─── ASSESSMENT ──────────────────────────────────────────────────────────────

export type AssessmentType = 'open' | 'deadline' | 'window'

export type Assessment = {
  id:           string
  title:        string
  description?: string
  type:         AssessmentType
  deadlineAt?:  string
  windowStart?: string
  windowEnd?:   string
  timezone:     string
  durationMins: number
  isMock:       boolean
  questions:    Question[]
  createdAt:    string
}

export type AssessmentStatus =
  | 'not_started'
  | 'active'
  | 'upcoming'       // window hasn't opened yet
  | 'closed'         // past deadline or window closed
  | 'completed'      // candidate finished this attempt

// ─── QUESTION ────────────────────────────────────────────────────────────────

export type QuestionType = 'coding' | 'mcq' | 'text'

export type MCQOption = {
  id:        string
  text:      string
  isCorrect: boolean
}

export type Question = {
  id:               string
  title:            string
  description:      string
  type:             QuestionType
  weightage:        number       // 0–100; all questions in an assessment must sum to 100
  timeLimitMs:      number
  memoryLimitMb:    number
  isManuallyScored: boolean      // text questions only
  options?:         MCQOption[]  // MCQ only
  sampleTests?:     TestCase[]   // coding only (visible to candidate)
  hiddenTests?:     TestCase[]   // coding only (never sent to candidate)
}

// ─── TEST CASE RESULT ────────────────────────────────────────────────────────

export type TestCaseResult = {
  testCaseId: string
  passed:     boolean
  timeMsec:   number
  memoryMb:   number
}

// ─── ATTEMPT ─────────────────────────────────────────────────────────────────

export type AttemptStatus = 'in_progress' | 'completed' | 'abandoned' | 'timed_out'

export type AssessmentAttempt = {
  id:             string
  tokenId:        string
  assessmentId:   string
  candidateEmail: string
  candidateName:  string
  startedAt:      string
  completedAt?:   string
  status:         AttemptStatus
  finalScore?:    number
  totalTimeSecs?: number
  attemptNumber:  number
}

export type MockAttempt = {
  id:             string
  tokenId:        string
  mockId:         string
  candidateEmail: string
  startedAt:      string
  completedAt?:   string
  status:         'in_progress' | 'completed' | 'abandoned'
}

// ─── ANSWERS ─────────────────────────────────────────────────────────────────

export type QuestionAnswer = {
  id:              string
  attemptId:       string
  questionId:      string
  questionType:    QuestionType
  // candidate input
  answerText?:     string
  selectedOption?: string
  sourceCode?:     string
  language?:       string
  submittedAt:     string
  // scores (populated server-side after evaluation)
  autoScore?:      number
  manualScore?:    number
  isCorrect?:      boolean
  testResults?:    TestCaseResult[]
  weightedScore?:  number
}

// ─── RESULTS ─────────────────────────────────────────────────────────────────

export type CandidateResult = {
  attemptId:     string
  finalScore:    number
  completedAt:   string
  totalTimeSecs: number
}

export type ResultBreakdownItem = {
  questionId:    string
  questionTitle: string
  questionType:  QuestionType
  weightage:     number
  score:         number
  weightedScore: number
}

export type AdminResult = CandidateResult & {
  answers:   QuestionAnswer[]
  questions: Question[]
  breakdown: ResultBreakdownItem[]
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────

export type LandingPageData = {
  token:             Token
  assessment:        Assessment
  assessmentStatus:  AssessmentStatus
  countdownToMs?:    number           // ms until window opens (if upcoming)
  mocks:             Assessment[]
  previousAttempts:  AssessmentAttempt[]
}
