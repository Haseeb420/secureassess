'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import {
  Search, Archive, BarChart2, ClipboardList,
  Users, Plus, X, Clock,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { ConfirmDialog } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { InviteDialog } from '../../../components/InviteDialog'
import { assessmentsApi, type Assessment } from '../../../lib/api'

type FilterStatus = 'all' | 'active' | 'archived'

const STATUS_CONFIG = {
  active:   { label: 'Active',   dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  archived: { label: 'Archived', dot: 'bg-brand-border', badge: 'bg-brand-surface text-brand-navy/50 ring-brand-border' },
  draft:    { label: 'Draft',    dot: 'bg-amber-400',    badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
} as const

const LANG_COLORS: Record<string, string> = {
  python:     'bg-blue-100 text-blue-700',
  javascript: 'bg-yellow-100 text-yellow-700',
  typescript: 'bg-sky-100 text-sky-700',
  cpp:        'bg-purple-100 text-purple-700',
  java:       'bg-red-100 text-red-700',
  go:         'bg-cyan-100 text-cyan-700',
}

const containerVariants = {
  show: { transition: { staggerChildren: 0.055 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.18 } },
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-brand-border last:border-0 animate-pulse">
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-4 bg-brand-border rounded w-52" />
        <div className="flex items-center gap-2">
          <div className="h-3 bg-brand-border/60 rounded w-12" />
          <div className="h-4 bg-brand-border/60 rounded w-10" />
          <div className="h-4 bg-brand-border/60 rounded w-16" />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="h-4 w-4 bg-brand-border/60 rounded-full" />
        <div className="h-3 w-16 bg-brand-border/60 rounded" />
      </div>
      <div className="h-5 w-16 bg-brand-border/60 rounded-full" />
      <div className="h-3 w-24 bg-brand-border/60 rounded" />
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => <div key={i} className="h-7 w-7 bg-brand-border/60 rounded" />)}
      </div>
    </div>
  )
}

