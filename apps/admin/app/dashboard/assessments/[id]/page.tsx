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

const STATUS_CLASSES: Record<CandidateRow['status'], string> = {
  not_started: 'bg-brand-surface text-brand-navy/50',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-green-100 text-green-700',
}

const columns = [
  col.accessor('name', { header: 'Name' }),
  col.accessor('email', { header: 'Email' }),
  col.accessor('status', {
    header: 'Status',
    cell: (i) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASSES[i.getValue()]}`}>
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
          className="text-xs font-medium text-brand-orange hover:text-brand-orange-light"
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
    return <div className="p-8 text-brand-navy/40">Loading…</div>
  }

  if (!data) {
    return <div className="p-8 text-red-500">Assessment not found.</div>
  }

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5 flex items-start justify-between">
        <div>
          <Link href="/dashboard/assessments" className="mb-1 block text-xs text-brand-navy/40 hover:text-brand-navy">
            ← Assessments
          </Link>
          <h1 className="text-xl font-semibold text-brand-navy">{data.title}</h1>
        </div>
        <button
          type="button"
          onClick={() => archive.mutate()}
          disabled={data.status === 'archived' || archive.isPending}
          className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-navy/60 hover:border-red-300 hover:text-red-500 disabled:opacity-40 transition-colors"
        >
          {archive.isPending ? 'Archiving…' : 'Archive'}
        </button>
      </div>

      <div className="p-8 max-w-4xl">
        <div className="mb-6 grid grid-cols-3 gap-4">
          <InfoCard label="Duration" value={`${data.duration_minutes} min`} />
          <InfoCard label="Status" value={data.status} />
          <InfoCard label="Security Level" value={data.security_level} />
          <InfoCard label="Languages" value={data.allowed_languages.join(', ')} />
          <InfoCard label="Candidates" value={String(data.candidate_count)} />
        </div>

        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-navy/50">Candidates</h2>
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-brand-navy/40">
                    No candidates invited yet.
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

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-brand-border bg-white px-4 py-3 shadow-sm">
      <p className="text-xs text-brand-navy/50">{label}</p>
      <p className="mt-1 text-sm capitalize text-brand-navy font-medium">{value}</p>
    </div>
  )
}
