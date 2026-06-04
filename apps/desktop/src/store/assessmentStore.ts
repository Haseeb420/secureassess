import { create } from 'zustand'
import type {
  Candidate,
  QuestionForCandidate,
  MockQuestionResult,
  Token,
  LandingPageData,
  Assessment,
  QuestionAnswer,
} from '@secureassess/shared-types'
import { defaultTemplates, type Language } from '../features/ide/templates'
import type { OutputLine } from '../features/ide/ConsoleOutput'

type SessionStatus = 'idle' | 'validating' | 'active' | 'completed'

interface AssessmentState {
  candidateId: string | null
  assessmentId: string | null
  sessionId: string | null
  assessmentTitle: string | null
  status: SessionStatus
  timerSeconds: number
  timerTotalSeconds: number
  candidate: Candidate | null
  authToken: string | null
  questions: QuestionForCandidate[]
  currentQuestionIndex: number
  currentLanguage: Language
  codeByLanguage: Record<Language, string>
  consoleOutput: OutputLine[]

  // Landing page / token flow
  token: Token | null
  landingData: LandingPageData | null
  mocks: Assessment[]
  currentAttemptId: string | null
  currentQuestionIdx: number
  submittedQuestions: Set<string>
  finalScore: number | null
  answers: Record<string, QuestionAnswer>

  // Mock assessment flow
  isMock: boolean
  mockAttemptId: string | null
  mockResults: MockQuestionResult[] | null

  setCandidate: (id: string) => void
  setAssessment: (id: string) => void
  setSessionId: (id: string) => void
  setStatus: (status: SessionStatus) => void
  setTimer: (seconds: number) => void
  setTimerTotal: (seconds: number) => void
  decrementTimer: () => void
  setCandidateData: (candidate: Candidate) => void
  setAuthToken: (token: string) => void
  clearAuth: () => void
  setAssessmentData: (id: string, title: string, durationMinutes: number) => void
  setQuestions: (questions: QuestionForCandidate[]) => void
  setCurrentQuestionIndex: (index: number) => void
  setLanguage: (lang: Language) => void
  setCode: (lang: Language, code: string) => void
  appendOutput: (line: OutputLine) => void
  clearOutput: () => void
  reset: () => void

  // Attempt flow actions
  setToken: (token: Token) => void
  setLandingData: (data: LandingPageData) => void
  setAttempt: (attemptId: string, questions: QuestionForCandidate[]) => void
  advanceQuestion: () => void
  markQuestionSubmitted: (questionId: string) => void
  setFinalScore: (score: number) => void
  setCurrentAttemptId: (id: string) => void
  setCurrentQuestionIdx: (idx: number) => void
  saveAnswer: (questionId: string, answer: Partial<QuestionAnswer>) => void
  clearAttempt: () => void

  // Mock flow actions
  setIsMock: (value: boolean) => void
  setMockAttemptId: (id: string | null) => void
  setMockResults: (results: MockQuestionResult[]) => void
}

const initialState = {
  candidateId: null,
  assessmentId: null,
  sessionId: null,
  assessmentTitle: null,
  status: 'idle' as SessionStatus,
  timerSeconds: 0,
  timerTotalSeconds: 3600,
  candidate: null,
  authToken: null,
  questions: [] as QuestionForCandidate[],
  currentQuestionIndex: 0,
  currentLanguage: 'python' as Language,
  codeByLanguage: { ...defaultTemplates },
  consoleOutput: [] as OutputLine[],

  token: null,
  landingData: null,
  mocks: [] as Assessment[],
  currentAttemptId: null,
  currentQuestionIdx: 0,
  submittedQuestions: new Set<string>(),
  finalScore: null,
  answers: {} as Record<string, QuestionAnswer>,

  isMock: false,
  mockAttemptId: null,
  mockResults: null,
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  ...initialState,
  setCandidate: (id) => set({ candidateId: id }),
  setAssessment: (id) => set({ assessmentId: id }),
  setSessionId: (id) => set({ sessionId: id }),
  setStatus: (status) => set({ status }),
  setTimer: (seconds) => set({ timerSeconds: seconds }),
  setTimerTotal: (seconds) => set({ timerTotalSeconds: seconds }),
  decrementTimer: () =>
    set((state) => ({ timerSeconds: Math.max(0, state.timerSeconds - 1) })),
  setCandidateData: (candidate) => set({ candidate, candidateId: candidate.id }),
  setAuthToken: (token) => set({ authToken: token }),
  clearAuth: () => set({ candidate: null, authToken: null, candidateId: null }),
  setAssessmentData: (id, title, durationMinutes) =>
    set({
      assessmentId: id,
      assessmentTitle: title,
      timerSeconds: durationMinutes * 60,
      timerTotalSeconds: durationMinutes * 60,
    }),
  setQuestions: (questions) => set({ questions, currentQuestionIndex: 0 }),
  setCurrentQuestionIndex: (index) => set({ currentQuestionIndex: index }),
  setLanguage: (lang) => set({ currentLanguage: lang }),
  setCode: (lang, code) =>
    set((state) => ({
      codeByLanguage: { ...state.codeByLanguage, [lang]: code },
    })),
  appendOutput: (line) =>
    set((state) => ({ consoleOutput: [...state.consoleOutput, line] })),
  clearOutput: () => set({ consoleOutput: [] }),
  reset: () => set({ ...initialState, submittedQuestions: new Set<string>(), isMock: false, mockAttemptId: null, mockResults: null }),

  setToken: (token) => set({ token }),
  setLandingData: (data) => set({ landingData: data, mocks: data.mocks }),
  setAttempt: (attemptId, questions) =>
    set({
      currentAttemptId: attemptId,
      questions,
      currentQuestionIdx: 0,
      submittedQuestions: new Set<string>(),
    }),
  advanceQuestion: () =>
    set((state) => ({ currentQuestionIdx: state.currentQuestionIdx + 1 })),
  markQuestionSubmitted: (questionId) =>
    set((state) => ({
      submittedQuestions: new Set([...state.submittedQuestions, questionId]),
    })),
  setFinalScore: (score) => set({ finalScore: score }),
  setCurrentAttemptId: (id) => set({ currentAttemptId: id }),
  setCurrentQuestionIdx: (idx) => set({ currentQuestionIdx: idx }),
  saveAnswer: (questionId, answer) =>
    set((state) => ({
      answers: {
        ...state.answers,
        [questionId]: { ...state.answers[questionId], ...answer } as QuestionAnswer,
      },
    })),
  clearAttempt: () =>
    set({
      currentAttemptId: null,
      currentQuestionIdx: 0,
      submittedQuestions: new Set<string>(),
      finalScore: null,
      answers: {},
      consoleOutput: [],
      isMock: false,
      mockAttemptId: null,
      mockResults: null,
    }),

  setIsMock: (value) => set({ isMock: value }),
  setMockAttemptId: (id) => set({ mockAttemptId: id }),
  setMockResults: (results) => set({ mockResults: results }),
}))
