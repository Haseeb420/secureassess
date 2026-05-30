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
  idle:    { label: 'idle',    className: 'text-white/40' },
  running: { label: 'running', className: 'text-brand-orange' },
  success: { label: 'success', className: 'text-green-400' },
  error:   { label: 'error',   className: 'text-red-400' },
}

const LINE_CLASS: Record<OutputLine['type'], string> = {
  stdout: 'text-white/90',
  stderr: 'text-red-400',
  system: 'text-brand-orange/70 italic',
}

export function ConsoleOutput({ lines, status, onClear }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  const badge = STATUS_BADGE[status]

  return (
    <div className="flex h-full flex-col bg-brand-navy text-white font-mono text-sm">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between bg-brand-navy-light px-4 py-2">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-white/60">Console</span>
          <span className={`text-xs font-medium ${badge.className}`}>{badge.label}</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear console output"
          className="text-xs text-white/40 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-orange rounded"
        >
          Clear
        </button>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto px-4 py-3 leading-5">
        {lines.length === 0 ? (
          <span className="text-white/30">No output yet.</span>
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
