import { useState } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button, ConfirmDialog } from '@secureassess/ui'

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
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/80 px-4 backdrop-blur-md"
        aria-modal="true"
        role="dialog"
        aria-labelledby="crash-recovery-title"
      >
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 bg-brand-navy px-6 py-4">
            <AlertCircle size={18} className="shrink-0 text-brand-orange" aria-hidden="true" />
            <h2
              id="crash-recovery-title"
              className="font-syne font-semibold text-white"
            >
              Session found
            </h2>
          </div>

          {/* Body */}
          <div className="px-6 py-5">
            <p className="font-dm-sans text-sm text-brand-navy/70">
              The app closed while you were in the middle of an assessment. Your work is safe.
            </p>

            {/* Recovery card */}
            <div className="mt-4 rounded-2xl border border-brand-border bg-brand-surface p-4">
              <p className="font-dm-sans text-xs uppercase tracking-wider text-brand-navy/40">
                Assessment
              </p>
              <p className="mt-1 font-syne text-base font-bold text-brand-navy">
                {session.assessment_id}
              </p>

              <p className="mt-3 font-dm-sans text-xs text-brand-navy/40">
                Time Remaining
              </p>
              <p className="font-syne text-3xl font-bold text-brand-orange tabular-nums">
                {formatTime(session.timer_remaining_secs)}
              </p>

              <div className="mt-3 flex items-center gap-1.5">
                <CheckCircle2 size={12} className="shrink-0 text-green-600" aria-hidden="true" />
                <span className="font-dm-sans text-xs text-green-600">
                  Code auto-saved — resume exactly where you left off
                </span>
              </div>
            </div>
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
