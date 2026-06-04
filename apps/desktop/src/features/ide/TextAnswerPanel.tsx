import { AlertCircle } from 'lucide-react'
import type { QuestionForCandidate } from '@secureassess/shared-types'

const DMMONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const DMSANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }

interface TextAnswerPanelProps {
  question: QuestionForCandidate
  answerText: string
  onChange: (text: string) => void
}

export function TextAnswerPanel({ question, answerText, onChange }: TextAnswerPanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-brand-border bg-brand-surface px-5 py-3">
        <span
          className="text-xs uppercase tracking-wider text-brand-navy/50"
          style={DMSANS}
        >
          Your answer
        </span>
        <span className="ml-auto text-xs text-brand-navy/40" style={DMMONO}>
          Weightage: {question.weightage}%
        </span>
      </div>

      {/* Manual review notice */}
      <div className="mx-5 mt-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <AlertCircle
          size={14}
          className="mt-0.5 shrink-0 text-amber-500"
          aria-hidden="true"
        />
        <p className="text-xs leading-relaxed text-amber-700" style={DMSANS}>
          This question is reviewed manually. Write clearly and thoroughly.
        </p>
      </div>

      {/* Textarea */}
      <div className="mx-5 my-4 flex flex-1 flex-col">
        <textarea
          value={answerText}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer here. Be clear and structured in your response."
          aria-label="Written answer"
          className="w-full flex-1 resize-y rounded-xl border border-brand-border p-4 text-sm leading-relaxed text-brand-navy outline-none transition-colors placeholder:text-brand-navy/30 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/10"
          style={{ ...DMSANS, minHeight: '280px' }}
        />

        {/* Character count */}
        <p
          className="mt-1.5 text-right text-xs text-brand-navy/40"
          style={DMMONO}
          aria-live="polite"
        >
          {answerText.length} characters
        </p>
      </div>
    </div>
  )
}
