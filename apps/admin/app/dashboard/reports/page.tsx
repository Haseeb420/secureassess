'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart2, Users, CheckCircle2, XCircle, Clock,
  TrendingUp, ArrowRight, ChevronUp, ChevronDown, Search,
} from 'lucide-react'
import { EmptyState, Badge, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { ExportButtons } from '../../../components/ExportButtons'
import { downloadCSV, downloadExcel, downloadPDF } from '../../../lib/export'
import { reportsApi, type AssessmentSummary } from '../../../lib/api'

// ── Types ─────────────────────────────────────────────────────────────────────

type SortKey = 'assessment_title' | 'total_appeared' | 'total_completed' | 'passed' | 'failed' | 'avg_score' | 'pass_rate'
type SortDir = 'asc' | 'desc'

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number | null): string {
  if (score == null) return 'text-brand-navy/40'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-brand-orange'
  return 'text-red-500'
}

function sortSummaries(list: AssessmentSummary[], key: SortKey | '', dir: SortDir): AssessmentSummary[] {
  if (!key) return list
  return [...list].sort((a, b) => {
    const av = a[key as keyof AssessmentSummary]
    const bv = b[key as keyof AssessmentSummary]
    if (av == null && bv == null) return 0
    if (av == null) return 1
    if (bv == null) return -1
    if (typeof av === 'string' && typeof bv === 'string') {
      const cmp = av.localeCompare(bv, undefined, { sensitivity: 'base' })
      return dir === 'asc' ? cmp : -cmp
    }
    if (typeof av === 'number' && typeof bv === 'number') {
      return dir === 'asc' ? av - bv : bv - av
    }
    return 0
  })
}

// ── Export builders ───────────────────────────────────────────────────────────

function exportHeaders(threshold: number) {
  return [
    'Assessment', 'Status', 'Appeared', 'Completed',
    `Passed (≥${threshold}%)`, `Failed (<${threshold}%)`,
    'In Progress', 'Abandoned', 'Avg Score (%)', 'Pass Rate (%)',
  ]
}

