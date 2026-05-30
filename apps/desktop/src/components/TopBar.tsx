import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SyncIndicator } from '../features/sync/SyncIndicator'
import { useTimerPersistence } from '../features/persistence/useTimerPersistence'
import { ConfirmDialog } from '@secureassess/ui'

interface TopBarProps {
  candidateName: string
  questionIndex: number
  totalQuestions: number
  timerSeconds: number
  sessionId: string | null
  onSubmit: () => void
  isSubmitting?: boolean
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerClass(seconds: number): string {
  if (seconds < 60)  return 'text-red-400 font-bold animate-pulse font-mono text-lg tabular-nums'
  if (seconds < 300) return 'text-brand-orange font-bold animate-pulse font-mono text-lg tabular-nums'
  if (seconds < 600) return 'text-amber-300 font-mono text-lg tabular-nums'
  return 'text-white font-mono text-lg tabular-nums'
}

export function TopBar({
  candidateName,
  questionIndex,
  totalQuestions,
  timerSeconds,
  sessionId,
  onSubmit,
  isSubmitting = false,
}: TopBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isExpired = timerSeconds === 0

  useTimerPersistence({ sessionId, timerSeconds })

  useEffect(() => {
    if (isExpired) onSubmit()
  }, [isExpired, onSubmit])

  return (
    <>
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-brand-navy px-6 py-3">
        {/* Left */}
        <div className="flex items-center gap-3">
          <span className="text-white font-bold text-sm tracking-wide">SA</span>
          <span className="h-4 w-px bg-white/20" aria-hidden="true" />
          <span className="text-sm text-white/70" aria-label={`Candidate: ${candidateName}`}>
            {candidateName}
          </span>
        </div>

        {/* Center — question navigator */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/70">
            Q{questionIndex} of {totalQuestions}
          </span>
          <span
            aria-label={`Time remaining: ${formatTime(timerSeconds)}`}
            aria-live="off"
            className={timerClass(timerSeconds)}
          >
            {formatTime(timerSeconds)}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <SyncIndicator />
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Submitting…' : 'Submit assessment (Ctrl+Shift+Enter)'}
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange hover:bg-brand-orange-light px-4 py-1.5 text-sm font-medium text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-orange active:scale-[0.97]"
          >
            {isSubmitting ? (
              <motion.svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </motion.svg>
            ) : null}
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit assessment?"
        description="Once submitted you cannot edit this answer. Your code will be evaluated against all test cases."
        confirmLabel="Submit"
        cancelLabel="Keep editing"
        variant="primary"
        onConfirm={() => { setConfirmOpen(false); onSubmit() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
