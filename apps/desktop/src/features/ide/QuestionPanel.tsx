import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { ArrowDown, Clock, History } from 'lucide-react'
import { cn } from '@secureassess/ui'
import type { Question } from '@secureassess/shared-types'
import type { RunResult } from './evaluationService'

interface QuestionPanelProps {
  question: Question
  isLoading?: boolean
  runHistory?: RunResult[]
}

type Tab = 'problem' | 'examples' | 'runs'

const DIFFICULTY_BADGE: Record<Question['difficulty'], string> = {
  easy:   'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-orange-50 text-brand-orange border-orange-200',
  hard:   'bg-red-50 text-red-600 border-red-200',
}

const DIFFICULTY_LABEL: Record<Question['difficulty'], string> = {
  easy:   'Easy',
  medium: 'Medium',
  hard:   'Hard',
}

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'problem',  label: 'Problem'  },
  { key: 'examples', label: 'Examples' },
  { key: 'runs',     label: 'Runs'     },
]

export function QuestionPanel({ question, isLoading = false, runHistory = [] }: QuestionPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>('problem')

  if (isLoading) {
    return (
      <div className="flex h-full flex-col bg-white" aria-busy="true" aria-label="Loading question">
        <div className="px-5 pt-4 pb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="skeleton h-5 w-14 rounded-full" aria-hidden="true" />
            <div className="skeleton h-5 w-14 rounded-full" aria-hidden="true" />
          </div>
          <div className="skeleton h-5 w-3/4 mb-3" aria-hidden="true" />
          <div className="skeleton h-4 w-1/3" aria-hidden="true" />
          <div className="h-px bg-brand-border mt-3" />
        </div>
        <div className="px-5 py-5 space-y-2">
          <div className="skeleton h-4 w-full mb-2" aria-hidden="true" />
          <div className="skeleton h-4 w-5/6 mb-2" aria-hidden="true" />
          <div className="skeleton h-4 w-4/6" aria-hidden="true" />
        </div>
      </div>
    )
  }

  const visibleSamples = question.sampleTests.filter((t) => !t.isHidden)
  const timeLimitSec = Math.round(question.timeLimitMs / 1000)

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Sticky header + tab bar */}
      <div className="sticky top-0 z-10 bg-white">
        {/* Header */}
        <div className="px-5 pt-4 pb-0">
          {/* Meta row */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                'font-dm-mono text-xs rounded-full px-2.5 py-0.5 border',
                DIFFICULTY_BADGE[question.difficulty],
              )}
            >
              {DIFFICULTY_LABEL[question.difficulty]}
            </span>
            <span className="font-dm-mono text-xs rounded-full bg-brand-surface text-brand-navy/60 border border-brand-border px-2.5 py-0.5">
              Coding
            </span>
            <div className="ml-auto flex items-center gap-1">
              <Clock size={12} className="text-brand-navy/40" aria-hidden="true" />
              <span className="font-dm-mono text-xs text-brand-navy/40">{timeLimitSec}s</span>
            </div>
          </div>

          {/* Title */}
          <h2 className="font-display font-bold text-lg text-brand-navy leading-snug">
            {question.title}
          </h2>

          {/* Divider */}
          <div className="h-px bg-brand-border mt-3" />
        </div>

        {/* Tab bar */}
        <div className="flex px-4 bg-white border-b border-brand-border" role="tablist">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={activeTab === key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'relative font-dm-sans text-sm px-3 py-2.5 cursor-pointer transition-colors',
                activeTab === key
                  ? 'text-brand-navy font-medium'
                  : 'text-brand-navy/50 hover:text-brand-navy/80',
              )}
            >
              {label}
              {key === 'runs' && runHistory.length > 0 && (
                <span className="ml-1.5 font-dm-mono text-xs text-brand-orange">
                  {runHistory.length}
                </span>
              )}
              {activeTab === key && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-orange"
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {/* Problem tab */}
        {activeTab === 'problem' && (
          <article className="prose prose-sm max-w-none prose-question leading-7">
            <ReactMarkdown>{question.description}</ReactMarkdown>
          </article>
        )}

        {/* Examples tab */}
        {activeTab === 'examples' && (
          <div>
            {visibleSamples.length === 0 ? (
              <p className="font-dm-sans text-sm text-brand-navy/40 text-center py-8">
                No examples available.
              </p>
            ) : (
              visibleSamples.map((test, i) => (
                <div key={test.id} className="mb-6">
                  <p className="font-dm-mono text-xs text-brand-navy/40 uppercase tracking-wider font-medium mb-3">
                    Example {i + 1}
                  </p>

                  {/* Input */}
                  <div>
                    <p className="font-dm-sans text-xs font-medium text-brand-navy/60 mb-1.5">
                      Input
                    </p>
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-3">
                      <pre className="font-dm-mono text-xs text-brand-navy leading-relaxed whitespace-pre m-0 bg-transparent overflow-x-auto">
                        {test.input}
                      </pre>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowDown
                    size={16}
                    className="text-brand-border mx-auto block my-2"
                    aria-hidden="true"
                  />

                  {/* Output */}
                  <div>
                    <p className="font-dm-sans text-xs font-medium text-brand-navy/60 mb-1.5">
                      Expected Output
                    </p>
                    <div className="bg-brand-surface border border-brand-border rounded-xl p-3">
                      <pre className="font-dm-mono text-xs text-brand-navy leading-relaxed whitespace-pre m-0 bg-transparent overflow-x-auto">
                        {test.expectedOutput}
                      </pre>
                    </div>
                  </div>

                  {/* Divider between examples */}
                  {i < visibleSamples.length - 1 && (
                    <div className="h-px bg-brand-border my-6" />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Runs tab */}
        {activeTab === 'runs' && (
          <div>
            {runHistory.length === 0 ? (
              <div className="text-center pt-10">
                <History
                  size={32}
                  className="text-brand-navy/20 mb-3 mx-auto block"
                  aria-hidden="true"
                />
                <p className="font-dm-sans text-sm text-brand-navy/40">No runs yet</p>
                <p className="font-dm-mono text-xs text-brand-navy/30 mt-1">
                  Press Ctrl+Enter to run your code
                </p>
              </div>
            ) : (
              <div>
                {runHistory.map((run, i) => {
                  const passed = run.outcomes.filter((o) => o.passed).length
                  const total = run.outcomes.length
                  const allPass = passed === total && !run.compile_error
                  const avgTime =
                    total > 0
                      ? Math.round(
                          run.outcomes.reduce((sum, o) => sum + o.execution_time_ms, 0) / total,
                        )
                      : 0

                  return (
                    <div
                      key={i}
                      className="flex items-center px-1 py-3 border-b border-brand-border last:border-0 gap-3"
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full flex-shrink-0',
                          allPass ? 'bg-green-500' : 'bg-red-500',
                        )}
                        aria-label={allPass ? 'Passed' : 'Failed'}
                      />
                      <div>
                        <span className="font-dm-sans text-sm text-brand-navy">
                          {run.compile_error ? 'Compile error' : `${passed}/${total} passed`}
                        </span>
                        {!run.compile_error && (
                          <span className="font-dm-mono text-xs text-brand-navy/40 block">
                            {avgTime}ms
                          </span>
                        )}
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
