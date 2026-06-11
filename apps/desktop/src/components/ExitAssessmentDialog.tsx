import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Loader2, LogOut, Send } from 'lucide-react'
import { TypeToConfirmInput } from './TypeToConfirmInput'

type ExitStep = 'warning' | 'confirm-submit' | 'confirm-exit-no-submit'

interface ExitAssessmentDialogProps {
  open: boolean
  onClose: () => void
  onSubmitAndExit: () => Promise<void>
  onExitWithoutSubmit: () => Promise<void>
  questionsCompleted: number
  questionsTotal: number
  isAssessmentCompleted: boolean
}

const SYNE: React.CSSProperties = { fontFamily: "'Syne', sans-serif" }
const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

export function ExitAssessmentDialog({
  open,
  onClose,
  onSubmitAndExit,
  onExitWithoutSubmit,
  questionsCompleted,
  questionsTotal,
  isAssessmentCompleted,
}: ExitAssessmentDialogProps) {
  const [step, setStep] = useState<ExitStep>('warning')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [canExitNoSubmit, setCanExitNoSubmit] = useState(false)

  const questionsRemaining = questionsTotal - questionsCompleted

  useEffect(() => {
    if (open) {
      setStep('warning')
      setIsSubmitting(false)
      setIsExiting(false)
      setCanExitNoSubmit(false)
    }
  }, [open])

  if (!open) return null

  // SCENARIO A — Assessment already fully completed
  if (isAssessmentCompleted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          className="absolute inset-0 bg-brand-navy/60 backdrop-blur-sm fade-in"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-dialog-title"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl slide-up"
        >
          <h2 id="exit-dialog-title" className="text-lg font-bold text-brand-navy" style={SYNE}>
            Exit assessment
          </h2>
          <p className="mt-2 text-sm text-brand-navy/60" style={DM_SANS}>
            Your assessment is complete. You can safely close the app.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-brand-border py-2.5 text-sm text-brand-navy transition-colors hover:border-brand-navy"
              style={DM_SANS}
            >
              Cancel
            </button>
            <button
              onClick={onExitWithoutSubmit}
              className="flex-1 rounded-xl bg-brand-navy py-2.5 text-sm text-white transition-colors hover:bg-brand-navy-light"
              style={DM_SANS}
            >
              Exit
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  // SCENARIO B — Assessment not yet completed
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-brand-navy/75 backdrop-blur-md fade-in"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />

      <AnimatePresence mode="wait">
        {/* STEP 1 — Initial warning */}
        {step === 'warning' && (
          <motion.div
            key="warning"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-warning-title"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl slide-up"
          >
            <div className="flex items-center gap-3 bg-brand-orange px-6 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20">
                <AlertTriangle className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <h2
                  id="exit-warning-title"
                  className="font-bold text-white"
                  style={{ ...SYNE, fontSize: '15px' }}
                >
                  Exit assessment?
                </h2>
                <p className="mt-0.5 text-xs text-white/70" style={DM_SANS}>
                  This requires your attention
                </p>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="mb-4 rounded-xl border border-brand-border bg-brand-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-brand-navy/60" style={DM_SANS}>
                    Assessment progress
                  </span>
                  <span className="text-xs font-medium text-brand-navy" style={DM_MONO}>
                    {questionsCompleted} of {questionsTotal} submitted
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-brand-border">
                  <div
                    className="h-full rounded-full bg-brand-orange transition-all"
                    style={{
                      width: `${questionsTotal > 0 ? (questionsCompleted / questionsTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
                {questionsRemaining > 0 && (
                  <p className="mt-2 text-xs text-red-500" style={DM_SANS}>
                    {questionsRemaining} question{questionsRemaining > 1 ? 's' : ''} not yet submitted
                  </p>
                )}
              </div>

              <p className="text-sm leading-relaxed text-brand-navy/80" style={DM_SANS}>
                Exiting now will end your assessment session. This action cannot be undone.
              </p>
              <p className="mt-2 text-xs text-brand-navy/50" style={DM_SANS}>
                Your code has been auto-saved and will sync to the server.
              </p>
            </div>

            <div className="border-t border-brand-border bg-brand-surface px-6 py-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setStep('confirm-submit')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-navy-light"
                  style={DM_SANS}
                >
                  <Send className="h-4 w-4" aria-hidden="true" />
                  Submit {questionsRemaining > 0 ? 'remaining & exit' : 'and exit'}
                </button>

                <button
                  onClick={() => setStep('confirm-exit-no-submit')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2.5 text-sm text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
                  style={DM_SANS}
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Exit without submitting
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-2 text-sm text-brand-navy/50 transition-colors hover:text-brand-navy"
                  style={DM_SANS}
                >
                  Continue my assessment
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* STEP 2A — Confirm submit & exit */}
        {step === 'confirm-submit' && (
          <motion.div
            key="confirm-submit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-submit-title"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl slide-up"
          >
            <button
              onClick={() => setStep('warning')}
              className="mb-4 flex items-center gap-1 text-sm text-brand-navy/40 transition-colors hover:text-brand-navy"
              style={DM_SANS}
            >
              ← Back
            </button>

            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-navy/10">
                <Send className="h-4 w-4 text-brand-navy" aria-hidden="true" />
              </div>
              <div>
                <h2 id="exit-submit-title" className="text-sm font-semibold text-brand-navy" style={SYNE}>
                  Submit Assessment
                </h2>
                <p className="mt-1 text-sm text-brand-navy/60" style={DM_SANS}>
                  Are you sure you want to submit your assessment?
                </p>
              </div>
            </div>

            <ul className="mb-4 space-y-1.5 text-sm text-brand-navy/60" style={DM_SANS}>
              <li>• Your answers will be finalized.</li>
              <li>• You may not be able to make further changes.</li>
              <li>• The assessment session will end.</li>
            </ul>

            {questionsRemaining > 0 && (
              <div className="mb-4 rounded-xl border border-brand-border bg-brand-surface p-3">
                <p className="text-xs text-brand-navy/50" style={DM_SANS}>
                  {questionsRemaining} unsubmitted question{questionsRemaining !== 1 ? 's' : ''} will
                  be scored on whatever you have written so far.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('warning')}
                className="flex-1 rounded-xl border border-brand-border py-2.5 text-sm text-brand-navy transition-colors hover:border-brand-navy"
                style={DM_SANS}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setIsSubmitting(true)
                  await onSubmitAndExit()
                  setIsSubmitting(false)
                }}
                disabled={isSubmitting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-orange py-2.5 text-sm text-white transition-colors hover:bg-brand-orange-light disabled:opacity-50"
                style={DM_SANS}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Submitting…
                  </>
                ) : (
                  'Submit Assessment'
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2B — Confirm exit without submitting */}
        {step === 'confirm-exit-no-submit' && (
          <motion.div
            key="confirm-exit"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-no-submit-title"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl slide-up"
          >
            <button
              onClick={() => setStep('warning')}
              className="mb-4 flex items-center gap-1 text-sm text-brand-navy/40 transition-colors hover:text-brand-navy"
              style={DM_SANS}
            >
              ← Back
            </button>

            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-2.5">
                <AlertTriangle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-red-700" style={DM_SANS}>
                    Your unsubmitted work will not be scored
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-red-600" style={DM_SANS}>
                    {questionsRemaining > 0
                      ? `${questionsRemaining} question${questionsRemaining > 1 ? 's' : ''} will receive zero score.`
                      : 'Your latest changes may not be evaluated.'}
                  </p>
                </div>
              </div>
            </div>

            <h2 id="exit-no-submit-title" className="text-base font-bold text-brand-navy" style={SYNE}>
              Are you absolutely sure?
            </h2>
            <p className="mt-2 text-sm text-brand-navy/70" style={DM_SANS}>
              This cannot be reversed. Your session will end and you will not be able to return.
            </p>

            <div className="mt-4">
              <TypeToConfirmInput
                confirmWord="EXIT"
                onConfirmed={() => setCanExitNoSubmit(true)}
              />
            </div>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setStep('warning')}
                className="flex-1 rounded-xl border border-brand-border bg-brand-surface py-2.5 text-sm text-brand-navy transition-colors hover:border-brand-navy"
                style={DM_SANS}
              >
                Go back
              </button>
              <button
                onClick={async () => {
                  setIsExiting(true)
                  await onExitWithoutSubmit()
                  setIsExiting(false)
                }}
                disabled={!canExitNoSubmit || isExiting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                style={DM_SANS}
              >
                {isExiting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Exiting…
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Exit now
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
