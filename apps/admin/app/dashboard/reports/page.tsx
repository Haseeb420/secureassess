'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart2, Users, CheckCircle2, XCircle, Clock, FileText, TrendingUp, ArrowRight } from 'lucide-react'
import { EmptyState, Badge, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { reportsApi, type AssessmentSummary } from '../../../lib/api'

function scoreColor(score: number | null): string {
  if (score == null) return 'text-brand-navy/40'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-brand-orange'
  return 'text-red-500'
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  accent?: 'green' | 'red' | 'orange' | 'blue'
}) {
  const colors = {
    green:  { bg: 'bg-green-50  border-green-200',  icon: 'text-green-600',  val: 'text-green-700'  },
    red:    { bg: 'bg-red-50    border-red-200',    icon: 'text-red-500',    val: 'text-red-700'    },
    orange: { bg: 'bg-amber-50  border-amber-200',  icon: 'text-amber-600',  val: 'text-amber-700'  },
    blue:   { bg: 'bg-blue-50   border-blue-200',   icon: 'text-blue-600',   val: 'text-blue-700'   },
  }
  const c = accent ? colors[accent] : null

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${c ? c.bg : 'border-brand-border bg-white'}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wider ${c ? c.icon : 'text-brand-navy/50'}`}>
          {label}
        </p>
        <Icon size={16} className={c ? c.icon : 'text-brand-navy/30'} aria-hidden="true" />
      </div>
      <p className={`mt-2 font-syne text-3xl font-bold ${c ? c.val : 'text-brand-navy'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-brand-navy/50 font-dm-mono">{sub}</p>}
    </div>
  )
}

function PassRateBar({
  passed,
  failed,
  inProgress,
  total,
}: {
  passed: number
  failed: number
  inProgress: number
  total: number
}) {
  if (total === 0) {
    return <span className="font-dm-mono text-xs text-brand-navy/30">No attempts</span>
  }
  const passW   = (passed     / total) * 100
  const failW   = (failed     / total) * 100
  const progW   = (inProgress / total) * 100
  const restW   = Math.max(0, 100 - passW - failW - progW)

  return (
    <div className="space-y-1 w-full">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-brand-border">
        {passW > 0 && (
          <div className="h-full bg-green-500 transition-all" style={{ width: `${passW}%` }} title={`Passed: ${passed}`} />
        )}
        {failW > 0 && (
          <div className="h-full bg-red-400 transition-all" style={{ width: `${failW}%` }} title={`Failed: ${failed}`} />
        )}
        {progW > 0 && (
          <div className="h-full bg-blue-400 transition-all" style={{ width: `${progW}%` }} title={`In Progress: ${inProgress}`} />
        )}
        {restW > 0 && (
          <div className="h-full bg-brand-navy/10 transition-all" style={{ width: `${restW}%` }} title="Abandoned/Timed out" />
        )}
      </div>
      <div className="flex items-center gap-3 text-[10px] font-dm-mono">
        {passed > 0 && <span className="text-green-600">{passed} passed</span>}
        {failed > 0 && <span className="text-red-500">{failed} failed</span>}
        {inProgress > 0 && <span className="text-blue-500">{inProgress} in progress</span>}
      </div>
    </div>
  )
}

