import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Minus,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { cn } from '@secureassess/ui'
import type { MockQuestionResult, MockTestOutcome } from '@secureassess/shared-types'
import { useAssessmentStore } from '../store/assessmentStore'

const SYNE   = { fontFamily: "'Syne', system-ui, sans-serif" } as const
const DMSANS = { fontFamily: "'DM Sans', system-ui, sans-serif" } as const
const DMMONO = { fontFamily: "'DM Mono', 'Courier New', monospace" } as const

function ResultIndicator({ result }: { result: MockQuestionResult }) {
  if (result.questionType === 'text') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-brand-navy/40" style={DMSANS}>
        <Minus size={14} aria-hidden="true" />
        Manual review
      </span>
    )
  }
  if (result.questionType === 'mcq') {
    return result.isCorrect ? (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-600" style={DMSANS}>
        <CheckCircle2 size={14} aria-hidden="true" />
        Correct
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-xs font-medium text-red-500" style={DMSANS}>
        <XCircle size={14} aria-hidden="true" />
        Incorrect
      </span>
    )
  }
  if (result.questionType === 'coding' && result.testOutcomes) {
    const passed = result.testOutcomes.filter((o) => o.passed).length
    const total  = result.testOutcomes.length
    if (passed === total && total > 0) {
      return (
        <span className="flex items-center gap-1.5 text-xs font-medium text-green-600" style={DMSANS}>
          <CheckCircle2 size={14} aria-hidden="true" />
          All passed
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500" style={DMSANS}>
        <AlertCircle size={14} aria-hidden="true" />
        {passed}/{total} tests
      </span>
    )
  }
  return null
}

