import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { cn } from '@secureassess/ui'
import type { QuestionForCandidate } from '@secureassess/shared-types'

const DMMONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }
const DMSANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }

type QuestionStatus = 'not_started' | 'in_progress' | 'completed'

function getQuestionStatus(
  questionId: string,
  submittedQuestions: Set<string>,
  answers: Record<string, { answerText?: string; selectedOption?: string; sourceCode?: string }>,
  currentCode: string,
  questionType: string,
  isCurrentQuestion: boolean,
): QuestionStatus {
  if (submittedQuestions.has(questionId)) return 'completed'

  const answer = answers[questionId]
  const hasAnswer =
    questionType === 'coding'
      ? (isCurrentQuestion ? currentCode.trim().length > 0 : !!(answer?.sourceCode?.trim()))
      : questionType === 'mcq'
        ? !!answer?.selectedOption
        : !!(answer?.answerText?.trim())

  return hasAnswer ? 'in_progress' : 'not_started'
}

const STATUS_DOT: Record<QuestionStatus, string> = {
  not_started: 'bg-white/15',
  in_progress:  'bg-brand-orange',
  completed:    'bg-green-400',
}

const TYPE_LABEL: Record<string, string> = {
  coding: 'Code',
  mcq:    'MCQ',
  text:   'Text',
}

interface QuestionNavPanelProps {
  questions: QuestionForCandidate[]
  currentIdx: number
  submittedQuestions: Set<string>
  answers: Record<string, { answerText?: string; selectedOption?: string; sourceCode?: string }>
  currentCode: string
  onNavigate: (idx: number) => void
}

export function QuestionNavPanel({
  questions,
  currentIdx,
  submittedQuestions,
  answers,
  currentCode,
  onNavigate,
}: QuestionNavPanelProps) {
  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-r border-brand-border bg-brand-surface overflow-y-auto">
      <div className="px-3 py-3 border-b border-brand-border">
        <p
          className="text-[10px] font-semibold uppercase tracking-widest text-brand-navy/40"
          style={DMSANS}
        >
          Questions
        </p>
      </div>

      <div className="flex flex-col gap-0.5 p-2">
        {questions.map((q, idx) => {
          const isCurrent = idx === currentIdx
          const status = getQuestionStatus(
            q.id,
            submittedQuestions,
            answers,
            currentCode,
            q.type,
            isCurrent,
          )

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onNavigate(idx)}
              disabled={submittedQuestions.has(q.id)}
              aria-current={isCurrent ? 'step' : undefined}
              aria-label={`Question ${idx + 1}: ${q.title}`}
              className={cn(
                'group flex w-full flex-col gap-1 rounded-lg px-3 py-2.5 text-left transition-all',
                isCurrent
                  ? 'bg-brand-orange/10 ring-1 ring-brand-orange/30'
                  : 'hover:bg-white/5',
                submittedQuestions.has(q.id) && 'cursor-not-allowed opacity-60',
              )}
            >
              {/* Row 1: number + status dot */}
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'text-[11px] font-semibold',
                    isCurrent ? 'text-brand-orange' : 'text-brand-navy/50',
                  )}
                  style={DMMONO}
                >
                  Q{idx + 1}
                </span>

                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-medium',
                      q.type === 'coding' && 'bg-blue-50 text-blue-600',
                      q.type === 'mcq'    && 'bg-violet-50 text-violet-600',
                      q.type === 'text'   && 'bg-amber-50 text-amber-600',
                    )}
                    style={DMSANS}
                  >
                    {TYPE_LABEL[q.type] ?? q.type}
                  </span>

                  {status === 'completed' ? (
                    <CheckCircle2 size={11} className="text-green-400 shrink-0" aria-hidden="true" />
                  ) : status === 'in_progress' ? (
                    <Clock size={11} className="text-brand-orange shrink-0" aria-hidden="true" />
                  ) : (
                    <Circle size={11} className="text-white/20 shrink-0" aria-hidden="true" />
                  )}
                </div>
              </div>

              {/* Row 2: title */}
              <p
                className={cn(
                  'truncate text-[11px] leading-snug',
                  isCurrent ? 'text-brand-navy/80' : 'text-brand-navy/45',
                )}
                style={DMSANS}
              >
                {q.title}
              </p>

              {/* Row 3: weightage */}
              <p
                className={cn(
                  'text-[10px]',
                  isCurrent ? 'text-brand-orange/70' : 'text-brand-navy/25',
                )}
                style={DMMONO}
              >
                {q.weightage}%
              </p>
            </button>
          )
        })}
      </div>

      {/* Status legend */}
      <div className="mt-auto border-t border-brand-border p-3">
        <div className="flex flex-col gap-1.5">
          {([
            ['not_started', 'Not started'],
            ['in_progress', 'In progress'],
            ['completed',   'Submitted'],
          ] as [QuestionStatus, string][]).map(([s, label]) => (
            <div key={s} className="flex items-center gap-2">
              <div className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[s])} />
              <span className="text-[10px] text-brand-navy/30" style={DMSANS}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