function exportCSV(rows: AssessmentSummary[], threshold: number) {
  const BOM = '﻿'
  const headers = [
    'Assessment', 'Status', 'Appeared', 'Completed', `Passed (≥${threshold}%)`,
    `Failed (<${threshold}%)`, 'In Progress', 'Abandoned', 'Avg Score (%)', 'Pass Rate (%)',
  ]
  const data = rows.map((r) => [
    r.assessment_title,
    r.assessment_status,
    r.total_appeared,
    r.total_completed,
    r.passed,
    r.failed,
    r.in_progress,
    r.abandoned,
    r.avg_score ?? '',
    r.pass_rate ?? '',
  ])
  const csv = BOM + [headers, ...data]
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `assessment-report-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2fr_80px_80px_80px_80px_70px_1fr_36px] items-center gap-4 border-b border-brand-border px-5 py-4 animate-pulse last:border-0">
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-12" />)}
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  )
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const pathname     = usePathname()
  const router       = useRouter()

  const thresholdParam = parseInt(searchParams.get('threshold') ?? '50', 10)
  const threshold = isNaN(thresholdParam) ? 50 : Math.max(0, Math.min(100, thresholdParam))

  const [inputVal, setInputVal] = useState(String(threshold))

  function applyThreshold(val: string) {
    const n = parseInt(val, 10)
    if (isNaN(n) || n < 0 || n > 100) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('threshold', String(n))
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const { data: summaries = [], isLoading } = useQuery({
    queryKey: ['reports', 'assessments', threshold],
    queryFn: () => reportsApi.assessmentSummary(threshold),
  })

  const totals = useMemo(() => {
    const appeared   = summaries.reduce((s, r) => s + r.total_appeared,   0)
    const completed  = summaries.reduce((s, r) => s + r.total_completed,  0)
    const passed     = summaries.reduce((s, r) => s + r.passed,           0)
    const failed     = summaries.reduce((s, r) => s + r.failed,           0)
    const inProgress = summaries.reduce((s, r) => s + r.in_progress,      0)
    const overallRate = completed > 0 ? Math.round((passed / completed) * 100) : null
    return { appeared, completed, passed, failed, inProgress, overallRate }
  }, [summaries])

  const COLS = 'grid-cols-[2fr_80px_80px_80px_80px_70px_200px_36px]'

  return (
    <div className="min-h-full">
      <PageHeader
        title="Assessment Reports"
        subtitle="Pass / fail breakdown per assessment"
      />

      <div className="p-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Appeared"  value={String(totals.appeared)}   icon={Users}         />
          <StatCard label="Passed"          value={String(totals.passed)}     icon={CheckCircle2}  accent="green"  sub={totals.overallRate != null ? `${totals.overallRate}% pass rate overall` : undefined} />
          <StatCard label="Failed"          value={String(totals.failed)}     icon={XCircle}       accent="red"   />
          <StatCard label="In Progress"     value={String(totals.inProgress)} icon={Clock}         accent="blue"  />
        </div>

        {/* Threshold + export */}
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-brand-border bg-white px-5 py-3.5 shadow-sm">
          <div className="flex items-center gap-3">
            <TrendingUp size={15} className="text-brand-navy/40" aria-hidden="true" />
            <label htmlFor="pass-threshold" className="text-sm font-medium text-brand-navy">
              Pass threshold
            </label>
            <div className="flex items-center gap-1.5">
              <input
                id="pass-threshold"
                type="number"
                min={0}
                max={100}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onBlur={() => applyThreshold(inputVal)}
                onKeyDown={(e) => e.key === 'Enter' && applyThreshold(inputVal)}
                aria-label="Pass threshold percentage"
                className="w-16 rounded-lg border border-brand-border bg-brand-surface px-2 py-1.5 text-center font-dm-mono text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
              />
              <span className="font-dm-mono text-sm text-brand-navy/60">%</span>
            </div>
            <span className="text-xs text-brand-navy/40">
              Scores ≥ {threshold}% count as passed
            </span>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <span className="font-dm-mono text-xs text-brand-navy/40">
              {summaries.length} assessment{summaries.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              disabled={summaries.length === 0}
              onClick={() => exportCSV(summaries, threshold)}
              className="flex items-center gap-1.5 rounded-lg border border-brand-border bg-white px-3 py-2 text-xs font-medium text-brand-navy hover:border-brand-orange hover:text-brand-orange transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileText size={13} aria-hidden="true" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {/* Header */}
          {!isLoading && summaries.length > 0 && (
            <div className="border-b border-brand-border bg-brand-surface px-5 py-3">
              <div className={`grid ${COLS} items-center gap-4`}>
                {['Assessment', 'Appeared', 'Completed', 'Passed', 'Failed', 'Avg Score', 'Distribution', ''].map((h) => (
                  <span key={h} className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                    {h}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isLoading ? (
            <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : summaries.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title="No assessment data"
              description="Reports appear once candidates start taking assessments."
            />
          ) : (
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              {summaries.map((row) => (
                <AssessmentRow key={row.assessment_id} row={row} threshold={threshold} cols={COLS} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Legend */}
        {summaries.length > 0 && (
          <div className="flex items-center gap-6 px-1">
            {[
              { color: 'bg-green-500', label: 'Passed' },
              { color: 'bg-red-400',   label: 'Failed' },
              { color: 'bg-blue-400',  label: 'In Progress' },
              { color: 'bg-brand-navy/10', label: 'Abandoned / Timed out' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`h-2.5 w-2.5 rounded-sm ${color}`} />
                <span className="text-xs text-brand-navy/50">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-full">
        <div className="border-b border-brand-border bg-white px-8 py-5">
          <Skeleton className="h-5 w-48 mb-1" />
          <Skeleton className="h-3 w-64" />
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-14 rounded-xl" />
          <div className="overflow-hidden rounded-xl border border-brand-border">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>
    }>
      <ReportsContent />
    </Suspense>
  )
}

function AssessmentRow({
  row,
  threshold,
  cols,
}: {
  row: AssessmentSummary
  threshold: number
  cols: string
}) {
  const isActive   = row.assessment_status === 'active'
  const noAttempts = row.total_appeared === 0

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.15 } } }}
      className={`grid ${cols} items-center gap-4 border-b border-brand-border px-5 py-4 last:border-0 hover:bg-brand-surface/50 transition-colors`}
    >
      {/* Assessment name */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-navy">{row.assessment_title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant={isActive ? 'success' : 'neutral'}>
            {isActive ? 'Active' : row.assessment_status}
          </Badge>
          {noAttempts && (
            <span className="font-dm-mono text-[10px] text-brand-navy/30">No attempts yet</span>
          )}
        </div>
      </div>

      {/* Appeared */}
      <div className="text-center">
        <span className="font-dm-mono text-sm font-semibold text-brand-navy">
          {row.total_appeared}
        </span>
      </div>

      {/* Completed */}
      <div className="text-center">
        <span className="font-dm-mono text-sm text-brand-navy/70">
          {row.total_completed}
        </span>
      </div>

      {/* Passed */}
      <div className="flex items-center gap-1.5">
        {row.passed > 0 ? (
          <>
            <CheckCircle2 size={13} className="text-green-500 shrink-0" aria-hidden="true" />
            <span className="font-dm-mono text-sm font-semibold text-green-600">{row.passed}</span>
            {row.total_completed > 0 && (
              <span className="font-dm-mono text-[10px] text-green-500/70">
                ({Math.round((row.passed / row.total_completed) * 100)}%)
              </span>
            )}
          </>
        ) : (
          <span className="font-dm-mono text-sm text-brand-navy/30">—</span>
        )}
      </div>

      {/* Failed */}
      <div className="flex items-center gap-1.5">
        {row.failed > 0 ? (
          <>
            <XCircle size={13} className="text-red-400 shrink-0" aria-hidden="true" />
            <span className="font-dm-mono text-sm font-semibold text-red-500">{row.failed}</span>
            {row.total_completed > 0 && (
              <span className="font-dm-mono text-[10px] text-red-400/70">
                ({Math.round((row.failed / row.total_completed) * 100)}%)
              </span>
            )}
          </>
        ) : (
          <span className="font-dm-mono text-sm text-brand-navy/30">—</span>
        )}
      </div>

      {/* Avg Score */}
      <div className="text-center">
        {row.avg_score != null ? (
          <span className={`font-dm-mono text-sm font-semibold ${scoreColor(row.avg_score)}`}>
            {row.avg_score}%
          </span>
        ) : (
          <span className="font-dm-mono text-sm text-brand-navy/30">—</span>
        )}
      </div>

      {/* Distribution bar */}
      <div>
        <PassRateBar
          passed={row.passed}
          failed={row.failed}
          inProgress={row.in_progress}
          total={row.total_appeared}
        />
        {row.pass_rate != null && (
          <p className="mt-1 font-dm-mono text-xs font-semibold text-brand-navy/60">
            {row.pass_rate}% pass rate
          </p>
        )}
      </div>

      {/* Link to results filtered by this assessment */}
      <Link
        href={`/dashboard/results?assessment=${row.assessment_id}`}
        aria-label={`View results for ${row.assessment_title}`}
        title="View individual results"
        className="flex h-8 w-8 items-center justify-center rounded border border-brand-border text-brand-navy/40 hover:border-brand-orange hover:text-brand-orange transition-colors"
      >
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </motion.div>
  )
}
