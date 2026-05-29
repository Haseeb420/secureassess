'use client'

import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { assessmentsApi, type CandidateRow } from '../../../../lib/api'

const col = createColumnHelper<CandidateRow>()

const STATUS_COLORS: Record<CandidateRow['status'], string> = {
  not_started: 'bg-zinc-800 text-zinc-400',
  in_progress: 'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
}

const columns = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('status', {
    header: 'Status',
    cell: (i) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[i.getValue()]}`}>
        {i.getValue().replace('_', ' ')}
      </span>
    ),
  }),
  col.accessor('score', {
    header: 'Score',
    cell: (i) => (i.getValue() != null ? `${i.getValue()}%` : '—'),
  }),
  col.display({
    id: 'report',
    header: '',
    cell: ({ row }) =>
      row.original.session_id ? (
        <Link
          href={`/dashboard/reports/${row.original.session_id}`}
          className="text-xs text-blue-400 hover:underline"
        >
          Report
        </Link>
      ) : null,
  }),
]

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', id],
    queryFn: () => assessmentsApi.get(id),
  })

  const archive = useMutation({
    mutationFn: () => assessmentsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      router.push('/dashboard/assessments')
    },
  })

  const table = useReactTable({
    data: data?.candidates ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return <div className="p-6 text-zinc-500">Loading…</div>
  }

  if (!data) {
    return <div className="p-6 text-red-400">Assessment not found.</div>
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/dashboard/assessments" className="mb-1 block text-xs text-zinc-500 hover:text-zinc-300">
            ← Assessments
          </Link>
          <h1 className="text-xl font-semibold">{data.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => archive.mutate()}
          disabled={data.status === 'archived' || archive.isPending}
          className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:border-red-500 hover:text-red-400 disabled:opacity-40"
        >
          {archive.isPending ? 'Archiving…' : 'Archive'}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <InfoCard label="Duration" value={`${data.duration_minutes} min`} />
        <InfoCard label="Status" value={data.status} />
        <InfoCard label="Security Level" value={data.security_level} />
        <InfoCard
          label="Languages"
          value={data.allowed_languages.join(', ')}
        />
        <InfoCard label="Candidates" value={String(data.candidate_count)} />
      </div>

      <h2 className="mb-3 text-sm font-medium text-zinc-400">Candidates</h2>
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
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  No candidates invited yet.
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-sm capitalize text-zinc-200">{value}</p>
    </div>
  )
}
