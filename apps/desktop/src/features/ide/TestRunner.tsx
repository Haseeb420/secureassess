import type { ExecutionResult } from '@secureassess/shared-types'

interface TestRunnerProps {
  onRun: () => Promise<ExecutionResult[]>
  results: ExecutionResult[]
  isRunning: boolean
}

const STATUS_LABEL: Record<ExecutionResult['status'], string> = {
  accepted: 'Accepted',
  wrong_answer: 'Wrong Answer',
  time_limit: 'Time Limit Exceeded',
  runtime_error: 'Runtime Error',
  compile_error: 'Compile Error',
}

export function TestRunner({ onRun, results, isRunning }: TestRunnerProps) {
  const passed = results.filter((r) => r.passed).length
  const total = results.length

  return (
    <div className="flex h-full flex-col bg-zinc-950 p-3">
      {/* Run button */}
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

      {/* Results */}
      {results.length > 0 && (
        <div className="mt-3 flex-1 overflow-y-auto">
          {/* Summary */}
          <div
            className={`mb-3 rounded-md px-3 py-2 text-sm font-medium ${
              passed === total
                ? 'bg-green-900 text-green-200'
                : 'bg-red-900 text-red-200'
            }`}
          >
            {passed} / {total} tests passed
          </div>

          {/* Individual rows */}
          <div className="space-y-1.5">
            {results.map((result, i) => (
              <div
                key={result.testCaseId}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                    {result.passed ? '✓' : '✗'}
                  </span>
                  <span className="text-zinc-300">Test {i + 1}</span>
                  {!result.passed && (
                    <span className="text-zinc-500">{STATUS_LABEL[result.status]}</span>
                  )}
                </div>
                <span className="text-zinc-500">{result.executionTimeMs}ms</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
