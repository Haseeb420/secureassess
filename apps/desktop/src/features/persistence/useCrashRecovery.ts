import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { useAssessmentStore } from '../../store/assessmentStore'

interface AssessmentSession {
  id: string
  assessment_id: string
  candidate_id: string
  status: string
  started_at: string
  timer_remaining_secs: number
  last_saved_at: string
}

interface UseCrashRecoveryReturn {
  showRecoveryModal: boolean
  activeSession: AssessmentSession | null
  confirmResume: () => Promise<void>
  confirmAbandon: () => Promise<void>
}

export function useCrashRecovery(): UseCrashRecoveryReturn {
  const navigate = useNavigate()
  const { currentLanguage, setCode, setTimer } = useAssessmentStore()
  const [showRecoveryModal, setShowRecoveryModal] = useState(false)
  const [activeSession, setActiveSession] = useState<AssessmentSession | null>(null)

  useEffect(() => {
    if (!('__TAURI_INTERNALS__' in window)) return
    invoke<AssessmentSession | null>('get_active_session').then((session) => {
      if (session && session.status === 'active') {
        setActiveSession(session)
        setShowRecoveryModal(true)
      }
    })
  }, [])

  const confirmResume = useCallback(async () => {
    if (!activeSession) return

    // Restore timer
    setTimer(activeSession.timer_remaining_secs)

    // Restore latest code snapshot for current language
    const code = await invoke<string | null>('get_code_snapshot', {
      sessionId: activeSession.id,
      questionId: 'q1', // placeholder until multi-question support in M8
      language: currentLanguage,
    })
    if (code) setCode(currentLanguage, code)

    setShowRecoveryModal(false)
    navigate('/assessment')
  }, [activeSession, currentLanguage, navigate, setCode, setTimer])

  const confirmAbandon = useCallback(async () => {
    if (!activeSession) return
    await invoke('mark_session_complete', { sessionId: activeSession.id })
    setShowRecoveryModal(false)
    setActiveSession(null)
    navigate('/login')
  }, [activeSession, navigate])

  return { showRecoveryModal, activeSession, confirmResume, confirmAbandon }
}
