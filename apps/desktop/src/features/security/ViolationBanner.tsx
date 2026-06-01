import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import type { SecurityViolation } from './useSecurityMonitor'

interface ViolationBannerProps {
  violation: SecurityViolation | null
  violationCount: number
}

function getMessage(violation: SecurityViolation): string {
  if (violation.kind === 'focus-loss') {
    return 'Focus loss detected. Return to the assessment.'
  }
  if (violation.kind === 'fullscreen-restored') {
    return 'Screen recording or switching detected. Fullscreen restored.'
  }
  return `Unauthorized application detected: ${violation.payload.name}`
}

export function ViolationBanner({ violation, violationCount }: ViolationBannerProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!violation) return
    setVisible(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setVisible(false), 5000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [violation])

  return (
    <AnimatePresence>
      {visible && violation && (
        <motion.div
          role="alert"
          aria-live="assertive"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -52, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-brand-orange px-6 py-2.5 text-white shadow-lg"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} aria-hidden="true" />
            <span className="text-sm font-medium">{getMessage(violation)}</span>
          </div>
          <div className="flex items-center gap-3">
            {violationCount > 1 && (
              <span className="rounded bg-brand-orange-light px-2 py-0.5 text-xs font-medium">
                {violationCount} violations
              </span>
            )}
            <button
              type="button"
              onClick={() => setVisible(false)}
              aria-label="Dismiss violation notice"
              className="p-1 rounded hover:bg-white/20 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
