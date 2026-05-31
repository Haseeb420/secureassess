import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { SubmitResult, TestCaseOutcome } from './evaluationService'

interface SubmissionModalProps {
  result: SubmitResult
  onFinish: () => void
  hasNextQuestion?: boolean
  onNextQuestion?: () => void
}

const RING_R = 52
const RING_C = 2 * Math.PI * RING_R

const STATUS_LABEL: Record<string, string> = {
  accepted:            'Accepted',
  wrong_answer:        'Wrong Answer',
  time_limit_exceeded: 'Time Limit',
  runtime_error:       'Runtime Error',
  compile_error:       'Compile Error',
}

function scoreColor(score: number) {
  if (score >= 70) return '#4ade80'   // green-400
  if (score >= 40) return '#DE5E1F'   // brand-orange
  return '#f87171'                     // red-400
}

function ScoreRing({ score }: { score: number }) {
  const circleRef = useRef<SVGCircleElement>(null)
  const color = scoreColor(score)
  const targetOffset = RING_C * (1 - score / 100)

  useEffect(() => {
    const el = circleRef.current
    if (!el) return
    // Start fully empty, animate to score
    el.style.strokeDashoffset = String(RING_C)
    const raf = requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)'
      el.style.strokeDashoffset = String(targetOffset)
    })
    return () => cancelAnimationFrame(raf)
  }, [targetOffset])

  return (
    <div className="relative flex h-[120px] w-[120px] items-center justify-center">
      <svg
        width="120" height="120"
        viewBox="0 0 120 120"
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="60" cy="60" r={RING_R}
          fill="none"
          stroke="#E8E9EE"
          strokeWidth="8"
        />
        <circle
          ref={circleRef}
          cx="60" cy="60" r={RING_R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {Math.round(score)}
        </span>
      </div>
    </div>
  )
}

function OutcomeRow({ outcome, index }: { outcome: TestCaseOutcome; index: number }) {
  const label = outcome.passed
    ? 'Accepted'
    : STATUS_LABEL[outcome.status] ?? outcome.status

  return (
    <div className="flex items-center justify-between border-b border-brand-border px-4 py-2.5 last:border-0">
      <div className="flex items-center gap-3">
        {outcome.passed ? (
          <CheckCircle2 size={14} className="text-green-500 shrink-0" aria-hidden="true" />
        ) : (
          <XCircle size={14} className="text-red-400 shrink-0" aria-hidden="true" />
        )}
        <span className="text-sm text-brand-navy">
          {outcome.test_case_id?.includes('hidden') ? `Hidden Test ${index + 1}` : `Test ${index + 1}`}
        </span>
        {!outcome.passed && (
          <span className="text-xs italic text-brand-navy/40">{label}</span>
        )}
      </div>
      <span className="text-xs tabular-nums text-brand-navy/40">
        {outcome.execution_time_ms}ms
      </span>
    </div>
  )
}

export function SubmissionModal({
  result,
  onFinish,
  hasNextQuestion = false,
  onNextQuestion,
}: SubmissionModalProps) {
  const { score, passed_tests, total_tests, outcomes } = result

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Card header */}
        <div className="bg-brand-navy px-6 py-4">
          <h2 className="font-semibold text-white">Submission Complete</h2>
          <p className="mt-0.5 text-sm text-white/60">Your solution has been evaluated</p>
        </div>

        {/* Score section */}
        <div className="flex flex-col items-center px-6 py-6">
          <ScoreRing score={score} />
          <p className="mt-3 text-sm text-brand-navy/60">
            {passed_tests} / {total_tests} tests passed
          </p>
        </div>

        <div className="mx-6 h-px bg-brand-border" />

        {/* Test breakdown */}
        {outcomes.length > 0 ? (
          <div className="max-h-48 overflow-y-auto bg-brand-surface">
            {outcomes.map((outcome, i) => (
              <OutcomeRow key={outcome.test_case_id} outcome={outcome} index={i} />
            ))}
          </div>
        ) : (
          <div className="px-6 py-4 text-center text-sm text-brand-navy/40">
            Compile error — no tests were run.
          </div>
        )}

        {total_tests > 0 && (
          <p className="px-6 pb-2 text-center text-xs text-brand-navy/40">
            Hidden tests are not shown for academic integrity.
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-brand-border bg-brand-surface px-6 py-4">
          {hasNextQuestion && onNextQuestion ? (
            <>
              <button
                type="button"
                onClick={onFinish}
                className="rounded-lg border border-brand-border bg-white px-4 py-2 text-sm font-medium text-brand-navy transition-colors hover:bg-brand-surface"
              >
                Finish Assessment
              </button>
              <button
                type="button"
                onClick={onNextQuestion}
                className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-orange-light"
              >
                Next Question →
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onFinish}
              className="rounded-lg bg-brand-orange px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-orange-light"
            >
              Finish Assessment
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