function toExportRows(rows: AssessmentSummary[]) {
  return rows.map((r) => [
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
  ] as (string | number)[])
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon: Icon, accent,
}: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent?: 'green' | 'red' | 'blue'
}) {
  const palette = {
    green: { bg: 'bg-green-50 border-green-200', icon: 'text-green-600', val: 'text-green-700' },
    red:   { bg: 'bg-red-50   border-red-200',   icon: 'text-red-500',   val: 'text-red-700'   },
    blue:  { bg: 'bg-blue-50  border-blue-200',  icon: 'text-blue-600',  val: 'text-blue-700'  },
  }
  const c = accent ? palette[accent] : null
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${c ? c.bg : 'border-brand-border bg-white'}`}>
      <div className="flex items-start justify-between">
        <p className={`text-xs font-semibold uppercase tracking-wider ${c ? c.icon : 'text-brand-navy/50'}`}>{label}</p>
        <Icon size={16} className={c ? c.icon : 'text-brand-navy/30'} aria-hidden="true" />
      </div>
      <p className={`mt-2 font-syne text-3xl font-bold ${c ? c.val : 'text-brand-navy'}`}>{value}</p>
      {sub && <p className="mt-0.5 font-dm-mono text-xs text-brand-navy/50">{sub}</p>}
    </div>
  )
}

function PassRateBar({ passed, failed, inProgress, total }: {
  passed: number; failed: number; inProgress: number; total: number
}) {
  if (total === 0) return <span className="font-dm-mono text-xs text-brand-navy/30">No attempts</span>
  const passW = (passed     / total) * 100
  const failW = (failed     / total) * 100
  const progW = (inProgress / total) * 100
  const restW = Math.max(0, 100 - passW - failW - progW)
  return (
    <div className="space-y-1 w-full">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-brand-border">
        {passW > 0 && <div className="h-full bg-green-500" style={{ width: `${passW}%` }} title={`Passed: ${passed}`} />}
        {failW > 0 && <div className="h-full bg-red-400"   style={{ width: `${failW}%` }} title={`Failed: ${failed}`} />}
        {progW > 0 && <div className="h-full bg-blue-400"  style={{ width: `${progW}%` }} title={`In Progress: ${inProgress}`} />}
        {restW > 0 && <div className="h-full bg-brand-navy/10" style={{ width: `${restW}%` }} title="Abandoned / Timed out" />}
      </div>
      <div className="flex items-center gap-3 font-dm-mono text-[10px]">
        {passed     > 0 && <span className="text-green-600">{passed} passed</span>}
        {failed     > 0 && <span className="text-red-500">{failed} failed</span>}
        {inProgress > 0 && <span className="text-blue-500">{inProgress} in progress</span>}
      </div>
    </div>
  )
}

function SortHeader({
  label, sortKey, currentSort, currentDir, onSort,
}: {
  label: string; sortKey: SortKey
  currentSort: SortKey | ''; currentDir: SortDir; onSort: (k: SortKey) => void
}) {
  const active = currentSort === sortKey
  return (
    <button type="button" onClick={() => onSort(sortKey)} aria-label={`Sort by ${label}`}
      className={`group flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
        active ? 'text-brand-orange' : 'text-brand-navy/50 hover:text-brand-navy/80'
      }`}>
      {label}
      <span className="flex flex-col gap-[1px] ml-0.5">
        <ChevronUp   size={9} aria-hidden="true" className={`transition-opacity ${active && currentDir === 'asc'  ? 'opacity-100 text-brand-orange' : 'opacity-20 group-hover:opacity-40'}`} />
        <ChevronDown size={9} aria-hidden="true" className={`transition-opacity ${active && currentDir === 'desc' ? 'opacity-100 text-brand-orange' : 'opacity-20 group-hover:opacity-40'}`} />
      </span>
    </button>
  )
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[2fr_80px_80px_80px_80px_70px_1fr_36px] items-center gap-4 border-b border-brand-border px-5 py-4 animate-pulse last:border-0">
      <div className="space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
      {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-12" />)}
      <Skeleton className="h-4 w-full rounded-full" />
      <Skeleton className="h-7 w-7 rounded" />
    </div>
  )
}

function AssessmentRow({ row, cols }: { row: AssessmentSummary; cols: string }) {
  const isActive   = row.assessment_status === 'active'
  const noAttempts = row.total_appeared === 0

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0, transition: { duration: 0.15 } } }}
      className={`grid ${cols} items-center gap-4 border-b border-brand-border px-5 py-4 last:border-0 hover:bg-brand-surface/50 transition-colors`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-brand-navy">{row.assessment_title}</p>
        <div className="mt-0.5 flex items-center gap-2">
          <Badge variant={isActive ? 'success' : 'neutral'}>{isActive ? 'Active' : row.assessment_status}</Badge>
          {noAttempts && <span className="font-dm-mono text-[10px] text-brand-navy/30">No attempts yet</span>}
        </div>
      </div>

      <div className="text-center">
        <span className="font-dm-mono text-sm font-semibold text-brand-navy">{row.total_appeared}</span>
      </div>

      <div className="text-center">
        <span className="font-dm-mono text-sm text-brand-navy/70">{row.total_completed}</span>
      </div>

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
        ) : <span className="font-dm-mono text-sm text-brand-navy/30">—</span>}
      </div>

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
        ) : <span className="font-dm-mono text-sm text-brand-navy/30">—</span>}
      </div>

      <div className="text-center">
        {row.avg_score != null ? (
          <span className={`font-dm-mono text-sm font-semibold ${scoreColor(row.avg_score)}`}>{row.avg_score}%</span>
        ) : (
          <span className="font-dm-mono text-sm text-brand-navy/30">—</span>
        )}
      </div>

      <div>
        <PassRateBar passed={row.passed} failed={row.failed} inProgress={row.in_progress} total={row.total_appeared} />
        {row.pass_rate != null && (
          <p className="mt-1 font-dm-mono text-xs font-semibold text-brand-navy/60">{row.pass_rate}% pass rate</p>
        )}
      </div>

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

// ── Main content ──────────────────────────────────────────────────────────────

function ReportsContent() {
  const searchParams = useSearchParams()
  const pathname     = usePathname()
  const router       = useRouter()

  // Filters from URL
  const thresholdParam = parseInt(searchParams.get('threshold') ?? '50', 10)
  const threshold      = isNaN(thresholdParam) ? 50 : Math.max(0, Math.min(100, thresholdParam))
  const statusFilter   = searchParams.get('status') ?? ''
  const searchQuery    = searchParams.get('q')      ?? ''
  const sortKey        = (searchParams.get('sort')  ?? '') as SortKey | ''
  const sortDir        = (searchParams.get('dir')   ?? 'asc') as SortDir

  // Local state only for threshold input so typing feels instant
  const [thresholdInput, setThresholdInput] = useState(String(threshold))

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value); else params.delete(key)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  function applyThreshold(val: string) {
    const n = parseInt(val, 10)
    if (!isNaN(n) && n >= 0 && n <= 100) updateParam('threshold', String(n))
  }

  function handleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString())
    if (sortKey === key) {
      if (sortDir === 'asc') { params.set('sort', key); params.set('dir', 'desc') }
      else { params.delete('sort'); params.delete('dir') }
    } else {
      params.set('sort', key); params.set('dir', 'asc')
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['reports', 'assessments', threshold],
    queryFn: () => reportsApi.assessmentSummary(threshold),
  })

  // Client-side filter + sort
  const summaries = useMemo(() => {
    let list = raw
    if (statusFilter) list = list.filter((r) => r.assessment_status === statusFilter)
    if (searchQuery)  list = list.filter((r) => r.assessment_title.toLowerCase().includes(searchQuery.toLowerCase()))
    return sortSummaries(list, sortKey, sortDir)
  }, [raw, statusFilter, searchQuery, sortKey, sortDir])

  const totals = useMemo(() => {
    const appeared    = summaries.reduce((s, r) => s + r.total_appeared,  0)
    const completed   = summaries.reduce((s, r) => s + r.total_completed, 0)
    const passed      = summaries.reduce((s, r) => s + r.passed,          0)
    const failed      = summaries.reduce((s, r) => s + r.failed,          0)
    const inProgress  = summaries.reduce((s, r) => s + r.in_progress,     0)
    const overallRate = completed > 0 ? Math.round((passed / completed) * 100) : null
    return { appeared, completed, passed, failed, inProgress, overallRate }
  }, [summaries])

  const COLS   = 'grid-cols-[2fr_80px_80px_90px_90px_70px_200px_36px]'
  const slug   = new Date().toISOString().slice(0, 10)
  const sortProps = { currentSort: sortKey, currentDir: sortDir, onSort: handleSort }

  // Build metadata string for PDF
  const metaParts: string[] = [`Pass threshold: ≥${threshold}%`]
  if (statusFilter) metaParts.push(`Status: ${statusFilter}`)
  if (searchQuery)  metaParts.push(`Search: "${searchQuery}"`)
  const filterMeta = metaParts.join(' · ')

  return (
    <div className="min-h-full">
      <PageHeader title="Assessment Reports" subtitle="Pass / fail breakdown per assessment" />

      <div className="p-8 space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total Appeared" value={String(totals.appeared)}   icon={Users}        />
          <StatCard label="Passed"         value={String(totals.passed)}     icon={CheckCircle2} accent="green"
            sub={totals.overallRate != null ? `${totals.overallRate}% pass rate overall` : undefined} />
          <StatCard label="Failed"         value={String(totals.failed)}     icon={XCircle}      accent="red"  />
          <StatCard label="In Progress"    value={String(totals.inProgress)} icon={Clock}        accent="blue" />
        </div>

        {/* Filter + threshold + export toolbar */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-border bg-white px-5 py-3.5 shadow-sm">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-navy/30 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => updateParam('q', e.target.value)}
              placeholder="Search assessments…"
              aria-label="Search assessments"
              className="w-48 rounded-lg border border-brand-border bg-brand-surface py-2 pl-8 pr-3 text-sm text-brand-navy placeholder:text-brand-navy/30 focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
            />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => updateParam('status', e.target.value)}
            className="rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>

          {/* Pass threshold */}
          <div className="flex items-center gap-2 border-l border-brand-border pl-3">
            <TrendingUp size={14} className="text-brand-navy/30" aria-hidden="true" />
            <label htmlFor="threshold" className="text-sm font-medium text-brand-navy whitespace-nowrap">
              Pass ≥
            </label>
            <input
              id="threshold"
              type="number"
              min={0}
              max={100}
              value={thresholdInput}
              onChange={(e) => setThresholdInput(e.target.value)}
              onBlur={() => applyThreshold(thresholdInput)}
              onKeyDown={(e) => e.key === 'Enter' && applyThreshold(thresholdInput)}
              aria-label="Pass threshold percentage"
              className="w-14 rounded-lg border border-brand-border bg-brand-surface px-2 py-1.5 text-center font-dm-mono text-sm text-brand-navy focus:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange/15"
            />
            <span className="font-dm-mono text-sm text-brand-navy/50">%</span>
          </div>

          {/* Export */}
          <div className="ml-auto flex items-center gap-3">
            <span className="font-dm-mono text-xs text-brand-navy/40">
              {summaries.length} assessment{summaries.length !== 1 ? 's' : ''}
            </span>
            <ExportButtons
              disabled={summaries.length === 0}
              onCSV={()   => downloadCSV(`report-${slug}`,   exportHeaders(threshold), toExportRows(summaries))}
              onExcel={()  => downloadExcel(`report-${slug}`, exportHeaders(threshold), toExportRows(summaries))}
              onPDF={()   => downloadPDF(
                `report-${slug}`,
                'Assessment Report',
                filterMeta,
                exportHeaders(threshold),
                toExportRows(summaries),
                true,
              )}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {!isLoading && raw.length > 0 && (
            <div className="border-b border-brand-border bg-brand-surface px-5 py-3">
              <div className={`grid ${COLS} items-center gap-4`}>
                <SortHeader label="Assessment" sortKey="assessment_title" {...sortProps} />
                <SortHeader label="Appeared"   sortKey="total_appeared"  {...sortProps} />
                <SortHeader label="Completed"  sortKey="total_completed" {...sortProps} />
                <SortHeader label="Passed"     sortKey="passed"          {...sortProps} />
                <SortHeader label="Failed"     sortKey="failed"          {...sortProps} />
                <SortHeader label="Avg Score"  sortKey="avg_score"       {...sortProps} />
                <SortHeader label="Distribution" sortKey="pass_rate"     {...sortProps} />
                <span />
              </div>
            </div>
          )}

          {isLoading ? (
            <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : summaries.length === 0 ? (
            <EmptyState
              icon={BarChart2}
              title={raw.length === 0 ? 'No assessment data' : 'No results match filters'}
              description={raw.length === 0
                ? 'Reports appear once candidates start taking assessments.'
                : 'Try clearing some filters to see more results.'}
            />
          ) : (
            <motion.div
              key={`${sortKey}-${sortDir}-${statusFilter}-${searchQuery}`}
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
              {summaries.map((row) => (
                <AssessmentRow key={row.assessment_id} row={row} cols={COLS} />
              ))}
            </motion.div>
          )}
        </div>

        {/* Legend */}
        {summaries.length > 0 && (
          <div className="flex items-center gap-6 px-1">
            {[
              { color: 'bg-green-500',      label: 'Passed' },
              { color: 'bg-red-400',        label: 'Failed' },
              { color: 'bg-blue-400',       label: 'In Progress' },
              { color: 'bg-brand-navy/10',  label: 'Abandoned / Timed out' },
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
          <Skeleton className="h-5 w-48 mb-1" /><Skeleton className="h-3 w-64" />
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
