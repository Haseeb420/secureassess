import { useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'

interface TimerPersistenceProps {
  sessionId: string | null
  timerSeconds: number
}

export function useTimerPersistence({ sessionId, timerSeconds }: TimerPersistenceProps) {
  const timerRef = useRef(timerSeconds)
  timerRef.current = timerSeconds

  useEffect(() => {
    if (!sessionId) return
    const id = setInterval(() => {
      invoke('save_session_state', {
        sessionId,
        status: 'active',
        timerRemainingSecs: timerRef.current,
      })
    }, 10_000)
    return () => clearInterval(id)
  }, [sessionId])
}
