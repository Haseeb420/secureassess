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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/50 px-4 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      aria-labelledby="crash-recovery-title"
    >
      <div className="w-full max-w-md rounded-xl border border-brand-border bg-white shadow-xl p-8">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-amber-500 text-lg" aria-hidden="true">⚠</span>
          <h2 id="crash-recovery-title" className="text-xl font-semibold text-brand-navy">
            Unfinished Assessment Found
          </h2>
        </div>
        <p className="mt-2 mb-6 text-sm text-brand-navy/70">
          A previous session was interrupted. You can resume where you left off.
        </p>

        <div className="mb-6 rounded-lg border border-brand-border bg-brand-surface p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-navy/50">Assessment ID</span>
            <span className="font-mono text-brand-navy/80 text-xs">{session.assessment_id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-brand-navy/50">Time remaining</span>
            <span
              className={`font-mono font-semibold tabular-nums ${
                session.timer_remaining_secs < 300 ? 'text-brand-orange' : 'text-brand-navy'
              }`}
            >
              {formatTime(session.timer_remaining_secs)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="w-full rounded-lg bg-brand-orange hover:bg-brand-orange-light px-4 py-2.5 text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            Resume Assessment
          </button>
          <button
            type="button"
            onClick={handleAbandon}
            className="w-full rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Abandon
          </button>
        </div>
      </div>
    </div>
  )
}
