'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format, fromUnixTime } from 'date-fns'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { assessmentsApi, type CandidateRow, type Invite } from '../../../../lib/api'

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
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', id],
    queryFn: () => assessmentsApi.get(id),
  })

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['invites', id],
    queryFn: () => assessmentsApi.listInvites(id),
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

  if (isLoading) return <div className="p-8 text-brand-navy/40">Loading…</div>
  if (!data) return <div className="p-8 text-red-500">Assessment not found.</div>

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5 flex items-start justify-between">
        <div>
          <Link href="/dashboard/assessments" className="mb-1 block text-xs text-brand-navy/40 hover:text-brand-navy">
            ← Assessments
          </Link>
          <h1 className="text-xl font-semibold text-brand-navy">{data.title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowInviteDialog(true)}
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
          >
            + Invite Candidate
          </button>
          <button
            type="button"
            onClick={() => archive.mutate()}
            disabled={data.status === 'archived' || archive.isPending}
            className="rounded-lg border border-brand-border px-3 py-2 text-sm text-brand-navy/60 hover:border-red-300 hover:text-red-500 disabled:opacity-40 transition-colors"
          >
            {archive.isPending ? 'Archiving…' : 'Archive'}
          </button>
        </div>
      </div>

      <div className="p-8 max-w-4xl space-y-8">
        {/* Info cards */}
        <div className="grid grid-cols-3 gap-4">
          <InfoCard label="Duration" value={`${data.duration_minutes} min`} />
          <InfoCard label="Status" value={data.status} />
          <InfoCard label="Security Level" value={data.security_level} />
          <InfoCard label="Languages" value={data.allowed_languages.join(', ')} />
          <InfoCard label="Candidates" value={String(data.candidate_count)} />
        </div>

        {/* Candidates table */}
        <section>
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
                      No candidates yet. Send an invite to get started.
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
        </section>

        {/* Invites table */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-navy/50">Invite Links</h2>
          <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
            {invitesLoading ? (
              <div className="px-4 py-8 text-center text-brand-navy/40 text-sm">Loading…</div>
            ) : invites.length === 0 ? (
              <div className="px-4 py-8 text-center text-brand-navy/40 text-sm">No invites sent yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface">
                    {['Candidate', 'Token', 'Expires', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <InviteRow key={invite.id} invite={invite} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {showInviteDialog && (
        <InviteDialog
          assessmentId={id}
          onClose={() => setShowInviteDialog(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['invites', id] })}
        />
      )}
    </div>
  )
}

function InviteRow({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false)
  const isExpired = invite.expires_at < Math.floor(Date.now() / 1000)
  const isUsed = !!invite.used_at

  const copy = () => {
    navigator.clipboard.writeText(invite.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <tr className="border-b border-brand-border last:border-0">
      <td className="px-4 py-3">
        <p className="text-brand-navy font-medium">{invite.candidate_email}</p>
        {invite.candidate_name && <p className="text-brand-navy/50 text-xs">{invite.candidate_name}</p>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="rounded bg-brand-surface px-2 py-0.5 font-mono text-xs text-brand-navy/70">
            {invite.token.slice(0, 16)}…
          </code>
          <button
            type="button"
            onClick={copy}
            className="text-xs text-brand-orange hover:text-brand-orange-light transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-brand-navy/60 text-xs">
        {format(fromUnixTime(invite.expires_at), 'MMM d, yyyy HH:mm')}
      </td>
      <td className="px-4 py-3">
        {isUsed ? (
          <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Used</span>
        ) : isExpired ? (
          <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">Expired</span>
        ) : (
          <span className="inline-flex rounded-full bg-brand-orange-pale px-2 py-0.5 text-xs font-medium text-brand-orange">Pending</span>
        )}
      </td>
    </tr>
  )
}

function InviteDialog({
  assessmentId,
  onClose,
  onCreated,
}: {
  assessmentId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expiresInHours, setExpiresInHours] = useState(48)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const create = useMutation({
    mutationFn: () =>
      assessmentsApi.createInvite(assessmentId, {
        candidate_email: email,
        candidate_name: name || undefined,
        expires_in_hours: expiresInHours,
      }),
    onSuccess: (data) => {
      setCreatedToken(data.token)
      onCreated()
    },
  })

  const copy = () => {
    if (!createdToken) return
    navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-navy/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-xl border border-brand-border bg-white shadow-xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-brand-navy">Invite Candidate</h2>
          <button type="button" onClick={onClose} className="text-brand-navy/40 hover:text-brand-navy text-xl leading-none">×</button>
        </div>

        {createdToken ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-navy/70">
              Invite created. Share this token with the candidate — they paste it in the desktop app under "Login with Invite Token".
            </p>
            <div className="rounded-lg border border-brand-border bg-brand-surface p-3">
              <p className="mb-1 text-xs font-medium text-brand-navy/50">Invite Token</p>
              <code className="block break-all font-mono text-sm text-brand-navy">{createdToken}</code>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={copy}
                className="flex-1 rounded-lg bg-brand-orange hover:bg-brand-orange-light px-4 py-2.5 text-sm font-medium text-white transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy Token'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-brand-border px-4 py-2.5 text-sm text-brand-navy hover:border-brand-navy transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); create.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">
                Candidate Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">
                Candidate Name <span className="text-brand-navy/40 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Smith"
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-brand-navy">Expires in</label>
              <select
                value={expiresInHours}
                onChange={(e) => setExpiresInHours(Number(e.target.value))}
                className="w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange"
              >
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={168}>7 days</option>
                <option value={720}>30 days</option>
              </select>
            </div>

            {create.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {String(create.error)}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={create.isPending || !email}
                className="flex-1 rounded-lg bg-brand-orange hover:bg-brand-orange-light px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50"
              >
                {create.isPending ? 'Creating…' : 'Create Invite'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-brand-border px-4 py-2.5 text-sm text-brand-navy hover:border-brand-navy transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
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
