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
            ? 'bg-green-900 text-green-300'
            : 'bg-zinc-800 text-zinc-400'
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
      <Link href={`/dashboard/assessments/${assessment.id}`} className="text-blue-400 hover:underline">
        Edit
      </Link>
      <button
        type="button"
        onClick={() => archive.mutate()}
        disabled={assessment.status === 'archived' || archive.isPending}
        className="text-zinc-400 hover:text-red-400 disabled:opacity-40"
      >
        Archive
      </button>
      <Link href={`/dashboard/assessments/${assessment.id}`} className="text-zinc-400 hover:text-white">
        View Results
      </Link>
    </div>
  )
}

export default function AssessmentsPage() {
  const { data = [], isLoading } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Assessments</h1>
        <Link
          href="/dashboard/assessments/new"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:opacity-90"
        >
          + New Assessment
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  No assessments yet.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-zinc-200">
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
  )
}
