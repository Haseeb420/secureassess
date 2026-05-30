import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { SyncIndicator } from '../features/sync/SyncIndicator'
import { useTimerPersistence } from '../features/persistence/useTimerPersistence'
import { ConfirmDialog } from '@secureassess/ui'

interface TopBarProps {
  candidateName: string
  assessmentTitle?: string
  questionIndex: number
  totalQuestions: number
  timerSeconds: number
  timerTotalSeconds?: number
  sessionId: string | null
  onSubmit: () => void
  isSubmitting?: boolean
}

const TIMER_RING_R = 14
const TIMER_RING_C = 2 * Math.PI * TIMER_RING_R

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerTextClass(seconds: number): string {
  if (seconds < 60)  return 'font-mono text-sm font-bold text-red-400'
  if (seconds < 300) return 'font-mono text-sm font-bold text-brand-orange'
  if (seconds < 600) return 'font-mono text-sm text-amber-300'
  return 'font-mono text-sm text-white'
}

function timerRingColor(seconds: number, total: number): string {
  const ratio = total > 0 ? seconds / total : 1
  if (ratio > 0.5) return '#4ade80'  // green-400
  if (ratio > 0.2) return '#DE5E1F'  // brand-orange
  return '#f87171'                    // red-400
}

export function TopBar({
  candidateName,
  assessmentTitle = 'Assessment',
  questionIndex,
  totalQuestions,
  timerSeconds,
  timerTotalSeconds = 3600,
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

  const ringColor = timerRingColor(timerSeconds, timerTotalSeconds)
  const ratio = timerTotalSeconds > 0 ? timerSeconds / timerTotalSeconds : 1
  const dashOffset = TIMER_RING_C * (1 - ratio)

  return (
    <>
      <div
        className="flex h-[52px] shrink-0 items-center border-b border-white/10 bg-brand-navy px-5"
        style={{ position: 'relative' }}
      >
        {/* Left: logo + candidate */}
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/20">
            <ShieldCheck size={14} className="text-brand-orange" aria-hidden="true" />
          </div>
          <span className="h-5 w-px bg-white/20" aria-hidden="true" />
          <span className="text-sm font-medium text-white/80" aria-label={`Candidate: ${candidateName}`}>
            {candidateName}
          </span>
        </div>

        {/* Center: title + question nav */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          <span className="text-sm font-medium text-white">{assessmentTitle}</span>
          <span className="text-white/30" aria-hidden="true">/</span>
          <span className="text-sm text-white/60">
            Question {questionIndex} of {totalQuestions}
          </span>
        </div>

        {/* Right: sync + timer + submit */}
        <div className="ml-auto flex items-center gap-4">
          <SyncIndicator />

          <span className="h-5 w-px bg-white/20" aria-hidden="true" />

          {/* Timer with SVG ring */}
          <div className="relative flex items-center justify-center">
            <svg
              width="36"
              height="36"
              viewBox="0 0 36 36"
              className="-rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="18" cy="18" r={TIMER_RING_R}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="2"
              />
              <circle
                cx="18" cy="18" r={TIMER_RING_R}
                fill="none"
                stroke={ringColor}
                strokeWidth="2"
                strokeDasharray={TIMER_RING_C}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 1s ease' }}
              />
            </svg>
            <span
              className={['absolute', timerTextClass(timerSeconds)].join(' ')}
              style={{ fontSize: '0.6875rem' }}
              aria-label={`Time remaining: ${formatTime(timerSeconds)}`}
              aria-live="off"
            >
              {formatTime(timerSeconds)}
            </span>
          </div>

          <span className="h-5 w-px bg-white/20" aria-hidden="true" />

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Submitting…' : 'Submit assessment'}
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange-light disabled:opacity-50"
          >
            {isSubmitting && (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isSubmitting ? 'Submitting…' : 'Submit'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit your solution?"
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
