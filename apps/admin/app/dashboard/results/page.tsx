'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useMemo } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Eye, BarChart2, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'
import { EmptyState, Badge, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { attemptsApi, assessmentsApi, type AttemptListItem } from '../../../lib/api'

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  if (m < 1) return `${s}s`
  return `${m}m ${String(s).padStart(2, '0')}s`
}

const STATUS_CONFIG: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'neutral' | 'orange' | 'blue' }> = {
  completed:   { label: 'Completed',   variant: 'success' },
  in_progress: { label: 'In Progress', variant: 'blue' },
  abandoned:   { label: 'Abandoned',   variant: 'neutral' },
  timed_out:   { label: 'Timed Out',   variant: 'danger' },
}

function scoreColor(score: number | undefined | null): string {
  if (score == null) return 'text-brand-navy/40'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-brand-orange'
  return 'text-red-500'
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 animate-pulse">
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-3.5 w-12" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  )
}

export default function ResultsPage() {
  const [assessmentFilter, setAssessmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ['attempts', assessmentFilter, statusFilter, dateFrom, dateTo],
    queryFn: () =>
      attemptsApi.list({
        ...(assessmentFilter && { assessment_id: assessmentFilter }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo && { date_to: dateTo }),
      }),
  })

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const stats = useMemo(() => {
    const total = attempts.length
    const completed = attempts.filter((a) => a.status === 'completed').length
    const scores = attempts
      .filter((a) => a.final_score != null)
      .map((a) => a.final_score as number)
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
        : null
    const pendingReview = attempts.filter((a) => a.has_pending_review).length
    return { total, completed, avgScore, pendingReview }
  }, [attempts])

  return (
    <div className="min-h-full">
      <PageHeader title="Results" subtitle="All completed assessment attempts" />

      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Attempts',  value: String(stats.total) },
            { label: 'Completed',       value: String(stats.completed) },
            { label: 'Avg Score',       value: stats.avgScore !== null ? `${stats.avgScore}%` : '—' },
            {
              label: 'Pending Review',
              value: String(stats.pendingReview),
              warn: stats.pendingReview > 0,
            },
          ].map(({ label, value, warn }) => (
            <div
              key={label}
              className={`rounded-xl border p-4 shadow-sm ${
                warn ? 'border-amber-200 bg-amber-50' : 'border-brand-border bg-white'
              }`}
            >
              <p className={`text-xs font-medium uppercase tracking-wider ${warn ? 'text-amber-600' : 'text-brand-navy/50'}`}>
                {label}
              </p>
              <p className={`mt-1 font-syne text-2xl font-bold ${warn ? 'text-amber-700' : 'text-brand-navy'}`}>
                {value}
              </p>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <select
            value={assessmentFilter}
            onChange={(e) => setAssessmentFilter(e.target.value)}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          >
            <option value="">All Assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="abandoned">Abandoned</option>
            <option value="timed_out">Timed Out</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            aria-label="From date"
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            aria-label="To date"
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          />
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {/* Column headers */}
          {!isLoading && attempts.length > 0 && (
            <div className="border-b border-brand-border bg-brand-surface px-5 py-3">
              <div className="grid grid-cols-[1fr_1.2fr_80px_120px_80px_80px_120px_36px] items-center gap-4">
                {['Candidate', 'Assessment', 'Score', 'Status', 'Attempt', 'Duration', 'Completed', ''].map((h) => (
                  <span key={h} className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div>{Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No results found"
              description="No attempts match your current filters."
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              {attempts.map((attempt) => (
                <AttemptRow key={attempt.id} attempt={attempt} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

function AttemptRow({ attempt }: { attempt: AttemptListItem }) {
  const statusCfg = STATUS_CONFIG[attempt.status] ?? { label: attempt.status, variant: 'neutral' as const }
  const isPending = attempt.has_pending_review

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.15 } } }}
      className="grid grid-cols-[1fr_1.2fr_80px_120px_80px_80px_120px_36px] items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 hover:bg-brand-surface/50 transition-colors"
    >
      {/* Candidate */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-brand-navy">{attempt.candidate_name}</p>
        <p className="truncate text-xs text-brand-navy/50">{attempt.candidate_email}</p>
      </div>

      {/* Assessment */}
      <p className="truncate text-sm text-brand-navy/80">{attempt.assessment_title ?? '—'}</p>

      {/* Score */}
      <div className="flex items-center gap-1.5">
        {attempt.final_score != null ? (
          <span className={`font-dm-mono text-sm font-semibold ${scoreColor(attempt.final_score)}`}>
            {attempt.final_score.toFixed(1)}%
          </span>
        ) : isPending ? (
          <span className="flex items-center gap-1 font-dm-mono text-xs text-amber-600">
            <AlertCircle size={12} aria-hidden="true" />
            Pending
          </span>
        ) : (
          <span className="font-dm-mono text-xs text-brand-navy/30">—</span>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-1.5">
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        {isPending && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
            Review
          </span>
        )}
      </div>

      {/* Attempt n of limit */}
      <span className="font-dm-mono text-xs text-brand-navy/60">
        {attempt.attempt_number} of {attempt.usage_limit ?? '?'}
      </span>

      {/* Duration */}
      <span className="font-dm-mono text-xs text-brand-navy/60">
        {attempt.total_time_secs != null ? formatDuration(attempt.total_time_secs) : '—'}
      </span>

      {/* Completed */}
      <span className="text-xs text-brand-navy/50">
        {attempt.completed_at
          ? formatDistanceToNow(new Date(attempt.completed_at), { addSuffix: true })
          : '—'}
      </span>

      {/* Action */}
      <Link
        href={`/dashboard/results/${attempt.id}`}
        aria-label="View results"
        title="View results"
        className="flex h-8 w-8 items-center justify-center rounded border border-brand-border text-brand-navy/40 hover:border-brand-orange hover:text-brand-orange transition-colors"
      >
        <Eye size={14} aria-hidden="true" />
      </Link>
    </motion.div>
  )
}
