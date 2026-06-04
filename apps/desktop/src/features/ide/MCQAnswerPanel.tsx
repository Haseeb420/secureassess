import { cn } from '@secureassess/ui'
import type { QuestionForCandidate } from '@secureassess/shared-types'

const DMMONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const DMSANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }

interface MCQAnswerPanelProps {
  question: QuestionForCandidate
  selectedOption: string | undefined
  onSelect: (optionId: string) => void
}

export function MCQAnswerPanel({ question, selectedOption, onSelect }: MCQAnswerPanelProps) {
  const options = question.options ?? []

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center border-b border-brand-border bg-brand-surface px-5 py-3">
        <span
          className="text-xs uppercase tracking-wider text-brand-navy/50"
          style={DMSANS}
        >
          Choose your answer
        </span>
        <span className="ml-auto text-xs text-brand-navy/40" style={DMMONO}>
          Weightage: {question.weightage}%
        </span>
      </div>

      {/* Options */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-3">
          {options.map((option) => {
            const isSelected = selectedOption === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={cn(
                  'flex w-full cursor-pointer items-start gap-4 rounded-xl border px-5 py-4 text-left transition-all duration-150',
                  isSelected
                    ? 'border-2 border-brand-orange bg-orange-50/30'
                    : 'border-brand-border bg-white hover:border-brand-navy/30 hover:bg-brand-surface',
                )}
              >
                {/* Radio circle */}
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isSelected
                      ? 'border-brand-orange bg-brand-orange'
                      : 'border-brand-border bg-white',
                  )}
                >
                  {isSelected && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                </span>

                {/* Option text */}
                <span
                  className="text-sm leading-relaxed text-brand-navy"
                  style={DMSANS}
                >
                  {option.text}
                </span>
              </button>
            )
          })}

          {options.length === 0 && (
            <p className="py-8 text-center text-sm text-brand-navy/40" style={DMSANS}>
              No options available for this question.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
