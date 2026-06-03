import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, Minus } from 'lucide-react'
import type { SubmitResult, TestCaseOutcome } from '../features/ide/evaluationService'

interface SubmissionModalProps {
  result: SubmitResult
  assessmentName?: string
  onFinish: () => void
  hasNextQuestion?: boolean
  onNextQuestion?: () => void
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R // ≈ 326.7

const STATUS_LABEL: Record<string, string> = {
  wrong_answer:        'Wrong Answer',
  time_limit_exceeded: 'Time Limit',
  runtime_error:       'Runtime Error',
  compile_error:       'Compile Error',
}

function scoreColor(score: number): string {
  if (score >= 70) return '#22c55e'
  if (score >= 40) return '#DE5E1F'
  return '#ef4444'
}

function isHiddenTest(outcome: TestCaseOutcome): boolean {
  return Boolean(outcome.test_case_id?.includes('hidden'))
}

function ScoreRing({ score }: { score: number }) {
  const color = scoreColor(score)
  const targetOffset = RING_C * (1 - score / 100)

  return (
    <div className="relative flex h-32 w-32 items-center justify-center">
      <svg
        width="128" height="128"
        viewBox="0 0 128 128"
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="64" cy="64" r={RING_R}
          fill="none"
          stroke="#E8E9EE"
          strokeWidth="6"
        />
        <motion.circle
          cx="64" cy="64" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          initial={{ strokeDashoffset: RING_C }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          className="font-syne text-3xl font-bold tabular-nums"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {Math.round(score)}
        </motion.span>
        <span className="mt-0.5 font-dm-sans text-xs text-brand-navy/40">score</span>
      </div>
    </div>
  )
}

function OutcomeRow({ outcome, index }: { outcome: TestCaseOutcome; index: number }) {
  if (isHiddenTest(outcome)) {
    return (
      <div className="flex items-center gap-3 border-b border-brand-border px-4 py-2.5 last:border-0">
        <Minus size={14} className="shrink-0 text-brand-navy/25" aria-hidden="true" />
        <span className="font-dm-sans text-sm italic text-brand-navy/40">
          Hidden Test {index + 1}
        </span>
      </div>
    )
  }

  const failLabel = STATUS_LABEL[outcome.status] ?? 'Wrong Answer'

  return (
    <div className="flex items-center gap-3 border-b border-brand-border px-4 py-2.5 last:border-0">
      {outcome.passed ? (
        <CheckCircle2 size={14} className="shrink-0 text-green-500" aria-hidden="true" />
      ) : (
        <XCircle size={14} className="shrink-0 text-red-400" aria-hidden="true" />
      )}
      <span
        className={`font-dm-sans text-sm ${outcome.passed ? 'text-brand-navy' : 'text-brand-navy/80'}`}
      >
        Test {index + 1}
      </span>
      <span
        className={`ml-auto font-dm-mono text-xs ${outcome.passed ? 'text-brand-navy/40' : 'text-red-400'}`}
      >
        {outcome.passed ? `${outcome.execution_time_ms}ms` : failLabel}
      </span>
    </div>
  )
}

export function SubmissionModal({
  result,
  assessmentName,
  onFinish,
  hasNextQuestion = false,
  onNextQuestion,
}: SubmissionModalProps) {
  const { score, passed_tests, total_tests, outcomes } = result

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/70 px-4 backdrop-blur-sm fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="submission-modal-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl slide-up">
        {/* Header */}
        <div className="bg-brand-navy px-6 py-5">
          <h2
            id="submission-modal-title"
            className="font-display font-bold text-base text-white"
          >
            Question Submitted
          </h2>
          {assessmentName && (
            <p className="mt-0.5 font-sans text-xs text-white/40">{assessmentName}</p>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col items-center px-6 py-5 space-y-4">
          <ScoreRing score={score} />

          <p className="font-sans text-sm text-brand-navy/60 mt-1">
            {passed_tests} of {total_tests} tests passed
          </p>

          {/* Results list */}
          {outcomes.length > 0 && (
            <div className="mt-4 w-full max-h-44 overflow-y-auto rounded-xl border border-brand-border overflow-hidden">
              {outcomes.map((outcome, i) => (
                <OutcomeRow key={outcome.test_case_id ?? i} outcome={outcome} index={i} />
              ))}
            </div>
          )}

          <p className="mt-2 font-dm-sans text-xs italic text-brand-navy/30">
            Hidden test details are not shown
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-brand-border bg-brand-surface px-6 py-4 gap-3">
          {hasNextQuestion && onNextQuestion ? (
            <>
              <button
                type="button"
                onClick={onFinish}
                className="rounded-lg border border-brand-border bg-white px-4 py-2 font-dm-sans text-sm font-medium text-brand-navy transition-colors hover:bg-brand-surface"
              >
                Finish
              </button>
              <button
                type="button"
                onClick={onNextQuestion}
                className="rounded-lg bg-brand-orange px-4 py-2 font-dm-sans text-sm font-medium text-white transition-colors hover:bg-brand-orange-light"
              >
                Next Question →
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="rounded-lg bg-brand-orange px-6 py-2.5 font-dm-sans text-sm font-medium text-white transition-colors hover:bg-brand-orange-light"
            >
              Finish Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
