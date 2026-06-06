'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState, useMemo, useEffect, Suspense } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Eye, BarChart2, AlertCircle, Download, FileSpreadsheet, FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { EmptyState, Badge, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { attemptsApi, assessmentsApi, type AttemptListItem } from '../../../lib/api'

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m`
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
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-3.5 w-12" />
      <Skeleton className="h-3.5 w-12" />
      <Skeleton className="h-5 w-20 rounded-full" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  )
}

function exportToCSV(attempts: AttemptListItem[]) {
  const BOM = '﻿'
  const headers = [
    'Candidate Name', 'Candidate Email', 'Assessment', 'Score (%)',
    'Questions Answered', 'Total Questions', 'Status', 'Duration', 'Started At', 'Completed At',
  ]
  const rows = attempts.map((a) => [
    a.candidate_name,
    a.candidate_email,
    a.assessment_title ?? '',
    a.final_score != null ? a.final_score.toFixed(1) : '',
    a.questions_answered != null ? String(a.questions_answered) : '',
    a.total_questions != null ? String(a.total_questions) : '',
    a.status,
    a.total_time_secs != null ? formatDuration(a.total_time_secs) : '',
    a.started_at,
    a.completed_at ?? '',
  ])
  const csv = BOM + [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `results-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

async function exportToExcel(attempts: AttemptListItem[]) {
  const { utils, writeFile } = await import('xlsx')
  const rows = attempts.map((a) => ({
    'Candidate Name': a.candidate_name,
    'Candidate Email': a.candidate_email,
    'Assessment': a.assessment_title ?? '',
    'Score (%)': a.final_score != null ? parseFloat(a.final_score.toFixed(1)) : '',
    'Questions Answered': a.questions_answered ?? '',
    'Total Questions': a.total_questions ?? '',
    'Status': STATUS_CONFIG[a.status]?.label ?? a.status,
    'Duration': a.total_time_secs != null ? formatDuration(a.total_time_secs) : '',
    'Started At': a.started_at,
    'Completed At': a.completed_at ?? '',
  }))
  const ws = utils.json_to_sheet(rows)
  const wb = utils.book_new()
  utils.book_append_sheet(wb, ws, 'Results')
  writeFile(wb, `results-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  const assessmentFilter = searchParams.get('assessment') ?? ''
  const statusFilter = searchParams.get('status') ?? ''
  const dateFrom = searchParams.get('from') ?? ''
  const dateTo = searchParams.get('to') ?? ''

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

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
    const scores = attempts.filter((a) => a.final_score != null).map((a) => a.final_score as number)
    const avgScore = scores.length > 0
      ? Math.round(scores.reduce((s, n) => s + n, 0) / scores.length)
      : null
    const pendingReview = attempts.filter((a) => a.has_pending_review).length
    return { total, completed, avgScore, pendingReview }
  }, [attempts])

  const COLS = 'grid-cols-[1fr_1.1fr_75px_90px_130px_90px_100px_36px]'

  return (
    <div className="min-h-full">
      <PageHeader title="Results" subtitle="All assessment attempts" />

      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'Total Attempts',  value: String(stats.total) },
            { label: 'Completed',       value: String(stats.completed) },
            { label: 'Avg Score',       value: stats.avgScore !== null ? `${stats.avgScore}%` : '—' },
            { label: 'Pending Review',  value: String(stats.pendingReview), warn: stats.pendingReview > 0 },
          ].map(({ label, value, warn }) => (
            <div
              key={label}
              className={`rounded-xl border p-4 shadow-sm ${warn ? 'border-amber-200 bg-amber-50' : 'border-brand-border bg-white'}`}
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

        {/* Filter bar + export */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={assessmentFilter}
            onChange={(e) => updateFilter('assessment', e.target.value)}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          >
            <option value="">All Assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>{a.title}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => updateFilter('status', e.target.value)}
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
            onChange={(e) => updateFilter('from', e.target.value)}
            aria-label="From date"
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => updateFilter('to', e.target.value)}
            aria-label="To date"
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
          />

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-brand-navy/50 font-dm-mono">
              {attempts.length} result{attempts.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              disabled={attempts.length === 0}
              onClick={() => exportToCSV(attempts)}
              title="Export CSV"
              className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-medium text-brand-navy hover:border-brand-orange hover:text-brand-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={13} aria-hidden="true" />
              CSV
            </button>
            <button
              type="button"
              disabled={attempts.length === 0}
              onClick={() => exportToExcel(attempts)}
              title="Export Excel"
              className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-medium text-brand-navy hover:border-brand-orange hover:text-brand-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={13} aria-hidden="true" />
              Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {!isLoading && attempts.length > 0 && (
            <div className="border-b border-brand-border bg-brand-surface px-5 py-3">
              <div className={`grid ${COLS} items-center gap-4`}>
                {['Candidate', 'Assessment', 'Score', 'Questions', 'Status', 'Duration', 'Completed', ''].map((h) => (
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
                <AttemptRow key={attempt.id} attempt={attempt} cols={COLS} />
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full">
        <div className="border-b border-brand-border bg-white px-8 py-5">
          <Skeleton className="h-5 w-24 mb-1" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <div className="overflow-hidden rounded-xl border border-brand-border">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}

function TimeRemaining({ startedAt, durationMinutes }: { startedAt: string; durationMinutes: number }) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    function calc() {
      const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
      return durationMinutes * 60 - elapsed
    }
    setRemaining(calc())
    const id = setInterval(() => setRemaining(calc()), 1000)
    return () => clearInterval(id)
  }, [startedAt, durationMinutes])

  if (remaining === null) return <span className="font-dm-mono text-xs text-brand-navy/40">—</span>

  if (remaining <= 0) {
    return (
      <span className="font-dm-mono text-xs font-semibold text-red-500">Expired</span>
    )
  }

  const isWarning = remaining < 300 // under 5 minutes
  return (
    <span className={`font-dm-mono text-xs font-semibold ${isWarning ? 'text-red-500' : 'text-brand-orange'}`}>
      {formatDuration(remaining)} left
    </span>
  )
}

function AttemptRow({ attempt, cols }: { attempt: AttemptListItem; cols: string }) {
  const statusCfg = STATUS_CONFIG[attempt.status] ?? { label: attempt.status, variant: 'neutral' as const }
  const isPending = attempt.has_pending_review
  const isInProgress = attempt.status === 'in_progress'

  const questionsDisplay = attempt.total_questions != null
    ? `${attempt.questions_answered ?? 0}/${attempt.total_questions}`
    : '—'

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.15 } } }}
      className={`grid ${cols} items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 hover:bg-brand-surface/50 transition-colors`}
    >
      {/* Candidate */}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-brand-navy">{attempt.candidate_name}</p>
        <p className="truncate text-xs text-brand-navy/50">{attempt.candidate_email}</p>
      </div>

      {/* Assessment */}
      <p className="truncate text-sm text-brand-navy/80">{attempt.assessment_title ?? '—'}</p>

      {/* Score */}
      <div>
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

      {/* Questions answered */}
      <div>
        <span className="font-dm-mono text-xs text-brand-navy/70">{questionsDisplay}</span>
        {isInProgress && attempt.total_questions != null && (
          <div className="mt-1 h-1 w-full rounded-full bg-brand-border overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-orange transition-all"
              style={{ width: `${Math.min(100, ((attempt.questions_answered ?? 0) / attempt.total_questions) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        {isPending && (
          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 ring-1 ring-amber-200">
            Review
          </span>
        )}
      </div>

      {/* Duration / Time remaining */}
      <div>
        {isInProgress && attempt.duration_minutes != null ? (
          <TimeRemaining startedAt={attempt.started_at} durationMinutes={attempt.duration_minutes} />
        ) : attempt.total_time_secs != null ? (
          <span className="font-dm-mono text-xs text-brand-navy/60">
            {formatDuration(attempt.total_time_secs)}
          </span>
        ) : (
          <span className="font-dm-mono text-xs text-brand-navy/30">—</span>
        )}
      </div>

      {/* Completed / Started */}
      <div>
        {attempt.completed_at ? (
          <span className="text-xs text-brand-navy/50">
            {formatDistanceToNow(new Date(attempt.completed_at), { addSuffix: true })}
          </span>
        ) : attempt.started_at ? (
          <span className="text-xs text-brand-navy/40">
            {formatDistanceToNow(new Date(attempt.started_at), { addSuffix: true })}
          </span>
        ) : (
          <span className="text-xs text-brand-navy/30">—</span>
        )}
      </div>

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
