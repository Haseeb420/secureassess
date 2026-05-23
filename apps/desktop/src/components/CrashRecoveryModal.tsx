interface AssessmentSession {
  id: string
  assessment_id: string
  timer_remaining_secs: number
}

interface CrashRecoveryModalProps {
  session: AssessmentSession
  onResume: () => void
  onAbandon: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function CrashRecoveryModal({ session, onResume, onAbandon }: CrashRecoveryModalProps) {
  const handleAbandon = () => {
    const confirmed = window.confirm(
      'Are you sure you want to abandon this session? All unsaved work will be lost.',
    )
    if (confirmed) onAbandon()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-900 p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-amber-400 text-lg">⚠</span>
          <h2 className="text-base font-semibold text-white">Unfinished Assessment Found</h2>
        </div>
        <p className="mb-5 text-sm text-zinc-400">
          A previous session was interrupted. You can resume where you left off.
        </p>

        <div className="mb-5 rounded-md border border-zinc-800 bg-zinc-950 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Assessment ID</span>
            <span className="font-mono text-zinc-300 text-xs">{session.assessment_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Time remaining</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                session.timer_remaining_secs < 300 ? 'text-red-400' : 'text-white'
              }`}
            >
              {formatTime(session.timer_remaining_secs)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleAbandon}
            className="flex-1 rounded-md border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950"
          >
            Abandon
          </button>
          <button
            type="button"
            onClick={onResume}
            className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Resume Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
