import { useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { cn } from '@secureassess/ui'
import type { QuestionForCandidate } from '@secureassess/shared-types'

const DMMONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const DMSANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }

type QuestionStatus = 'not_started' | 'in_progress' | 'completed'

function getStatus(
  questionId: string,
  submittedQuestions: Set<string>,
  answers: Record<string, { answerText?: string; selectedOption?: string; sourceCode?: string }>,
  currentCode: string,
  questionType: string,
  isCurrent: boolean,
): QuestionStatus {
  if (submittedQuestions.has(questionId)) return 'completed'
  const answer = answers[questionId]
  const hasContent =
    questionType === 'coding'
      ? (isCurrent ? currentCode.trim().length > 0 : !!(answer?.sourceCode?.trim()))
      : questionType === 'mcq'
        ? !!answer?.selectedOption
        : !!(answer?.answerText?.trim())
  return hasContent ? 'in_progress' : 'not_started'
}

interface QuestionNavigatorProps {
  questions: QuestionForCandidate[]
  currentIdx: number
  submittedQuestions: Set<string>
  answers: Record<string, { answerText?: string; selectedOption?: string; sourceCode?: string }>
  currentCode: string
  allowNavigation: boolean
  onNavigate: (idx: number) => void
}

export function QuestionNavigator({
  questions,
  currentIdx,
  submittedQuestions,
  answers,
  currentCode,
  allowNavigation,
  onNavigate,
}: QuestionNavigatorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const active = scrollRef.current?.querySelector<HTMLElement>('[data-current="true"]')
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [currentIdx])

  const canGoPrev = allowNavigation && currentIdx > 0
  const canGoNext = allowNavigation && currentIdx < questions.length - 1

  return (
    <Tooltip.Provider delayDuration={300}>
      <div
        className="flex h-11 shrink-0 items-center gap-2 border-b border-[#252535] bg-[#181828] px-4"
        role="navigation"
        aria-label="Question navigation"
      >
        {/* Previous */}
        <button
          type="button"
          onClick={() => canGoPrev && onNavigate(currentIdx - 1)}
          disabled={!canGoPrev}
          aria-label="Previous question"
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white/35 transition-colors hover:bg-white/5 hover:text-white/70 disabled:pointer-events-none disabled:opacity-20"
          style={DMSANS}
        >
          <ChevronLeft size={13} aria-hidden="true" />
          Prev
        </button>

        <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />

        {/* Scrollable question tabs */}
        <div
          ref={scrollRef}
          className="flex flex-1 items-center gap-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          role="tablist"
          aria-label="Questions"
        >
          {questions.map((q, idx) => {
            const isCurrent = idx === currentIdx
            const isSubmitted = submittedQuestions.has(q.id)
            const status = getStatus(q.id, submittedQuestions, answers, currentCode, q.type, isCurrent)

            const dotColor =
              status === 'completed'   ? 'bg-green-400' :
              status === 'in_progress' ? 'bg-brand-orange' :
              'bg-white/15'

            const isClickable = allowNavigation && !isSubmitted && !isCurrent

            return (
              <Tooltip.Root key={q.id}>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    role="tab"
                    data-current={String(isCurrent)}
                    aria-selected={isCurrent}
                    onClick={isClickable ? () => onNavigate(idx) : undefined}
                    className={cn(
                      'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-[11px] font-semibold transition-all duration-150 select-none',
                      isCurrent
                        ? 'bg-brand-orange/12 text-brand-orange ring-1 ring-inset ring-brand-orange/30'
                        : isSubmitted
                          ? 'text-green-400/50 cursor-default'
                          : allowNavigation
                            ? 'text-white/30 hover:bg-white/5 hover:text-white/60 cursor-pointer'
                            : 'text-white/20 cursor-default',
                    )}
                    style={DMMONO}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', dotColor)} aria-hidden="true" />
                    Q{idx + 1}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    side="bottom"
                    sideOffset={6}
                    className="z-50 max-w-[200px] rounded-lg border border-white/8 bg-[#1A1A2E] px-3 py-2 text-left shadow-2xl"
                  >
                    <p className="line-clamp-2 text-[11px] font-medium leading-snug text-white/80" style={DMSANS}>
                      {q.title}
                    </p>
                    <p className="mt-1 text-[10px] capitalize text-white/35" style={DMSANS}>
                      {status.replace('_', ' ')} · {q.weightage}%
                    </p>
                    <Tooltip.Arrow className="fill-[#1A1A2E]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )
          })}
        </div>

        <div className="h-4 w-px shrink-0 bg-white/10" aria-hidden="true" />

        {/* Next */}
        <button
          type="button"
          onClick={() => canGoNext && onNavigate(currentIdx + 1)}
          disabled={!canGoNext}
          aria-label="Next question"
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-white/35 transition-colors hover:bg-white/5 hover:text-white/70 disabled:pointer-events-none disabled:opacity-20"
          style={DMSANS}
        >
          Next
          <ChevronRight size={13} aria-hidden="true" />
        </button>
      </div>
    </Tooltip.Provider>
  )
}
