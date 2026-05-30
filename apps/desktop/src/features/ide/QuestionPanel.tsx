import ReactMarkdown from 'react-markdown'
import type { Question } from '@secureassess/shared-types'
import { SkeletonBlock, SkeletonText } from '../../components/Skeleton'

interface QuestionPanelProps {
  question: Question
  isLoading?: boolean
}

const DIFFICULTY_CLASS = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-brand-orange-pale text-brand-orange',
  hard:   'bg-red-100 text-red-700',
}

const DIFFICULTY_LABEL = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

export function QuestionPanel({ question, isLoading = false }: QuestionPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto bg-brand-surface px-5 py-4" aria-busy="true" aria-label="Loading question">
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
    <div className="h-full overflow-y-auto border-r border-brand-border bg-white px-6 py-4 text-sm">
      {/* Title + badge */}
      <div className="mb-3 flex items-start gap-3">
        <h2 className="flex-1 text-lg font-semibold leading-snug text-brand-navy">
          {question.title}
        </h2>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${DIFFICULTY_CLASS[question.difficulty]}`}
        >
          {DIFFICULTY_LABEL[question.difficulty]}
        </span>
      </div>

      {/* Limits */}
      <div className="mb-4 flex gap-4 text-xs text-brand-navy/40">
        <span>Time: {question.timeLimitMs}ms</span>
        <span>Memory: {question.memoryLimitMb}MB</span>
      </div>

      {/* Description */}
      <div className="prose prose-sm max-w-none mb-6 text-brand-navy/80">
        <ReactMarkdown>{question.description}</ReactMarkdown>
      </div>

      {/* Sample tests */}
      {question.sampleTests.filter((t) => !t.isHidden).length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-navy">
            Sample Tests
          </h3>
          <div className="space-y-3">
            {question.sampleTests
              .filter((t) => !t.isHidden)
              .map((test, i) => (
                <div key={test.id} className="rounded-lg border border-brand-border bg-brand-surface p-3">
                  <p className="mb-2 text-xs font-medium text-brand-navy/50">Test {i + 1}</p>
                  <div className="mb-2">
                    <p className="mb-0.5 text-xs font-medium text-brand-navy/50">Input:</p>
                    <pre className="overflow-x-auto rounded font-mono text-xs text-brand-navy/80">
                      {test.input}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-0.5 text-xs font-medium text-brand-navy/50">Expected Output:</p>
                    <pre className="overflow-x-auto rounded font-mono text-xs text-brand-navy/80">
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
