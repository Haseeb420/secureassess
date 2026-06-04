'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assessmentsApi } from '../lib/api'

interface Props {
  assessmentId: string
  assessmentTitle?: string
  onClose: () => void
}

export function InviteDialog({ assessmentId, assessmentTitle, onClose }: Props) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [expiresInHours, setExpiresInHours] = useState(48)
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const create = useMutation({
    mutationFn: () =>
      assessmentsApi.createInvite(assessmentId, {
        candidate_email: email,
        candidate_name: name || 'Candidate',
        expiry_at: new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString(),
        usage_limit: 1,
      }),
    onSuccess: (data) => {
      setCreatedToken(data.token_value)
      qc.invalidateQueries({ queryKey: ['invites', assessmentId] })
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
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">Invite Candidate</h2>
            {assessmentTitle && (
              <p className="mt-0.5 text-sm text-brand-navy/60">{assessmentTitle}</p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-brand-navy/40 hover:text-brand-navy text-xl leading-none ml-4">
            ×
          </button>
        </div>

        {createdToken ? (
          <div className="space-y-4">
            <p className="text-sm text-brand-navy/70">
              Invite created. Share this token with the candidate — they paste it into the
              desktop app under <strong className="text-brand-navy">"Login with Invite Token"</strong>.
            </p>
            <div className="rounded-lg border border-brand-border bg-brand-surface p-4">
              <p className="mb-1.5 text-xs font-medium text-brand-navy/50">Invite Token</p>
              <code className="block break-all font-mono text-sm text-brand-navy leading-relaxed">
                {createdToken}
              </code>
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
          <form onSubmit={(e) => { e.preventDefault(); create.mutate() }} className="space-y-4">
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
                Candidate Name{' '}
                <span className="font-normal text-brand-navy/40">(optional)</span>
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
