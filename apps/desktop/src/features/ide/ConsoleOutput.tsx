import { useEffect, useRef } from 'react'

export interface OutputLine {
  type: 'stdout' | 'stderr' | 'system'
  text: string
}

interface ConsoleOutputProps {
  lines: OutputLine[]
  status: 'idle' | 'running' | 'success' | 'error'
  onClear: () => void
}

const STATUS_BADGE: Record<ConsoleOutputProps['status'], { label: string; className: string }> = {
  idle: { label: 'idle', className: 'bg-zinc-700 text-zinc-400' },
  running: { label: 'running', className: 'bg-yellow-900 text-yellow-300' },
  success: { label: 'success', className: 'bg-green-900 text-green-300' },
  error: { label: 'error', className: 'bg-red-900 text-red-300' },
}

const LINE_CLASS: Record<OutputLine['type'], string> = {
  stdout: 'text-white',
  stderr: 'text-red-400',
  system: 'text-yellow-500',
}

export function ConsoleOutput({ lines, status, onClear }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const badge = STATUS_BADGE[status]

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Console</span>
          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear console output"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Clear
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs leading-5">
        {lines.length === 0 ? (
          <span className="text-zinc-600">No output yet.</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className={LINE_CLASS[line.type]}>
              {line.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
