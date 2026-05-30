import ReactMarkdown from 'react-markdown'
import type { Question } from '@secureassess/shared-types'
import { SkeletonBlock, SkeletonText } from '../../components/Skeleton'

interface QuestionPanelProps {
  question: Question
  isLoading?: boolean
}

const DIFFICULTY_CLASS = {
  easy: 'bg-green-900/50 text-green-300',
  medium: 'bg-brand-orange/20 text-brand-orange',
  hard: 'bg-red-900/50 text-red-300',
}

const DIFFICULTY_LABEL = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export function QuestionPanel({ question, isLoading = false }: QuestionPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-brand-navy-dark px-5 py-4" aria-busy="true" aria-label="Loading question">
        <div className="mb-4 flex items-center gap-3">
          <SkeletonText className="h-5 w-2/3" />
          <SkeletonBlock width="w-16" height="h-5" className="rounded-full" />
        </div>
        <div className="mb-6 flex gap-4">
          <SkeletonText className="w-20" />
          <SkeletonText className="w-24" />
        </div>
        <div className="mb-4 space-y-2">
          <SkeletonText />
          <SkeletonText className="w-5/6" />
          <SkeletonText className="w-4/5" />
        </div>
        <SkeletonBlock height="h-16" className="mb-3" />
        <SkeletonBlock height="h-16" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-brand-navy-dark px-5 py-4 text-sm text-white/80">
      {/* Title + badge */}
      <div className="mb-3 flex items-start gap-3">
        <h2 className="flex-1 text-base font-semibold text-white leading-snug">
          {question.title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_CLASS[question.difficulty]}`}
        >
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </div>

      {/* Limits */}
      <div className="mb-4 flex gap-4 text-xs text-white/40">
        <span>Time: {question.timeLimitMs}ms</span>
        <span>Memory: {question.memoryLimitMb}MB</span>
      </div>

      {/* Description */}
      <div className="prose prose-invert prose-sm max-w-none mb-6">
        <ReactMarkdown>{question.description}</ReactMarkdown>
      </div>

      {/* Sample tests */}
      {question.sampleTests.filter((t) => !t.isHidden).length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-orange">
            Sample Tests
          </h3>
          <div className="space-y-4">
            {question.sampleTests
              .filter((t) => !t.isHidden)
              .map((test, i) => (
                <div key={test.id} className="rounded-md border border-brand-navy-light bg-brand-navy-mid p-3">
                  <p className="mb-1 text-xs font-medium text-white/60">Test {i + 1}</p>
                  <div className="mb-2">
                    <p className="mb-0.5 text-xs text-white/40">Input:</p>
                    <pre className="overflow-x-auto rounded bg-brand-navy px-3 py-2 text-xs text-white/80">
                      {test.input}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs text-white/40">Expected Output:</p>
                    <pre className="overflow-x-auto rounded bg-brand-navy px-3 py-2 text-xs text-white/80">
                      {test.expectedOutput}
                    </pre>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
