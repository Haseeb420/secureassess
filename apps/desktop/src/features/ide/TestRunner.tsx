import type { RunResult } from './evaluationService'

interface TestRunnerProps {
  onRun: () => Promise<void>
  result: RunResult | null
  isRunning: boolean
}

const STATUS_LABEL: Record<string, string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  time_limit_exceeded: 'Time Limit',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
}

export function TestRunner({ onRun, result, isRunning }: TestRunnerProps) {
  const outcomes = result?.outcomes ?? []
  const passed = outcomes.filter((o) => o.passed).length
  const total = outcomes.length
  const hasCompileError = !!result?.compile_error

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-3">
      <button
        type="button"
        onClick={onRun}
        disabled={isRunning}
        className="flex items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isRunning ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running…
          </>
        ) : (
          'Run Sample Tests'
        )}
      </button>

      {result && (
        <div className="mt-3 flex-1 overflow-y-auto">
          {hasCompileError ? (
            <div className="rounded-md bg-red-950 px-3 py-2 text-xs text-red-300">
              <div className="mb-1 font-semibold">Compile Error</div>
              <pre className="whitespace-pre-wrap font-mono">{result.compile_error}</pre>
            </div>
          ) : (
            <>
              <div
                className={`mb-3 rounded-md px-3 py-2 text-sm font-medium ${
                  passed === total && total > 0
                    ? 'bg-green-900 text-green-200'
                    : 'bg-red-900 text-red-200'
                }`}
              >
                {total === 0 ? 'No test cases found' : `${passed} / ${total} tests passed`}
              </div>

              <div className="space-y-1.5">
                {outcomes.map((outcome, i) => (
                  <div
                    key={outcome.test_case_id}
                    className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className={outcome.passed ? 'text-green-400' : 'text-red-400'}>
                        {outcome.passed ? '✓' : '✗'}
                      </span>
                      <span className="text-zinc-300">Test {i + 1}</span>
                      {!outcome.passed && (
                        <span className="text-zinc-500">
                          {STATUS_LABEL[outcome.status] ?? outcome.status}
                        </span>
                      )}
                    </div>
                    <span className="text-zinc-500">{outcome.execution_time_ms}ms</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
