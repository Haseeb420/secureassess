import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ArrowDown, Clock } from 'lucide-react'
import type { Question } from '@secureassess/shared-types'
import { SkeletonBlock, SkeletonText } from '../../components/Skeleton'
import type { RunResult } from './evaluationService'

interface QuestionPanelProps {
  question: Question
  isLoading?: boolean
  runHistory?: RunResult[]
}

type Tab = 'problem' | 'examples' | 'runs'

const DIFFICULTY_BADGE = {
  easy:   'border-green-200 bg-green-50 text-green-700',
  medium: 'border-brand-orange/30 bg-brand-orange-pale text-brand-orange',
  hard:   'border-red-200 bg-red-50 text-red-600',
}

const DIFFICULTY_LABEL = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'problem',  label: 'Problem'  },
  { key: 'examples', label: 'Examples' },
  { key: 'runs',     label: 'My Runs'  },
]

export function QuestionPanel({ question, isLoading = false, runHistory = [] }: QuestionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('problem')

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-white" aria-busy="true" aria-label="Loading question">
        <div className="border-b border-brand-border px-5 py-3">
          <SkeletonText className="h-5 w-2/3 mb-2" />
          <div className="flex gap-2">
            <SkeletonBlock width="w-16" height="h-5" className="rounded-full" />
            <SkeletonBlock width="w-14" height="h-5" className="rounded-full" />
          </div>
        </div>
        <div className="px-5 py-4 space-y-2">
          <SkeletonText />
          <SkeletonText className="w-5/6" />
          <SkeletonText className="w-4/5" />
          <SkeletonBlock height="h-16" className="mt-3" />
        </div>
      </div>
    )
  }

  const visibleSamples = question.sampleTests.filter((t) => !t.isHidden)

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header — sticky */}
      <div className="sticky top-0 z-10 border-b border-brand-border bg-white px-5 py-3">
        <h2 className="line-clamp-2 text-base font-semibold leading-snug text-brand-navy">
          {question.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={[
              'rounded-full border px-2.5 py-0.5 text-xs font-medium',
              DIFFICULTY_BADGE[question.difficulty],
            ].join(' ')}
          >
            {DIFFICULTY_LABEL[question.difficulty]}
          </span>
          <span className="rounded-full border border-brand-border bg-brand-surface px-2.5 py-0.5 text-xs text-brand-navy/60">
            Coding
          </span>
          <span className="flex items-center gap-1 text-xs text-brand-navy/50">
            <Clock size={11} aria-hidden="true" />
            {question.timeLimitMs / 1000}s limit
          </span>
        </div>
      </div>

      {/* Tab bar — sticky */}
      <div className="sticky top-[65px] z-10 flex border-b border-brand-border bg-brand-surface">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={[
              'px-4 py-2.5 text-sm transition-colors',
              activeTab === key
                ? 'border-b-2 border-brand-orange bg-white text-brand-orange'
                : 'text-brand-navy/60 hover:text-brand-navy',
            ].join(' ')}
          >
            {label}
            {key === 'runs' && runHistory.length > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-orange-pale px-1.5 py-0.5 text-xs text-brand-orange">
                {runHistory.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'problem' && (
          <div className="px-5 py-4">
            <article className="prose-content">
              <ReactMarkdown>{question.description}</ReactMarkdown>
            </article>
          </div>
        )}

        {activeTab === 'examples' && (
          <div className="px-5 py-4 space-y-3">
            {visibleSamples.length === 0 ? (
              <p className="text-sm text-brand-navy/40 text-center py-8">No examples available.</p>
            ) : (
              visibleSamples.map((test, i) => (
                <div
                  key={test.id}
                  className="rounded-xl border border-brand-border bg-brand-surface p-4"
                >
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                    Example {i + 1}
                  </p>

                  <p className="mb-1 text-xs font-medium text-brand-navy/50">Input</p>
                  <pre className="mb-3 overflow-x-auto rounded-lg border border-brand-border bg-white p-3 font-mono text-xs text-brand-navy">
                    {test.input}
                  </pre>

                  <div className="mb-3 flex justify-center">
                    <ArrowDown size={14} className="text-brand-navy/30" aria-hidden="true" />
                  </div>

                  <p className="mb-1 text-xs font-medium text-brand-navy/50">Expected Output</p>
                  <pre className="overflow-x-auto rounded-lg border border-brand-border bg-white p-3 font-mono text-xs text-brand-navy">
                    {test.expectedOutput}
                  </pre>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'runs' && (
          <div className="px-5 py-4">
            {runHistory.length === 0 ? (
              <p className="py-8 text-center text-sm text-brand-navy/40">
                No runs yet. Press ⌘ Enter to run your code.
              </p>
            ) : (
              <div className="space-y-2">
                {runHistory.map((run, i) => {
                  const passed = run.outcomes.filter((o) => o.passed).length
                  const total = run.outcomes.length
                  const allPass = passed === total && !run.compile_error
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={[
                            'text-sm font-medium',
                            allPass ? 'text-green-600' : 'text-red-500',
                          ].join(' ')}
                        >
                          {allPass ? '✓' : '✗'}
                        </span>
                        <span className="text-xs text-brand-navy/70">
                          {run.compile_error ? 'Compile error' : `${passed}/${total} passed`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
