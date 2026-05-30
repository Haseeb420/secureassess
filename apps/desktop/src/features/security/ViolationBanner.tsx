import { useEffect, useState } from 'react'
import type { SecurityViolation } from './useSecurityMonitor'

interface ViolationBannerProps {
  violation: SecurityViolation | null
  violationCount: number
}

function getMessage(violation: SecurityViolation): string {
  if (violation.kind === 'focus-loss') {
    return '⚠ Focus loss detected. Return to the assessment.'
  }
  return `⚠ Unauthorized application detected: ${violation.payload.name}`
}

export function ViolationBanner({ violation, violationCount }: ViolationBannerProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useState<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!violation) return
    setVisible(true)

    if (timerRef[0]) clearTimeout(timerRef[0])
    timerRef[1](
      setTimeout(() => {
        setVisible(false)
      }, 5000),
    )
  }, [violation])

  if (!visible || !violation) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-brand-orange px-4 py-2.5 text-sm font-medium text-white"
    >
      <span>{getMessage(violation)}</span>
      {violationCount > 1 && (
        <span className="ml-4 rounded bg-brand-orange-light px-2 py-0.5 text-xs">
          {violationCount} violations
        </span>
      )}
    </div>
  )
}
