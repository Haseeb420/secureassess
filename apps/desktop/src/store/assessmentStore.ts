import { create } from 'zustand'
import type { Candidate } from '@secureassess/shared-types'
import { defaultTemplates, type Language } from '../features/ide/templates'
import type { OutputLine } from '../features/ide/ConsoleOutput'

type AssessmentStatus = 'idle' | 'validating' | 'active' | 'completed'

interface AssessmentState {
  candidateId: string | null
  assessmentId: string | null
  status: AssessmentStatus
  timerSeconds: number
  candidate: Candidate | null
  authToken: string | null
  currentLanguage: Language
  codeByLanguage: Record<Language, string>
  consoleOutput: OutputLine[]
  setCandidate: (id: string) => void
  setAssessment: (id: string) => void
  setStatus: (status: AssessmentStatus) => void
  setTimer: (seconds: number) => void
  decrementTimer: () => void
  setCandidateData: (candidate: Candidate) => void
  setAuthToken: (token: string) => void
  clearAuth: () => void
  setLanguage: (lang: Language) => void
  setCode: (lang: Language, code: string) => void
  appendOutput: (line: OutputLine) => void
  clearOutput: () => void
  reset: () => void
}

const initialState = {
  candidateId: null,
  assessmentId: null,
  status: 'idle' as AssessmentStatus,
  timerSeconds: 0,
  candidate: null,
  authToken: null,
  currentLanguage: 'python' as Language,
  codeByLanguage: { ...defaultTemplates },
  consoleOutput: [] as OutputLine[],
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  ...initialState,
  setCandidate: (id) => set({ candidateId: id }),
  setAssessment: (id) => set({ assessmentId: id }),
  setStatus: (status) => set({ status }),
  setTimer: (seconds) => set({ timerSeconds: seconds }),
  decrementTimer: () =>
    set((state) => ({ timerSeconds: Math.max(0, state.timerSeconds - 1) })),
  setCandidateData: (candidate) => set({ candidate, candidateId: candidate.id }),
  setAuthToken: (token) => set({ authToken: token }),
  clearAuth: () => set({ candidate: null, authToken: null, candidateId: null }),
  setLanguage: (lang) => set({ currentLanguage: lang }),
  setCode: (lang, code) =>
    set((state) => ({
      codeByLanguage: { ...state.codeByLanguage, [lang]: code },
    })),
  appendOutput: (line) =>
    set((state) => ({ consoleOutput: [...state.consoleOutput, line] })),
  clearOutput: () => set({ consoleOutput: [] }),
  reset: () => set(initialState),
}))
