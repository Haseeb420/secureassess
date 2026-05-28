import type { SubmitResult, TestCaseOutcome } from './evaluationService'

interface SubmissionModalProps {
  result: SubmitResult
  onFinish: () => void
}

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  time_limit_exceeded: 'Time Limit',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-green-400 border-green-600'
      : score >= 40
        ? 'text-yellow-400 border-yellow-600'
        : 'text-red-400 border-red-600'

  return (
    <div className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 ${color}`}>
      <span className="text-3xl font-bold tabular-nums">{Math.round(score)}</span>
      <span className="text-xs font-medium opacity-80">/ 100</span>
    </div>
  )
}

function OutcomeRow({ outcome, index }: { outcome: TestCaseOutcome; index: number }) {
  return (
    <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2.5 text-sm last:border-0">
      <div className="flex items-center gap-3">
        <span className={outcome.passed ? 'text-green-400' : 'text-red-400'}>
          {outcome.passed ? '✓' : '✗'}
        </span>
        <span className="text-zinc-300">Test {index + 1}</span>
        {!outcome.passed && (
          <span className="text-zinc-500 text-xs">
            {STATUS_LABEL[outcome.status] ?? outcome.status}
          </span>
        )}
      </div>
      <span className="text-zinc-500 text-xs tabular-nums">{outcome.execution_time_ms}ms</span>
    </div>
  )
}

export function SubmissionModal({ result, onFinish }: SubmissionModalProps) {
  const { score, passed_tests, total_tests, outcomes } = result

  const label =
    score >= 70 ? 'Great work!' : score >= 40 ? 'Partial credit' : 'Keep practicing'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 border-b border-zinc-800 px-6 py-8">
          <ScoreBadge score={score} />
          <h2 className="text-lg font-semibold text-white">{label}</h2>
          <p className="text-sm text-zinc-400">
            {passed_tests} of {total_tests} tests passed
          </p>
        </div>

        {/* Test breakdown */}
        {outcomes.length > 0 && (
          <div className="max-h-64 overflow-y-auto">
            {outcomes.map((outcome, i) => (
              <OutcomeRow key={outcome.test_case_id} outcome={outcome} index={i} />
            ))}
          </div>
        )}

        {total_tests === 0 && (
          <div className="px-6 py-4 text-center text-sm text-zinc-500">
            Compile error — no tests were run.
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end border-t border-zinc-800 px-6 py-4">
          <button
            type="button"
            onClick={onFinish}
            className="rounded-md bg-white px-5 py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90"
          >
            Finish Assessment
          </button>
        </div>
      </div>
    </div>
  )
}
