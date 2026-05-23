import { create } from 'zustand'
import type { Candidate } from '@secureassess/shared-types'

type AssessmentStatus = 'idle' | 'validating' | 'active' | 'completed'

interface AssessmentState {
  candidateId: string | null
  assessmentId: string | null
  status: AssessmentStatus
  timerSeconds: number
  candidate: Candidate | null
  authToken: string | null
  setCandidate: (id: string) => void
  setAssessment: (id: string) => void
  setStatus: (status: AssessmentStatus) => void
  setTimer: (seconds: number) => void
  decrementTimer: () => void
  setCandidateData: (candidate: Candidate) => void
  setAuthToken: (token: string) => void
  clearAuth: () => void
  reset: () => void
}

const initialState = {
  candidateId: null,
  assessmentId: null,
  status: 'idle' as AssessmentStatus,
  timerSeconds: 0,
  candidate: null,
  authToken: null,
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
  reset: () => set(initialState),
}))
