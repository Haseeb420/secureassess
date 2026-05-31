import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ConfirmDialog } from '@secureassess/ui'
import { useSyncStatus } from '../features/sync/useSyncStatus'
import { useTimerPersistence } from '../features/persistence/useTimerPersistence'

interface TopBarProps {
  candidateName: string
  assessmentTitle?: string
  questionIndex: number
  totalQuestions: number
  timerSeconds: number
  timerTotalSeconds?: number
  sessionId: string | null
  onSubmit: () => void
  onPrevQuestion?: () => void
  onNextQuestion?: () => void
  isSubmitting?: boolean
}

const RING_R = 14
const RING_C = 2 * Math.PI * RING_R

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" }
const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerStroke(seconds: number): string {
  if (seconds < 60)  return '#f87171'
  if (seconds < 300) return '#DE5E1F'
  if (seconds < 600) return '#fcd34d'
  return '#ffffff'
}

function timerNumClass(seconds: number): string {
  if (seconds < 60)  return 'text-red-400'
  if (seconds < 300) return 'text-brand-orange'
  if (seconds < 600) return 'text-amber-300'
  return 'text-white'
}

function WamoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="SecureAssess">
      <path
        d="M2 4.5 L5.5 13.5 L9 7 L12.5 13.5 L16 4.5"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
  onPrevQuestion,
  onNextQuestion,
  isSubmitting = false,
}: TopBarProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const { isOnline, pendingCount } = useSyncStatus()
  const isExpired = timerSeconds === 0
  const isMultiQuestion = totalQuestions > 1

  useTimerPersistence({ sessionId, timerSeconds })

  useEffect(() => {
    if (isExpired) onSubmit()
  }, [isExpired, onSubmit])

  const ratio = timerTotalSeconds > 0 ? timerSeconds / timerTotalSeconds : 1
  const dashOffset = RING_C * (1 - ratio)
  const ringColor = timerStroke(timerSeconds)
  const initial = candidateName.trim().charAt(0).toUpperCase() || '?'

  let syncDot: string
  let syncText: string
  let syncTextClass: string
  if (!isOnline) {
    syncDot = 'bg-red-400'
    syncText = 'offline'
    syncTextClass = 'text-red-400/80'
  } else if (pendingCount > 0) {
    syncDot = 'bg-brand-orange animate-pulse'
    syncText = 'saving'
    syncTextClass = 'text-white/40'
  } else {
    syncDot = 'bg-green-400'
    syncText = 'saved'
    syncTextClass = 'text-white/40'
  }

  return (
    <>
      <div
        className="flex h-[52px] shrink-0 items-center border-b border-white/8 bg-brand-navy px-5"
        role="banner"
      >
        {/* Left: logo mark + divider + avatar + name */}
        <div className="flex w-1/4 min-w-0 items-center gap-3">
          <WamoMark />
          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />
          <div
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-orange"
            aria-hidden="true"
          >
            <span className="text-xs font-bold leading-none text-white" style={SYNE}>
              {initial}
            </span>
          </div>
          <span
            className="truncate text-sm text-white/70"
            style={DM_SANS}
            title={candidateName}
          >
            {candidateName}
          </span>
        </div>

        {/* Center: question nav + assessment title */}
        <div className="flex flex-1 flex-col items-center justify-center">
          {isMultiQuestion && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onPrevQuestion}
                disabled={questionIndex <= 1}
                aria-label="Previous question"
                className="text-white/40 transition-colors hover:text-white disabled:opacity-30"
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <span className="text-sm font-medium text-white/80" style={DM_SANS}>
                Question {questionIndex}
              </span>
              <span className="text-sm text-white/30" style={DM_SANS}>
                of {totalQuestions}
              </span>
              <button
                type="button"
                onClick={onNextQuestion}
                disabled={questionIndex >= totalQuestions}
                aria-label="Next question"
                className="text-white/40 transition-colors hover:text-white disabled:opacity-30"
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <span className="mt-0.5 text-xs text-white/30" style={DM_SANS}>
            {assessmentTitle}
          </span>
        </div>

        {/* Right: sync + divider + timer + divider + submit */}
        <div className="flex w-1/4 items-center justify-end gap-3">
          {/* Sync indicator */}
          <div
            className="flex items-center gap-1.5"
            aria-label={`Sync status: ${syncText}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${syncDot}`} aria-hidden="true" />
            <span className={`text-[11px] ${syncTextClass}`} style={DM_MONO}>
              {syncText}
            </span>
          </div>

          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />

          {/* Timer: SVG ring + centered time + "REMAINING" label */}
          <div className="flex flex-col items-center gap-px">
            <div className="relative flex items-center justify-center">
              <svg
                width="36"
                height="36"
                viewBox="0 0 36 36"
                className="-rotate-90"
                aria-hidden="true"
              >
                {/* Track */}
                <circle
                  cx="18" cy="18" r={RING_R}
                  fill="none"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="2.5"
                />
                {/* Progress arc */}
                <circle
                  cx="18" cy="18" r={RING_R}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="2.5"
                  strokeDasharray={RING_C}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                />
              </svg>
              <span
                className={`absolute text-[11px] font-bold ${timerNumClass(timerSeconds)}`}
                style={SYNE}
                aria-label={`Time remaining: ${formatTime(timerSeconds)}`}
                aria-live="off"
              >
                {formatTime(timerSeconds)}
              </span>
            </div>
            <span
              className="text-[9px] uppercase tracking-widest text-white/25"
              style={DM_MONO}
            >
              remaining
            </span>
          </div>

          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />

          {/* Submit button */}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={isSubmitting}
            aria-label={isSubmitting ? 'Submitting…' : 'Submit assessment'}
            className="flex items-center rounded-xl border border-white/15 bg-white/8 px-4 py-1.5 text-sm font-medium text-white/80 transition-all hover:border-brand-orange/40 hover:bg-white/15 hover:text-brand-orange disabled:opacity-50"
            style={DM_SANS}
          >
            {isSubmitting && (
              <svg className="mr-1.5 h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {isSubmitting ? 'Submitting…' : 'Submit'}
            {!isSubmitting && (
              <ChevronRight size={14} className="ml-1" aria-hidden="true" />
            )}
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
