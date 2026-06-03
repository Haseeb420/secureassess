import { useState } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ConfirmDialog } from '@secureassess/ui'

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
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/75 backdrop-blur-sm fade-in"
        aria-modal="true"
        role="dialog"
        aria-labelledby="crash-recovery-title"
      >
        {/* Card */}
        <div className="relative mx-4 w-full max-w-[420px] overflow-hidden rounded-2xl bg-white shadow-2xl slide-up">

          {/* Header */}
          <div className="flex items-center gap-3 bg-brand-navy px-6 py-5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <AlertCircle size={16} className="text-brand-orange" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="crash-recovery-title"
                className="font-syne text-[15px] font-bold leading-tight text-white"
              >
                Session found
              </h2>
              <p className="mt-0.5 font-dm-sans text-xs text-white/55">
                You were in the middle of an assessment
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-4">
            <p className="font-dm-sans text-sm leading-relaxed text-brand-navy/70">
              The app closed unexpectedly. Your work is safe and you can resume exactly where you left off.
            </p>

            {/* Info card */}
            <div className="mt-4 rounded-xl border border-brand-border bg-brand-surface">
              <div className="px-4 py-4">
                <p className="font-dm-sans text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40">
                  Assessment
                </p>
                <p className="mt-1 font-dm-mono text-sm text-brand-navy/70">
                  {session.assessment_id?.slice(0, 8)}&hellip;
                </p>

                <div className="my-3 h-px bg-brand-border" />

                <p className="font-dm-sans text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40">
                  Time Remaining
                </p>
                <p className="mt-1 font-syne text-3xl font-bold leading-none tabular-nums text-brand-orange">
                  {formatTime(session.timer_remaining_secs)}
                </p>

                <div className="mt-3 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="shrink-0 text-green-600" aria-hidden="true" />
                  <span className="font-dm-sans text-xs text-green-700">
                    Code auto-saved — resume exactly where you left off
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 pb-6 pt-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="shrink-0 rounded-xl border border-red-200 px-4 py-2.5 font-dm-sans text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
            >
              Abandon
            </button>
            <button
              type="button"
              onClick={onResume}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-orange px-4 py-2.5 font-dm-sans text-sm font-medium text-white transition-colors hover:bg-brand-orange-light"
            >
              Resume Assessment
              <ArrowRight size={15} aria-hidden="true" />
            </button>
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
