'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Badge, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../../components/PageHeader'
import { attemptsApi, type AttemptDetail, type AnswerDetail, type McqOption } from '../../../../lib/api'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m < 1) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

function scoreColor(score: number | undefined | null): string {
  if (score == null) return 'text-brand-navy'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-brand-orange'
  return 'text-red-500'
}

const TYPE_BADGE: Record<string, { label: string; variant: 'blue' | 'orange' | 'neutral' }> = {
  coding: { label: 'Coding', variant: 'blue' },
  mcq:    { label: 'MCQ',    variant: 'orange' },
  text:   { label: 'Text',   variant: 'neutral' },
}

export default function AttemptDetailPage() {
  const { attemptId } = useParams<{ attemptId: string }>()
  const qc = useQueryClient()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['attempt', attemptId],
    queryFn: () => attemptsApi.get(attemptId),
  })

  const scoreAnswer = useMutation({
    mutationFn: ({ answerId, score }: { answerId: string; score: number }) =>
      attemptsApi.scoreAnswer(attemptId, answerId, score),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attempt', attemptId] })
      toast.success('Score saved')
    },
    onError: () => toast.error('Failed to save score'),
  })

  if (isLoading) return <LoadingSkeleton />
  if (!data) return <div className="p-8 text-red-500">Attempt not found.</div>

  const finalScore = data.final_score
  const pendingCount = data.answers.filter(
    (a) => a.question_type === 'text' && a.manual_score == null,
  ).length

  return (
    <div className="min-h-full">
      <PageHeader
        title="Attempt Detail"
        subtitle={`${data.candidate_name} · ${data.assessment_title ?? data.assessment_id}`}
        breadcrumbs={[
          { label: 'Results', href: '/dashboard/results' },
          { label: data.candidate_name },
        ]}
      />

      <div className="p-8 space-y-6 max-w-5xl">
        {/* Top section: two columns */}
        <div className="grid grid-cols-2 gap-4">
          {/* Score card */}
          <div className="rounded-2xl border border-brand-border bg-white p-6 shadow-sm">
            <p className="font-dm-sans text-xs font-medium uppercase tracking-wider text-brand-navy/50">
              FINAL SCORE
            </p>
            <p className={`mt-1 font-syne text-6xl font-bold ${scoreColor(finalScore)}`}>
              {finalScore != null ? `${finalScore.toFixed(1)}%` : '—'}
            </p>
            <p className="mt-2 font-dm-sans text-sm text-brand-navy/60">{data.candidate_name}</p>
            <p className="mt-0.5 font-dm-sans text-xs text-brand-navy/40">
              {data.assessment_title ?? '—'}&nbsp;·&nbsp;Attempt {data.attempt_number} of{' '}
              {data.usage_limit ?? '?'}
            </p>
            {data.completed_at && (
              <p className="mt-0.5 font-dm-sans text-xs text-brand-navy/40">
                Completed {format(new Date(data.completed_at), 'MMM d, yyyy HH:mm')}&nbsp;·&nbsp;
                {data.total_time_secs != null ? formatDuration(data.total_time_secs) : '—'}
              </p>
            )}
          </div>

          {/* Stats card */}
          <div className="rounded-2xl border border-brand-border bg-white p-5 shadow-sm space-y-3">
            {[
              { label: 'Total questions', value: String(data.answers.length) },
              {
                label: 'Auto-scored',
                value: String(data.answers.filter((a) => a.question_type !== 'text').length),
              },
              {
                label: 'Manually scored',
                value: String(
                  data.answers.filter((a) => a.question_type === 'text' && a.manual_score != null).length,
                ),
              },
              {
                label: 'Pending review',
                value: String(pendingCount),
                warn: pendingCount > 0,
              },
              {
                label: 'Token used',
                value: `Attempt ${data.attempt_number} of ${data.usage_limit ?? '?'}`,
              },
            ].map(({ label, value, warn }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-dm-sans text-sm text-brand-navy/60">{label}</span>
                <span
                  className={`font-dm-mono text-sm font-medium ${
                    warn ? 'text-amber-600' : 'text-brand-navy'
                  }`}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Score breakdown table */}
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_80px_1fr_90px_70px_90px_36px] gap-4 border-b border-brand-border bg-brand-surface px-5 py-3">
            {['Question', 'Type', 'Answer Summary', 'Score', 'Weight', 'Weighted', ''].map((h) => (
              <span key={h} className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                {h}
              </span>
            ))}
          </div>

          {data.answers.map((answer) => {
            const isExpanded = expandedId === answer.id
            const typeCfg = TYPE_BADGE[answer.question_type] ?? { label: answer.question_type, variant: 'neutral' as const }

            return (
              <div key={answer.id}>
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : answer.id)}
                  className="grid w-full grid-cols-[1fr_80px_1fr_90px_70px_90px_36px] items-center gap-4 border-b border-brand-border px-5 py-4 text-left last:border-0 hover:bg-brand-surface/40 transition-colors"
                  aria-expanded={isExpanded}
                >
                  {/* Question title */}
                  <div>
                    <p className="truncate text-sm font-medium text-brand-navy">
                      {answer.question_title ?? answer.question_id}
                    </p>
                  </div>

                  {/* Type badge */}
                  <div>
                    <Badge variant={typeCfg.variant}>{typeCfg.label}</Badge>
                  </div>

                  {/* Answer summary */}
                  <p className="truncate font-dm-mono text-xs text-brand-navy/60">
                    <AnswerSummary answer={answer} />
                  </p>

                  {/* Score */}
                  <div>
                    {answer.question_type === 'text' && answer.manual_score == null ? (
                      <span className="flex items-center gap-1 font-dm-mono text-xs text-amber-600">
                        <AlertCircle size={12} aria-hidden="true" />
                        Pending
                      </span>
                    ) : (
                      <span
                        className={`font-dm-mono text-sm font-semibold ${scoreColor(
                          answer.question_type === 'text'
                            ? answer.manual_score
                            : answer.auto_score,
                        )}`}
                      >
                        {answer.question_type === 'text'
                          ? answer.manual_score != null
                            ? `${answer.manual_score.toFixed(0)}%`
                            : '—'
                          : answer.auto_score != null
                          ? `${answer.auto_score.toFixed(0)}%`
                          : '—'}
                      </span>
                    )}
                  </div>

                  {/* Weightage */}
                  <span className="font-dm-mono text-sm text-brand-navy/70">
                    {answer.question_weightage != null
                      ? `${answer.question_weightage.toFixed(0)}%`
                      : '—'}
                  </span>

                  {/* Weighted score */}
                  <span className="font-dm-mono text-sm text-brand-navy/70">
                    {answer.weighted_score != null
                      ? `${answer.weighted_score.toFixed(1)}%`
                      : '—'}
                  </span>

                  {/* Expand toggle */}
                  <span className="flex items-center justify-center text-brand-navy/30">
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden border-b border-brand-border bg-brand-surface/30 last:border-0"
                    >
                      <AnswerDetail
                        answer={answer}
                        attemptId={attemptId}
                        onSaveScore={(score) =>
                          scoreAnswer.mutate({ answerId: answer.id, score })
                        }
                        saving={scoreAnswer.isPending}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}

          {/* Totals footer */}
          <div className="flex items-center justify-between border-t border-brand-border bg-brand-surface px-5 py-3">
            <span className="font-dm-sans text-sm text-brand-navy/60">Total weighted score:</span>
            <span className={`font-syne text-base font-bold ${scoreColor(finalScore)}`}>
              {finalScore != null ? `${finalScore.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function AnswerSummary({ answer }: { answer: AnswerDetail }) {
  if (answer.question_type === 'coding') {
    const passed = answer.test_results?.filter((t) => t.passed).length ?? 0
    const total = answer.test_results?.length ?? 0
    const lang = answer.language ?? 'code'
    return <>{lang} · {passed}/{total} tests passed</>
  }
  if (answer.question_type === 'mcq') {
    return <>{answer.selected_option ?? '—'}</>
  }
  const text = answer.answer_text ?? ''
  return <>{text.length > 60 ? `${text.slice(0, 60)}…` : text || '—'}</>
}

function AnswerDetail({
  answer,
  attemptId,
  onSaveScore,
  saving,
}: {
  answer: AnswerDetail
  attemptId: string
  onSaveScore: (score: number) => void
  saving: boolean
}) {
  const [scoreInput, setScoreInput] = useState<string>(
    answer.manual_score != null ? String(answer.manual_score) : '',
  )

  if (answer.question_type === 'coding') {
    return (
      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="mb-2 font-dm-sans text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
            Source code submitted
          </p>
          <pre className="overflow-x-auto rounded-xl border border-[#383850] bg-[#1E1E2E] p-4 font-dm-mono text-xs leading-relaxed text-[#CDD6F4]">
            {answer.source_code ?? '(no code)'}
          </pre>
        </div>

        {answer.test_results && answer.test_results.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-brand-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-brand-border bg-[#262637] text-[#CDD6F4]/60">
                  {['Input', 'Expected', 'Actual', 'Result', 'Time'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {answer.test_results.map((tc, i) => (
                  <tr
                    key={i}
                    className={`border-b border-brand-border last:border-0 ${
                      tc.passed ? 'border-l-2 border-l-green-400' : 'border-l-2 border-l-red-400'
                    }`}
                  >
                    <td className="px-3 py-2 font-dm-mono text-brand-navy/70">{tc.input ?? '—'}</td>
                    <td className="px-3 py-2 font-dm-mono text-brand-navy/70">{tc.expected_output ?? '—'}</td>
                    <td className="px-3 py-2 font-dm-mono text-brand-navy/70">{tc.actual_output ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`font-semibold ${tc.passed ? 'text-green-600' : 'text-red-500'}`}
                      >
                        {tc.passed ? 'Pass' : 'Fail'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-dm-mono text-brand-navy/50">
                      {tc.time_ms != null ? `${tc.time_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (answer.question_type === 'mcq') {
    const options: McqOption[] = answer.question_options ?? []
    const selected = answer.selected_option
    const correct = options.find((o) => o.is_correct)?.id

    return (
      <div className="px-5 py-4 space-y-2">
        {options.map((opt) => {
          const isSelected = opt.id === selected
          const isCorrect = opt.is_correct

          let bg = 'bg-white border-brand-border'
          if (isSelected && isCorrect) bg = 'bg-green-50 border-green-300'
          else if (isSelected && !isCorrect) bg = 'bg-red-50 border-red-300'
          else if (!isSelected && isCorrect) bg = 'bg-green-50 border-green-200'

          return (
            <div
              key={opt.id}
              className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm ${bg}`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                  isSelected && !isCorrect
                    ? 'border-red-400 text-red-600'
                    : isCorrect
                    ? 'border-green-500 text-green-600'
                    : 'border-brand-border text-brand-navy/30'
                }`}
              >
                {isSelected ? '●' : isCorrect ? '✓' : ''}
              </span>
              <span className={isCorrect ? 'text-green-800' : isSelected ? 'text-red-800' : 'text-brand-navy/70'}>
                {opt.text}
              </span>
              {isSelected && !isCorrect && (
                <span className="ml-auto text-xs font-medium text-red-500">Candidate&apos;s answer</span>
              )}
              {isCorrect && (
                <span className="ml-auto text-xs font-medium text-green-600">Correct answer</span>
              )}
            </div>
          )
        })}
        {/* Fallback if no options in DB */}
        {options.length === 0 && (
          <p className="font-dm-mono text-sm text-brand-navy/60">
            Selected: {answer.selected_option ?? '—'}
            {answer.is_correct != null && (
              <span className={`ml-2 ${answer.is_correct ? 'text-green-600' : 'text-red-500'}`}>
                ({answer.is_correct ? 'Correct' : 'Incorrect'})
              </span>
            )}
          </p>
        )}
      </div>
    )
  }

  // Text answer
  return (
    <div className="px-5 py-4 space-y-3">
      <div>
        <p className="mb-2 font-dm-sans text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
          Submitted Answer
        </p>
        <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
          <p className="font-dm-sans text-sm leading-relaxed text-brand-navy">
            {answer.answer_text ?? '(no answer)'}
          </p>
        </div>
      </div>

      {/* Manual scoring */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="mb-3 font-dm-sans text-sm font-semibold text-amber-800">
          Manual Score Required
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={100}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              aria-label="Manual score (0-100)"
              className="w-20 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center font-dm-mono text-sm text-brand-navy focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-300/30"
            />
            <span className="font-dm-mono text-sm text-amber-700">%</span>
          </div>
          <button
            type="button"
            disabled={saving || scoreInput === ''}
            onClick={() => {
              const v = Number(scoreInput)
              if (!isNaN(v) && v >= 0 && v <= 100) onSaveScore(v)
            }}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Score'}
          </button>
          {answer.manual_score != null && (
            <span className="font-dm-sans text-xs text-amber-700">
              Current score: {answer.manual_score.toFixed(0)}%
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Skeleton className="mb-1 h-3 w-24" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-1 h-3 w-48" />
      </div>
      <div className="p-8 max-w-5xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
        </div>
        <div className="space-y-px overflow-hidden rounded-2xl border border-brand-border">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 bg-white px-5 py-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
