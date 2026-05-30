import { AlertTriangle } from 'lucide-react'
import { Button, ConfirmDialog } from '@secureassess/ui'
import { useState } from 'react'

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
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/70 px-4 backdrop-blur-sm"
        aria-modal="true"
        role="dialog"
        aria-labelledby="crash-recovery-title"
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 bg-brand-navy px-6 py-4">
            <AlertTriangle size={18} className="text-brand-orange shrink-0" aria-hidden="true" />
            <h2 id="crash-recovery-title" className="text-white font-semibold">
              Unfinished Assessment Found
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            <p className="text-brand-navy/70 text-sm">
              You were in the middle of an assessment when the app closed.
            </p>

            <div className="mt-4 rounded-xl border border-brand-border bg-brand-surface p-4">
              <p className="text-brand-navy font-medium text-sm">{session.assessment_id}</p>
              <p
                className={[
                  'mt-1 font-mono text-2xl font-bold tabular-nums',
                  session.timer_remaining_secs < 300 ? 'text-brand-orange' : 'text-brand-navy',
                ].join(' ')}
              >
                {formatTime(session.timer_remaining_secs)}
              </p>
              <p className="mt-0.5 text-brand-navy/50 text-xs">time remaining</p>
            </div>

            <p className="mt-4 text-brand-navy/60 text-xs">
              Your code was auto-saved. You can resume exactly where you left off.
            </p>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t border-brand-border bg-brand-surface px-6 py-4">
            <Button
              type="button"
              variant="danger"
              onClick={() => setConfirmOpen(true)}
            >
              Abandon
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={onResume}
              className="flex-1"
            >
              Resume Assessment →
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Abandon assessment?"
        description="This will end your assessment permanently. All unsaved progress will be lost and you will not be able to resume."
        confirmLabel="Abandon"
        cancelLabel="Keep going"
        variant="danger"
        onConfirm={() => { setConfirmOpen(false); onAbandon() }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  )
}
