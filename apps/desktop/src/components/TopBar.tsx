import { useEffect } from 'react'
import { SyncIndicator } from '../features/sync/SyncIndicator'
import { useTimerPersistence } from '../features/persistence/useTimerPersistence'

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

export function TopBar({
  candidateName,
  questionIndex,
  totalQuestions,
  timerSeconds,
  sessionId,
  onSubmit,
  isSubmitting = false,
}: TopBarProps) {
  const isLow = timerSeconds < 300
  const isExpired = timerSeconds === 0

  useTimerPersistence({ sessionId, timerSeconds })

  useEffect(() => {
    if (isExpired) onSubmit()
  }, [isExpired, onSubmit])

  return (
    <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2">
      <span className="text-sm text-zinc-400">{candidateName}</span>

      <div className="flex items-center gap-4">
        <span className="text-sm text-zinc-300">
          Question {questionIndex} of {totalQuestions}
        </span>
        <span
          aria-label={`Time remaining: ${formatTime(timerSeconds)}`}
          aria-live="off"
          className={`font-mono text-sm font-semibold tabular-nums ${
            isLow ? 'text-red-400' : 'text-white'
          }`}
        >
          {formatTime(timerSeconds)}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <SyncIndicator />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          aria-label={isSubmitting ? 'Submitting assessment…' : 'Submit assessment (Ctrl+Shift+Enter)'}
          className="flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isSubmitting ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Submitting…
            </>
          ) : (
            'Submit'
          )}
        </button>
      </div>
    </div>
  )
}