function MCQReveal({ result }: { result: MockQuestionResult }) {
  const selectedId = result.yourAnswer.selectedOption
  const correctId  = result.correctOption?.id

  // We need the full options list — not stored in results. Reconstruct from what we have.
  // We know: selected option (possibly wrong) and the correct option. Show at minimum those.
  const options: Array<{ id: string; text: string; isSelected: boolean; isCorrect: boolean }> = []

  if (selectedId && selectedId !== correctId) {
    options.push({ id: selectedId, text: selectedId, isSelected: true, isCorrect: false })
  }
  if (result.correctOption) {
    options.push({
      id:         result.correctOption.id,
      text:       result.correctOption.text,
      isSelected: selectedId === result.correctOption.id,
      isCorrect:  true,
    })
  }

  if (options.length === 0) {
    return <p className="text-sm text-brand-navy/50 italic" style={DMSANS}>No options to display.</p>
  }

  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div
          key={opt.id}
          className={cn(
            'flex items-start gap-3 rounded-lg border-l-4 px-4 py-3',
            opt.isCorrect
              ? 'border-green-500 bg-green-50'
              : opt.isSelected && !opt.isCorrect
                ? 'border-red-400 bg-red-50'
                : 'border-brand-border bg-brand-surface',
          )}
        >
          {opt.isCorrect ? (
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
          ) : opt.isSelected ? (
            <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
          ) : null}
          <span
            className={cn(
              'text-sm leading-relaxed',
              opt.isCorrect ? 'font-medium text-green-800' : opt.isSelected ? 'text-red-800' : 'text-brand-navy',
            )}
            style={DMSANS}
          >
            {opt.text}
            {opt.isCorrect && (
              <span className="ml-2 text-xs font-normal text-green-600">— Correct answer</span>
            )}
            {opt.isSelected && !opt.isCorrect && (
              <span className="ml-2 text-xs font-normal text-red-500">— Your answer</span>
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function CodingReveal({ result }: { result: MockQuestionResult }) {
  const code     = result.yourAnswer.sourceCode ?? ''
  const language = result.yourAnswer.language ?? ''
  const outcomes = result.testOutcomes ?? []

  return (
    <div className="space-y-4">
      {/* Source code */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-brand-navy/40" style={DMMONO}>
          Your Code ({language})
        </p>
        <pre
          className="overflow-x-auto rounded-lg bg-brand-navy/5 p-4 text-xs leading-relaxed text-brand-navy"
          style={{ fontFamily: "'DM Mono', 'Courier New', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
        >
          {code || '(no code submitted)'}
        </pre>
      </div>

      {/* Test case table */}
      {outcomes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-navy/40" style={DMMONO}>
            Test Results
          </p>
          <div className="overflow-hidden rounded-lg border border-brand-border">
            <table className="w-full text-xs" style={DMMONO}>
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface/70">
                  {['#', 'Input', 'Expected', 'Got', 'Time', 'Result'].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-brand-navy/40"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {outcomes.map((o: MockTestOutcome) => (
                  <tr
                    key={o.index}
                    className={cn(
                      'border-b border-brand-border last:border-0',
                      o.passed ? 'bg-green-50/50' : 'bg-red-50/50',
                    )}
                  >
                    <td className="px-3 py-2 text-brand-navy/60">{o.index}</td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-brand-navy/70" title={o.input}>
                      {o.input || '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-brand-navy/70" title={o.expectedOutput}>
                      {o.expectedOutput || '—'}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-brand-navy/70" title={o.actualOutput}>
                      {o.actualOutput || '—'}
                    </td>
                    <td className="px-3 py-2 text-brand-navy/60">{o.timeMsec}ms</td>
                    <td className="px-3 py-2">
                      {o.passed ? (
                        <span className="font-medium text-green-600">Pass</span>
                      ) : (
                        <span className="font-medium text-red-500">Fail</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function TextReveal({ result }: { result: MockQuestionResult }) {
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/40" style={DMMONO}>
        Your Answer
      </p>
      <blockquote className="rounded-lg border-l-4 border-brand-border bg-brand-surface px-4 py-3 text-sm leading-relaxed text-brand-navy/80" style={DMSANS}>
        {result.yourAnswer.answerText || <em className="text-brand-navy/40">No answer submitted</em>}
      </blockquote>
      <p className="text-xs text-brand-navy/40 italic" style={DMSANS}>
        This answer will be reviewed manually if submitted in the real assessment.
      </p>
    </div>
  )
}

function QuestionCard({ result, index }: { result: MockQuestionResult; index: number }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
      {/* Card header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-brand-surface/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1 pr-4">
          <p className="text-[10px] uppercase tracking-wider text-brand-navy/40" style={DMMONO}>
            Question {index}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-brand-navy" style={DMSANS}>
            {result.questionTitle}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <ResultIndicator result={result} />
          <ChevronDown
            size={15}
            className={cn('text-brand-navy/40 transition-transform duration-200', expanded && 'rotate-180')}
            aria-hidden="true"
          />
        </div>
      </button>

      {/* Expanded content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="border-t border-brand-border px-5 pb-5 pt-4">
              {result.questionType === 'mcq'    && <MCQReveal    result={result} />}
              {result.questionType === 'coding' && <CodingReveal result={result} />}
              {result.questionType === 'text'   && <TextReveal   result={result} />}
              {result.explanation && (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider" style={DMMONO}>
                    Explanation
                  </p>
                  <p className="mt-1 text-sm text-blue-800 leading-relaxed" style={DMSANS}>
                    {result.explanation}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MockResultsPage() {
  const navigate  = useNavigate()
  const { mockResults, clearAttempt } = useAssessmentStore()
  const results   = mockResults ?? []

  const mcqResults = results.filter((r) => r.questionType === 'mcq')
  const mcqCorrect = mcqResults.filter((r) => r.isCorrect).length

  const codingResults = results.filter((r) => r.questionType === 'coding')
  const totalTests    = codingResults.reduce((s, r) => s + (r.testOutcomes?.length ?? 0), 0)
  const passedTests   = codingResults.reduce((s, r) => s + (r.testOutcomes?.filter((o) => o.passed).length ?? 0), 0)

  const handleBackToPortal = () => {
    clearAttempt()
    navigate('/landing', { replace: true })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-brand-surface">
      {/* TopBar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.08] bg-brand-navy px-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={18} className="text-white/40" aria-hidden="true" />
          <span className="text-[14px] font-semibold text-white" style={SYNE}>
            Practice Results
          </span>
        </div>

        <span
          className="rounded-full border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300"
          style={DMMONO}
        >
          Practice Round — Not Recorded
        </span>

        <button
          type="button"
          onClick={handleBackToPortal}
          className="rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-medium text-white/70 hover:border-white/30 hover:text-white transition-colors"
          style={DMSANS}
        >
          Back to Portal →
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-8">

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <h1 className="text-2xl font-bold text-brand-navy" style={SYNE}>
              Practice Complete
            </h1>
            <p className="mt-1 text-sm text-brand-navy/60" style={DMSANS}>
              Your answers are shown below with correct solutions. This is for learning only.
            </p>
          </motion.div>

          {/* Summary card */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.06 }}
            className="mt-6 flex items-center justify-between rounded-2xl border border-brand-border bg-white p-5 shadow-sm"
          >
            <span className="text-sm text-brand-navy/70" style={DMSANS}>
              Questions answered: <strong>{results.length}</strong>
            </span>
            <div className="flex gap-4 text-sm" style={DMSANS}>
              {mcqResults.length > 0 && (
                <span className="text-brand-navy/70">
                  MCQ: <strong>{mcqCorrect}</strong>/{mcqResults.length} correct
                </span>
              )}
              {codingResults.length > 0 && totalTests > 0 && (
                <span className="text-brand-navy/70">
                  Coding: <strong>{passedTests}</strong>/{totalTests} tests passed
                </span>
              )}
            </div>
          </motion.div>

          {/* Per-question results */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="mt-6 space-y-3"
          >
            {results.length === 0 ? (
              <div className="rounded-2xl border border-brand-border bg-white p-8 text-center">
                <p className="text-sm text-brand-navy/50" style={DMSANS}>
                  No results to display.
                </p>
              </div>
            ) : (
              results.map((result, i) => (
                <QuestionCard key={result.questionId} result={result} index={i + 1} />
              ))
            )}
          </motion.div>

          {/* Bottom CTA */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            className="mt-6 rounded-2xl border border-brand-border bg-white p-5 text-center shadow-sm"
          >
            <h2 className="font-semibold text-brand-navy" style={SYNE}>
              Ready to take the real assessment?
            </h2>
            <p className="mt-1 text-sm text-brand-navy/60" style={DMSANS}>
              When you're ready, return to the portal and click Begin Assessment.
            </p>
            <button
              type="button"
              onClick={handleBackToPortal}
              className="mt-4 rounded-xl bg-brand-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors"
              style={DMSANS}
            >
              Back to Portal →
            </button>
          </motion.div>

          <div className="h-8" />
        </div>
      </div>
    </div>
  )
}
