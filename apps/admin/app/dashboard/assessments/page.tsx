'use client'

import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  flexRender, createColumnHelper,
} from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { format } from 'date-fns'
import { Search, Pencil, Archive, BarChart2, ClipboardList, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { Badge, EmptyState, Skeleton, ConfirmDialog } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { InviteDialog } from '../../../components/InviteDialog'
import { assessmentsApi, type Assessment } from '../../../lib/api'

const col = createColumnHelper<Assessment>()

const STATUS_BADGE: Record<string, Parameters<typeof Badge>[0]['variant']> = {
  active:   'success',
  archived: 'neutral',
  draft:    'warning',
}

type FilterStatus = 'all' | 'active' | 'archived'

const FILTER_LABELS: Record<FilterStatus, string> = {
  all: 'All', active: 'Active', archived: 'Archived',
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

  const filtered = data.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const columns = [
    col.accessor('title', {
      header: 'Title',
      cell: (i) => <span className="font-medium text-brand-navy">{i.getValue()}</span>,
    }),
    col.accessor('status', {
      header: 'Status',
      cell: (i) => (
        <Badge variant={STATUS_BADGE[i.getValue()] ?? 'neutral'} className="capitalize">
          {i.getValue()}
        </Badge>
      ),
    }),
    col.accessor('candidate_count', {
      header: 'Candidates',
      cell: (i) => (
        <span className="flex items-center gap-1.5 text-brand-navy/70">
          <Users size={13} aria-hidden="true" />
          {i.getValue()}
        </span>
      ),
    }),
    col.accessor('created_at', {
      header: 'Created',
      cell: (i) => <span className="text-brand-navy/60">{format(new Date(i.getValue()), 'MMM d, yyyy')}</span>,
    }),
    col.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconBtn label="Invite candidate" onClick={() => setInviteAssessment(row.original)}>
            <Users size={15} />
          </IconBtn>
          <IconBtn label="Edit assessment" onClick={() => router.push(`/dashboard/assessments/${row.original.id}`)}>
            <Pencil size={15} />
          </IconBtn>
          <IconBtn label="View results" onClick={() => router.push(`/dashboard/assessments/${row.original.id}`)}>
            <BarChart2 size={15} />
          </IconBtn>
          <IconBtn
            label="Archive assessment"
            disabled={row.original.status === 'archived'}
            onClick={() => setArchiveTarget(row.original)}
            className="text-red-400 hover:text-red-600"
          >
            <Archive size={15} />
          </IconBtn>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: filtered,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div>
      <PageHeader
        title="Assessments"
        subtitle="Manage and review assessments"
        actions={
          <Link
            href="/dashboard/assessments/new"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
          >
            + New Assessment
          </Link>
        }
      />

      <div className="p-8">
        {/* Search + filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-xs">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40" aria-hidden="true" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assessments…"
              className="w-full rounded-lg border border-brand-border bg-white py-2 pl-9 pr-3 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
            />
          </div>
          <div className="flex gap-1">
            {(Object.keys(FILTER_LABELS) as FilterStatus[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={[
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                  statusFilter === f
                    ? 'bg-brand-orange text-white'
                    : 'bg-white border border-brand-border text-brand-navy/60 hover:border-brand-navy',
                ].join(' ')}
              >
                {FILTER_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border bg-brand-surface">
                {table.getHeaderGroups()[0].headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-brand-border">
                    {[200, 80, 100, 100, 80].map((w, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className={`h-4 w-${w === 200 ? 'full max-w-[200px]' : w}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState
                      icon={ClipboardList}
                      title="No assessments yet"
                      description="Create your first assessment to get started."
                      action={
                        <Link
                          href="/dashboard/assessments/new"
                          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
                        >
                          Create Assessment
                        </Link>
                      }
                    />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <motion.tr
                    key={row.id}
                    layout
                    onClick={() => router.push(`/dashboard/assessments/${row.original.id}`)}
                    className="border-b border-brand-border hover:bg-brand-navy-pale transition-colors last:border-0 cursor-pointer"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive assessment?"
        description={`"${archiveTarget?.title}" will be archived. Candidates will no longer be able to access it.`}
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
      className={`rounded p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  )
}
