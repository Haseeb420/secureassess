'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { assessmentsApi, type Assessment } from '../../../lib/api'

const col = createColumnHelper<Assessment>()

const columns = [
  col.accessor('title', { header: 'Title' }),
  col.accessor('status', {
    header: 'Status',
    cell: (i) => (
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          i.getValue() === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-brand-surface text-brand-navy/50'
        }`}
      >
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor('candidate_count', { header: 'Candidates' }),
  col.accessor('created_at', {
    header: 'Created',
    cell: (i) => format(new Date(i.getValue()), 'MMM d, yyyy'),
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => <RowActions assessment={row.original} />,
  }),
]

function RowActions({ assessment }: { assessment: Assessment }) {
  const qc = useQueryClient()
  const archive = useMutation({
    mutationFn: () => assessmentsApi.archive(assessment.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['assessments'] }),
  })

  return (
    <div className="flex items-center gap-3 text-sm">
      <Link href={`/dashboard/assessments/${assessment.id}`} className="text-brand-orange hover:text-brand-orange-light font-medium">
        Edit
      </Link>
      <button
        type="button"
        onClick={() => archive.mutate()}
        disabled={assessment.status === 'archived' || archive.isPending}
        className="text-brand-navy/40 hover:text-red-500 disabled:opacity-40"
      >
        Archive
      </button>
      <Link href={`/dashboard/assessments/${assessment.id}`} className="text-brand-navy/40 hover:text-brand-navy">
        View Results
      </Link>
    </div>
  )
}

export default function AssessmentsPage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Assessments</h1>
          <p className="mt-0.5 text-sm text-brand-navy/60">Manage and review assessments</p>
        </div>
        <Link
          href="/dashboard/assessments/new"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
        >
          + New Assessment
        </Link>
      </div>

      <div className="p-8">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {String(error)}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-brand-border bg-brand-surface">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-brand-navy/40">
                    Loading…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-brand-navy/40">
                    No assessments yet.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-brand-border hover:bg-brand-navy-pale transition-colors last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-brand-navy">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
