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
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A2A47]/75 backdrop-blur-sm fade-in"
        aria-modal="true"
        role="dialog"
        aria-labelledby="crash-recovery-title"
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 overflow-hidden slide-up">

          {/* Header */}
          <div className="bg-[#2A2A47] px-6 py-5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-4 h-4 text-[#DE5E1F]" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="crash-recovery-title"
                className="font-display font-bold text-white text-[15px] leading-tight"
              >
                Session found
              </h2>
              <p className="text-white/55 text-xs font-sans mt-0.5">
                You were in the middle of an assessment
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-4">
            <p className="text-[#2A2A47]/70 text-sm font-sans leading-relaxed">
              The app closed unexpectedly. Your work is safe and you can resume exactly where you left off.
            </p>

            {/* Recovery info card */}
            <div className="mt-4 bg-[#F7F8FA] border border-[#E8E9EE] rounded-xl overflow-hidden">
              <div className="px-4 pt-4 pb-4">

                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-[#2A2A47]/40">
                  ASSESSMENT
                </p>
                <p className="text-[#2A2A47] font-sans font-medium text-sm leading-snug mt-1">
                  <span className="font-mono text-[#2A2A47]/70">
                    {session.assessment_id?.slice(0, 8)}…
                  </span>
                </p>

                <div className="border-t border-[#E8E9EE] my-3" />

                <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.12em] text-[#2A2A47]/40">
                  TIME REMAINING
                </p>
                <p className="font-display font-bold text-[#DE5E1F] text-3xl leading-none mt-1 tabular-nums">
                  {formatTime(session.timer_remaining_secs)}
                </p>

                <div className="flex items-center gap-1.5 mt-3">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" aria-hidden="true" />
                  <span className="text-green-700 text-xs font-sans">
                    Code auto-saved — resume exactly where you left off
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 pt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="flex-none px-4 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-sans font-medium hover:bg-red-50 hover:border-red-300 transition-colors duration-[120ms] cursor-pointer"
            >
              Abandon
            </button>
            <button
              type="button"
              onClick={onResume}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#DE5E1F] text-white text-sm font-sans font-medium hover:bg-[#F06B28] transition-colors duration-[120ms] cursor-pointer flex items-center justify-center gap-2"
            >
              Resume Assessment
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
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
