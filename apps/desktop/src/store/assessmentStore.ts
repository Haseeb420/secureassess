import { create } from 'zustand'

type AssessmentStatus = 'idle' | 'validating' | 'active' | 'completed'

interface AssessmentState {
  candidateId: string | null
  assessmentId: string | null
  status: AssessmentStatus
  timerSeconds: number
  setCandidate: (id: string) => void
  setAssessment: (id: string) => void
  setStatus: (status: AssessmentStatus) => void
  setTimer: (seconds: number) => void
  decrementTimer: () => void
  reset: () => void
}

const initialState = {
  candidateId: null,
  assessmentId: null,
  status: 'idle' as AssessmentStatus,
  timerSeconds: 0,
}

export const useAssessmentStore = create<AssessmentState>((set) => ({
  ...initialState,
  setCandidate: (id) => set({ candidateId: id }),
  setAssessment: (id) => set({ assessmentId: id }),
  setStatus: (status) => set({ status }),
  setTimer: (seconds) => set({ timerSeconds: seconds }),
  decrementTimer: () =>
    set((state) => ({ timerSeconds: Math.max(0, state.timerSeconds - 1) })),
  reset: () => set(initialState),
}))
