import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Trash2, XCircle } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TextLine {
  type: 'stdout' | 'stderr' | 'system' | 'compile-error'
  text: string
}

export interface TestResultLine {
  type: 'test'
  n: number
  status: 'pass' | 'fail'
  time: number
  expected?: string
  actual?: string
}

export interface SeparatorLine {
  type: 'separator'
  variant: 'stdout' | 'stderr' | 'compile'
}

export type OutputLine = TextLine | TestResultLine | SeparatorLine

export type ConsoleStatus = 'idle' | 'running' | 'pass' | 'fail' | 'error'

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConsoleStatus }) {
  if (status === 'running') {
    return (
      <div className="ml-3 flex items-center gap-1.5">
        <Loader2 size={11} className="animate-spin text-brand-orange" aria-hidden="true" />
        <span className="font-dm-mono text-[11px] text-brand-orange">running</span>
      </div>
    )
  }
  if (status === 'pass') {
    return (
      <div className="ml-3 flex items-center gap-1.5">
        <CheckCircle2 size={11} className="text-green-400" aria-hidden="true" />
        <span className="font-dm-mono text-[11px] text-green-400">all passed</span>
      </div>
    )
  }
  if (status === 'fail') {
    return (
      <div className="ml-3 flex items-center gap-1.5">
        <XCircle size={11} className="text-red-400" aria-hidden="true" />
        <span className="font-dm-mono text-[11px] text-red-400">tests failed</span>
      </div>
    )
  }
  if (status === 'error') {
    return (
      <div className="ml-3 flex items-center gap-1.5">
        <AlertTriangle size={11} className="text-amber-400" aria-hidden="true" />
        <span className="font-dm-mono text-[11px] text-amber-400">compile error</span>
      </div>
    )
  }
  return null
}

function TestRow({ line }: { line: TestResultLine }) {
  const [expanded, setExpanded] = useState(false)
  const isPass = line.status === 'pass'
  const hasDiff = !isPass && (line.expected !== undefined || line.actual !== undefined)

  return (
    <div>
      <div
        className={`flex items-start gap-3 py-0.5 ${isPass ? 'text-green-400' : 'text-red-400'} ${hasDiff ? 'cursor-pointer' : ''}`}
        onClick={hasDiff ? () => setExpanded((v) => !v) : undefined}
        role={hasDiff ? 'button' : undefined}
        tabIndex={hasDiff ? 0 : undefined}
        onKeyDown={hasDiff ? (e) => { if (e.key === 'Enter') setExpanded((v) => !v) } : undefined}
        aria-expanded={hasDiff ? expanded : undefined}
      >
        <span>{isPass ? '  ✓' : '  ✗'}</span>
        <span>
          Test {line.n}&nbsp;&nbsp;&nbsp;{isPass ? 'Accepted' : 'Wrong Answer'}&nbsp;&nbsp;&nbsp;{line.time}ms
        </span>
      </div>
      {expanded && hasDiff && (
        <div className="mb-1 ml-8 space-y-0.5">
          {line.expected !== undefined && (
            <div className="text-green-400/60">
              Expected&nbsp;&nbsp;→&nbsp;&nbsp;{line.expected}
            </div>
          )}
          {line.actual !== undefined && (
            <div className="text-red-400/60">
              Got&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;→&nbsp;&nbsp;{line.actual}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SeparatorRow({ line }: { line: SeparatorLine }) {
  const variantClass = {
    stdout: 'text-[#383850]',
    stderr: 'text-red-900/40',
    compile: 'text-amber-900/40',
  }[line.variant]

  const label = {
    stdout:  '── stdout ─────────',
    stderr:  '── stderr ─────────',
    compile: '── compile error ───',
  }[line.variant]

  return <div className={`my-1 ${variantClass}`}>{label}</div>
}

const TEXT_CLASS: Record<TextLine['type'], string> = {
  stdout:          'text-[#CDD6F4]/80',
  stderr:          'text-red-400',
  system:          'text-brand-orange/70 italic',
  'compile-error': 'text-amber-400',
}

function OutputRow({ line }: { line: OutputLine }) {
  if (line.type === 'test')      return <TestRow line={line} />
  if (line.type === 'separator') return <SeparatorRow line={line} />
  return <div className={TEXT_CLASS[line.type]}>{line.text}</div>
}

// ─── Main component ─────────────────────────────────────────────────────────────

interface ConsoleOutputProps {
  lines: OutputLine[]
  status: ConsoleStatus
  onClear: () => void
}

export function ConsoleOutput({ lines, status, onClear }: ConsoleOutputProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  return (
    <div className="editor-zone flex h-full flex-col bg-[#1E1E2E]">
      {/* Header */}
      <div className="flex h-[30px] shrink-0 items-center border-b border-[#383850] bg-[#262637] px-3">
        <span className="cursor-default border-b-2 border-brand-orange px-3 py-1.5 font-dm-sans text-xs text-[#CDD6F4]">
          Output
        </span>

        <StatusBadge status={status} />

        <button
          type="button"
          onClick={onClear}
          aria-label="Clear console output"
          className="ml-auto text-[#CDD6F4]/20 transition-colors hover:text-[#CDD6F4]/60"
        >
          <Trash2 size={12} aria-hidden="true" />
        </button>
      </div>

      {/* Output area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 font-dm-mono text-xs leading-5">
        {lines.length === 0 ? (
          <div className="pt-8 text-center">
            <p className="text-[#CDD6F4]/12">&gt; run your code to see output</p>
            <p className="mt-1 text-[11px] text-[#CDD6F4]/8">Ctrl+Enter · Cmd+Enter</p>
          </div>
        ) : (
          lines.map((line, i) => <OutputRow key={i} line={line} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
