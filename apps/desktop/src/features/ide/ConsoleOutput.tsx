import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle } from 'lucide-react'

export interface OutputLine {
  type: 'stdout' | 'stderr' | 'system'
  text: string
}

interface ConsoleOutputProps {
  lines: OutputLine[]
  status: 'idle' | 'running' | 'success' | 'error'
  onClear: () => void
}

function StatusIndicator({ status }: { status: ConsoleOutputProps['status'] }) {
  if (status === 'running') {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 size={14} className="animate-spin text-brand-orange" aria-hidden="true" />
        <span className="text-xs text-brand-orange">Running…</span>
      </div>
    )
  }
  if (status === 'success') {
    return (
      <div className="flex items-center gap-1.5">
        <CheckCircle2 size={14} className="text-green-400" aria-hidden="true" />
        <span className="text-xs text-green-400">All tests passed</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5">
        <XCircle size={14} className="text-red-400" aria-hidden="true" />
        <span className="text-xs text-red-400">Tests failed</span>
      </div>
    )
  }
  return null
}

const LINE_CLASS: Record<OutputLine['type'], string> = {
  stdout: 'text-[#CDD6F4]/90',
  stderr: 'text-red-400',
  system: 'text-brand-orange/70 italic',
}

export function ConsoleOutput({ lines, status, onClear }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="editor-zone flex h-full flex-col bg-[#1E1E2E] font-mono text-xs">
      {/* Console header */}
      <div className="flex h-8 shrink-0 items-center gap-3 border-b border-[#383850] bg-[#262637] px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#CDD6F4]/50">
          Output
        </span>
        <StatusIndicator status={status} />
        <div className="ml-auto flex items-center gap-2">
          {status === 'error' && (
            <div className="flex items-center gap-1">
              <AlertTriangle size={12} className="text-amber-400" aria-hidden="true" />
              <span className="text-xs text-amber-400">Check errors below</span>
            </div>
          )}
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear console output"
            className="flex items-center justify-center rounded p-0.5 text-[#CDD6F4]/30 transition-colors hover:text-[#CDD6F4]/70"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 leading-relaxed">
        {lines.length === 0 ? (
          <div className="pt-8 text-center">
            <p className="text-[#CDD6F4]/20">Run your code to see output here.</p>
            <p className="mt-1 text-[#CDD6F4]/15">Press ⌘ Enter to run</p>
          </div>
        ) : (
          <>
            {lines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1 }}
                className={LINE_CLASS[line.type]}
              >
                {line.text}
              </motion.div>
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
