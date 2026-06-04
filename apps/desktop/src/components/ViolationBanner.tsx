import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import type { SecurityViolation } from '../features/security/useSecurityMonitor'

interface ViolationBannerProps {
  violation: SecurityViolation | null
  violationCount: number
}

function getMessage(violation: SecurityViolation): string {
  if (violation.kind === 'focus-loss') {
    return 'Focus loss detected. Return to the assessment.'
  }
  if (violation.kind === 'process') {
    return `Unauthorized application detected: ${violation.payload.name}`
  }
  return 'Fullscreen mode was exited. Please stay in the assessment window.'
}

export function ViolationBanner({ violation, violationCount }: ViolationBannerProps) {
  const [visible, setVisible] = useState(false)
  const [revealId, setRevealId] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!violation) return
    setVisible(true)
    setRevealId((n) => n + 1)
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
          initial={{ y: -48 }}
          animate={{ y: 0 }}
          exit={{ y: -48 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="fixed inset-x-0 top-0 z-50 bg-brand-orange shadow-lg slide-down"
        >
          {/* Main strip */}
          <div className="flex items-center gap-4 px-6 py-2.5">
            <AlertTriangle size={15} className="shrink-0 text-white/80" aria-hidden="true" />

            <span className="font-dm-sans text-sm font-medium text-white">
              {getMessage(violation)}
            </span>

            <div className="ml-auto flex items-center gap-2">
              {violationCount > 1 && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 font-dm-mono text-xs text-white">
                  {violationCount}×
                </span>
              )}
              <button
                type="button"
                onClick={() => setVisible(false)}
                aria-label="Dismiss violation notice"
                className="text-white/60 transition-colors hover:text-white/90"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Auto-dismiss progress strip */}
          <div className="relative h-[2px] overflow-hidden bg-white/20">
            <motion.div
              key={revealId}
              className="absolute inset-y-0 left-0 bg-white/50"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 5, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