export default function AssessmentsPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all')
  const [archiveTarget, setArchiveTarget] = useState<Assessment | null>(null)
  const [inviteAssessment, setInviteAssessment] = useState<Assessment | null>(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const archive = useMutation({
    mutationFn: (id: string) => assessmentsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      setArchiveTarget(null)
    },
  })

  const counts = useMemo(() => ({
    all:      data.length,
    active:   data.filter((a) => a.status === 'active').length,
    archived: data.filter((a) => a.status === 'archived').length,
  }), [data])

  const filtered = data.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  return (
    <div className="min-h-full">
      <PageHeader
        title="Assessments"
        subtitle="Create, manage and track coding assessments"
        actions={
          <Link
            href="/dashboard/assessments/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm"
          >
            <Plus size={15} aria-hidden="true" />
            New Assessment
          </Link>
        }
      />

      <div className="p-8 space-y-5">
        {/* Stats strip */}
        {!isLoading && data.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 text-sm"
          >
            {(['all', 'active', 'archived'] as FilterStatus[]).map((key, i) => (
              <span key={key} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-brand-border mx-1">·</span>}
                <button
                  onClick={() => setStatusFilter(key)}
                  className={[
                    'transition-colors',
                    statusFilter === key ? 'text-brand-navy font-semibold' : 'text-brand-navy/40 hover:text-brand-navy/70',
                  ].join(' ')}
                >
                  <span className="tabular-nums font-semibold">{counts[key]}</span>
                  {' '}
                  <span className="font-normal">{key === 'all' ? 'total' : key}</span>
                </button>
              </span>
            ))}
          </motion.div>
        )}

        {/* Search + filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/35"
              aria-hidden="true"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="w-full rounded-lg border border-brand-border bg-white py-2.5 pl-9 pr-8 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex gap-1.5">
            {(['all', 'active', 'archived'] as FilterStatus[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={[
                  'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  statusFilter === f
                    ? 'bg-brand-navy text-white shadow-sm'
                    : 'bg-white border border-brand-border text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy',
                ].join(' ')}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {!isLoading && (
                  <span className={['ml-1.5 tabular-nums', statusFilter === f ? 'text-white/70' : 'text-brand-navy/40'].join(' ')}>
                    {counts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Main list card */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {/* Column header */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex items-center gap-4 border-b border-brand-border bg-brand-surface/70 px-6 py-2.5">
              <span className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Assessment</span>
              <span className="w-32 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Candidates</span>
              <span className="w-20 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Status</span>
              <span className="w-24 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Created</span>
              <span className="w-24" />
            </div>
          )}

          {isLoading ? (
            <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface border border-brand-border">
                <ClipboardList size={28} className="text-brand-navy/25" />
              </div>
              <h3 className="text-base font-semibold text-brand-navy">
                {search || statusFilter !== 'all' ? 'No matching assessments' : 'No assessments yet'}
              </h3>
              <p className="mt-1.5 text-sm text-brand-navy/50 max-w-xs">
                {search
                  ? `No assessments match "${search}". Try a different search term.`
                  : statusFilter !== 'all'
                  ? `No ${statusFilter} assessments found.`
                  : 'Create your first assessment to start evaluating candidates.'}
              </p>
              {!search && statusFilter === 'all' && (
                <Link
                  href="/dashboard/assessments/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
                >
                  <Plus size={15} />
                  Create Assessment
                </Link>
              )}
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {filtered.map((assessment) => (
                <AssessmentRow
                  key={assessment.id}
                  assessment={assessment}
                  onView={() => router.push(`/dashboard/assessments/${assessment.id}`)}
                  onInvite={() => setInviteAssessment(assessment)}
                  onArchive={() => setArchiveTarget(assessment)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this assessment?"
        description={`"${archiveTarget?.title}" will be archived. Candidates with active sessions won't be affected, but new sessions cannot be started.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />

      {inviteAssessment && (
        <InviteDialog
          assessmentId={inviteAssessment.id}
          assessmentTitle={inviteAssessment.title}
          onClose={() => setInviteAssessment(null)}
        />
      )}
    </div>
  )
}

function AssessmentRow({
  assessment, onView, onInvite, onArchive,
}: {
  assessment: Assessment
  onView: () => void
  onInvite: () => void
  onArchive: () => void
}) {
  const statusKey = assessment.status as keyof typeof STATUS_CONFIG
  const status = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.archived
  const langs = assessment.allowed_languages.slice(0, 3)
  const extraLangs = assessment.allowed_languages.length - 3

  return (
    <motion.div
      variants={rowVariants}
      onClick={onView}
      className="group flex items-center gap-4 border-b border-brand-border px-6 py-4 last:border-0 hover:bg-brand-surface/60 cursor-pointer transition-colors"
    >
      {/* Title + meta */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-brand-navy truncate group-hover:text-brand-orange transition-colors">
          {assessment.title}
        </p>
        <div className="mt-1 flex items-center gap-2.5 text-xs text-brand-navy/50">
          <span className="flex items-center gap-1">
            <Clock size={11} aria-hidden="true" />
            {assessment.duration_minutes}m
          </span>
          <span className="flex items-center gap-1.5">
            {langs.map((lang) => (
              <span
                key={lang}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${LANG_COLORS[lang] ?? 'bg-brand-surface text-brand-navy/60'}`}
              >
                {lang === 'cpp' ? 'C++' : lang === 'typescript' ? 'TS' : lang === 'javascript' ? 'JS' : lang}
              </span>
            ))}
            {extraLangs > 0 && <span className="text-brand-navy/40">+{extraLangs}</span>}
          </span>
        </div>
      </div>

      {/* Candidates count */}
      <div className="w-32 flex items-center gap-1.5 text-sm text-brand-navy/70">
        <Users size={13} className="text-brand-navy/35" aria-hidden="true" />
        <span className="tabular-nums font-medium">{assessment.candidate_count}</span>
        <span className="text-brand-navy/40 text-xs">
          candidate{assessment.candidate_count !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Status badge */}
      <div className="w-20">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${status.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${assessment.status === 'active' ? 'animate-pulse' : ''}`} />
          {status.label}
        </span>
      </div>

      {/* Created date */}
      <div className="w-24 text-xs text-brand-navy/50">
        {format(new Date(assessment.created_at), 'MMM d, yyyy')}
      </div>

      {/* Actions — revealed on hover */}
      <div
        className="w-24 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <IconBtn label="Invite candidate" onClick={onInvite}>
          <Users size={14} />
        </IconBtn>
        <IconBtn label="View results" onClick={onView}>
          <BarChart2 size={14} />
        </IconBtn>
        <IconBtn
          label="Archive"
          onClick={onArchive}
          disabled={assessment.status === 'archived'}
          className="hover:text-red-500 hover:bg-red-50"
        >
          <Archive size={14} />
        </IconBtn>
      </div>
    </motion.div>
  )
}

function IconBtn({
  label, onClick, children, disabled, className = '',
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors disabled:opacity-30 disabled:pointer-events-none ${className}`}
    >
      {children}
    </button>
  )
}
