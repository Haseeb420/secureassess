import { useEffect, useRef, useState } from 'react'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { toast } from 'sonner'
import { onFocusLoss, onProcessViolation } from './securityService'
import type { ForbiddenProcess, FocusLossPayload } from './securityService'

export type SecurityViolation =
  | { kind: 'focus-loss'; payload: FocusLossPayload }
  | { kind: 'process'; payload: ForbiddenProcess }

interface UseSecurityMonitorReturn {
  violationCount: number
  lastViolation: SecurityViolation | null
}

export function useSecurityMonitor({ enabled }: { enabled: boolean }): UseSecurityMonitorReturn {
  const [violationCount, setViolationCount] = useState(0)
  const [lastViolation, setLastViolation] = useState<SecurityViolation | null>(null)
  const unlistenRefs = useRef<UnlistenFn[]>([])

  useEffect(() => {
    if (!enabled) return

    const register = async () => {
      const unFocus = await onFocusLoss((payload) => {
        setLastViolation({ kind: 'focus-loss', payload })
        setViolationCount((c) => c + 1)
        toast.warning('Violation detected: focus-loss')
      })

      const unProcess = await onProcessViolation((payload) => {
        setLastViolation({ kind: 'process', payload })
        setViolationCount((c) => c + 1)
        toast.warning(`Violation detected: ${payload.name}`)
      })

      unlistenRefs.current = [unFocus, unProcess]
    }

    register()

    return () => {
      unlistenRefs.current.forEach((fn) => fn())
      unlistenRefs.current = []
    }
  }, [enabled])

  return { violationCount, lastViolation }
}
