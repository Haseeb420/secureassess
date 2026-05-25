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
          className="rounded-md bg-white px-3 py-1.5 text-xs font-medium text-zinc-900 transition-opacity hover:opacity-90"
        >
          Submit
        </button>
      </div>
    </div>
  )
}
