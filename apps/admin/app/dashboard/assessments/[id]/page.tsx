'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { addDays, format, formatDistanceToNow, isPast } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Clock, Shield, Code, Users, ArrowLeft, UserPlus,
  Check, Copy, BarChart2, AlertCircle, FileCode2, Search, X, Plus,
  GripVertical, Trash2, Loader2, CheckCircle2, ShieldOff, Mail,
} from 'lucide-react'
import { ConfirmDialog } from '@secureassess/ui'
import {
  assessmentsApi, questionsApi, tokensApi,
  type CandidateRow, type Invite, type Assessment, type AssessmentQuestion, type Question,
} from '../../../../lib/api'

// ── Status helpers ────────────────────────────────────────────────────────────

type InviteStatus = 'active' | 'expired' | 'limit_reached' | 'revoked'

function getInviteStatus(invite: Invite): InviteStatus {
  if (invite.is_revoked) return 'revoked'
  if (invite.expiry_at && isPast(new Date(invite.expiry_at))) return 'expired'
  if (invite.usage_limit !== null && invite.usage_limit !== undefined && invite.used_count >= invite.usage_limit) return 'limit_reached'
  return 'active'
}

const INVITE_STATUS_CONFIG: Record<InviteStatus, { label: string; dot: string; badge: string }> = {
  active:        { label: 'Active',        dot: 'bg-emerald-400 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  expired:       { label: 'Expired',       dot: 'bg-red-400',                   badge: 'bg-red-50 text-red-700 ring-red-200' },
  limit_reached: { label: 'Limit Reached', dot: 'bg-amber-400',                 badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  revoked:       { label: 'Revoked',       dot: 'bg-brand-border',              badge: 'bg-brand-surface text-brand-navy/50 ring-brand-border' },
}

const CANDIDATE_STATUS: Record<string, { label: string; dot: string; text: string; bg: string; pulse: boolean }> = {
  not_started: { label: 'Not started', dot: 'bg-brand-border',  text: 'text-brand-navy/50', bg: 'bg-brand-surface',  pulse: false },
  in_progress:  { label: 'In progress',  dot: 'bg-blue-400',     text: 'text-blue-700',      bg: 'bg-blue-50',        pulse: true  },
  completed:    { label: 'Completed',    dot: 'bg-emerald-400',  text: 'text-emerald-700',   bg: 'bg-emerald-50',     pulse: false },
  submitted:    { label: 'Submitted',    dot: 'bg-emerald-400',  text: 'text-emerald-700',   bg: 'bg-emerald-50',     pulse: false },
  abandoned:    { label: 'Abandoned',    dot: 'bg-red-400',      text: 'text-red-700',       bg: 'bg-red-50',         pulse: false },
  terminated:   { label: 'Terminated',   dot: 'bg-red-400',      text: 'text-red-700',       bg: 'bg-red-50',         pulse: false },
}

const CANDIDATE_STATUS_FALLBACK = { label: 'Unknown', dot: 'bg-brand-border', text: 'text-brand-navy/50', bg: 'bg-brand-surface', pulse: false }

const TYPE_LABEL: Record<string, string> = {
  coding: 'Coding', debugging: 'Debugging', sql: 'SQL', mcq: 'MCQ', system_design: 'System Design', text: 'Text',
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  hard:   'bg-red-50 text-red-600 ring-red-200',
}

const TYPE_BADGE: Record<string, string> = {
  coding: 'bg-blue-50 text-blue-700', mcq: 'bg-violet-50 text-violet-700', text: 'bg-amber-50 text-amber-700',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase()
}

function AvatarCircle({ name }: { name: string }) {
  const palette = ['bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500']
  const color = palette[name.charCodeAt(0) % palette.length]
  return (
    <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color} text-white text-[11px] font-semibold`}>
      {getInitials(name)}
    </span>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <div className="h-3 w-20 bg-brand-border/60 rounded mb-3" />
        <div className="flex items-start justify-between">
          <div className="space-y-2.5">
            <div className="h-6 w-64 bg-brand-border rounded" />
            <div className="h-4 w-28 bg-brand-border/60 rounded-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 bg-brand-border/60 rounded-lg" />
            <div className="h-9 w-20 bg-brand-border/60 rounded-lg" />
          </div>
        </div>
      </div>
      <div className="border-b border-brand-border bg-white px-8 py-4 flex gap-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-4 w-4 bg-brand-border/60 rounded" />
            <div className="space-y-1.5">
              <div className="h-2.5 w-12 bg-brand-border/60 rounded" />
              <div className="h-3.5 w-20 bg-brand-border rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="p-8 max-w-5xl space-y-8">
        <div className="flex gap-4 border-b border-brand-border pb-0">
          <div className="h-8 w-24 bg-brand-border/40 rounded" />
          <div className="h-8 w-20 bg-brand-border/40 rounded" />
        </div>
        <div className="rounded-xl border border-brand-border bg-white overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-brand-border last:border-0">
              <div className="h-7 w-7 bg-brand-border/60 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-32 bg-brand-border rounded" />
                <div className="h-3 w-44 bg-brand-border/60 rounded" />
              </div>
              <div className="h-5 w-20 bg-brand-border/60 rounded-full" />
              <div className="h-5 w-10 bg-brand-border/60 rounded" />
              <div className="h-6 w-14 bg-brand-border/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Invite form schema ────────────────────────────────────────────────────────

const inviteSchema = z.object({
  candidateName:  z.string().min(1, 'Enter candidate name'),
  candidateEmail: z.string().email('Enter a valid email'),
  mockIds:        z.array(z.string()),
  noExpiry:       z.boolean(),
  expiryAt:       z.string().optional(),
  usageMode:      z.enum(['single', 'multiple', 'unlimited']),
  usageLimit:     z.number().int().min(2).optional(),
  notes:          z.string().optional(),
}).refine((d) => d.noExpiry || (d.expiryAt && d.expiryAt.length > 0), {
  message: 'Set an expiry date or enable no expiry',
  path: ['expiryAt'],
})

type InviteFormValues = z.infer<typeof inviteSchema>

// ── Invite Drawer ─────────────────────────────────────────────────────────────

function InviteDrawer({
  open,
  onClose,
  assessmentId,
  assessmentTitle,
  allAssessments,
}: {
  open: boolean
  onClose: () => void
  assessmentId: string
  assessmentTitle: string
  allAssessments: Assessment[]
}) {
  const qc = useQueryClient()
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState('')
  const [copied, setCopied] = useState(false)

  const defaultExpiry = addDays(new Date(), 7).toISOString().slice(0, 16)

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      candidateName: '', candidateEmail: '',
      mockIds: [], noExpiry: false, expiryAt: defaultExpiry,
      usageMode: 'single', usageLimit: undefined, notes: '',
    },
  })

  const usageMode = watch('usageMode')
  const noExpiry = watch('noExpiry')

  const mockOptions = allAssessments.filter((a) => a.id !== assessmentId && a.is_mock)

  const create = useMutation({
    mutationFn: (data: InviteFormValues) =>
      assessmentsApi.createInvite(assessmentId, {
        candidate_name:  data.candidateName,
        candidate_email: data.candidateEmail,
        mock_ids:        data.mockIds,
        expiry_at:       data.noExpiry ? null : (data.expiryAt ? new Date(data.expiryAt).toISOString() : null),
        usage_limit:     data.usageMode === 'single' ? 1 : data.usageMode === 'unlimited' ? null : (data.usageLimit ?? 2),
        notes:           data.notes || null,
      }),
    onSuccess: (invite) => {
      setCreatedToken(invite.token_value)
      setCreatedName(invite.candidate_name)
      qc.invalidateQueries({ queryKey: ['invites', assessmentId] })
    },
  })

  const copyToken = () => {
    if (!createdToken) return
    navigator.clipboard.writeText(createdToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    reset()
    setCreatedToken(null)
    setCopied(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-brand-navy/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[480px] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Invite Candidate"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-brand-border px-6 py-4 shrink-0">
              <div>
                <h2 className="text-base font-semibold text-brand-navy">Invite Candidate</h2>
                <p className="mt-0.5 text-xs text-brand-navy/50">{assessmentTitle}</p>
              </div>
              <button
                type="button" onClick={handleClose} aria-label="Close drawer"
                className="rounded-lg p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {createdToken ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="bg-brand-surface rounded-2xl p-6 text-center"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 border border-brand-orange/20 mb-3 mx-auto">
                    <CheckCircle2 size={28} className="text-brand-orange" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-brand-navy" style={{ fontFamily: 'Syne, sans-serif' }}>
                    Invite Created
                  </h3>
                  <p className="mt-2 text-sm text-brand-navy/70">
                    Share this token with {createdName}:
                  </p>
                  <div className="mt-4 rounded-xl border border-brand-border bg-white p-3 text-center">
                    <code className="font-mono font-bold text-xl text-brand-navy tracking-widest">
                      {createdToken}
                    </code>
                  </div>
                  <button
                    type="button" onClick={copyToken}
                    className="mt-4 w-full flex items-center justify-center gap-2 rounded-lg bg-brand-surface border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-navy hover:border-brand-navy/30 transition-colors"
                  >
                    {copied ? <><Check size={14} aria-hidden="true" />Copied!</> : <><Copy size={14} aria-hidden="true" />Copy Token</>}
                  </button>
                  <p className="mt-3 text-xs text-brand-navy/50">
                    This token is shown once. Save or share it now.
                  </p>
                </motion.div>
              ) : (
                <form id="invite-form" onSubmit={handleSubmit((d) => create.mutateAsync(d))} noValidate className="space-y-5">
                  {/* Candidate Name */}
                  <div>
                    <label htmlFor="cName" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Candidate Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      {...register('candidateName')} id="cName" type="text"
                      placeholder="Jane Smith" aria-required="true"
                      aria-describedby={errors.candidateName ? 'cName-error' : undefined}
                      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none transition-shadow ${errors.candidateName ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15'}`}
                    />
                    {errors.candidateName && (
                      <motion.p id="cName-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-1.5 text-xs text-red-500">
                        {errors.candidateName.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Candidate Email */}
                  <div>
                    <label htmlFor="cEmail" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Candidate Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      {...register('candidateEmail')} id="cEmail" type="email"
                      placeholder="jane@example.com" aria-required="true"
                      aria-describedby={errors.candidateEmail ? 'cEmail-error' : undefined}
                      className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none transition-shadow ${errors.candidateEmail ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15'}`}
                    />
                    {errors.candidateEmail && (
                      <motion.p id="cEmail-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-1.5 text-xs text-red-500">
                        {errors.candidateEmail.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Practice Rounds */}
                  {mockOptions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-brand-navy">
                        Practice Rounds
                        <span className="ml-1.5 text-xs font-normal text-brand-navy/40">(optional)</span>
                      </p>
                      <div className="rounded-lg border border-brand-border bg-brand-surface/50 px-3 py-2.5 space-y-2 max-h-32 overflow-y-auto">
                        <Controller
                          control={control}
                          name="mockIds"
                          render={({ field }) => (
                            <>
                              {mockOptions.map((a) => (
                                <label key={a.id} className="flex items-center gap-2.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    value={a.id}
                                    checked={field.value.includes(a.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) field.onChange([...field.value, a.id])
                                      else field.onChange(field.value.filter((id) => id !== a.id))
                                    }}
                                    className="rounded border-brand-border accent-brand-orange"
                                  />
                                  <span className="text-sm text-brand-navy">{a.title}</span>
                                </label>
                              ))}
                            </>
                          )}
                        />
                      </div>
                      <p className="mt-1 text-xs text-brand-navy/50">Candidate can attempt practice rounds unlimited times.</p>
                    </div>
                  )}

                  {/* Token Expiry */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label htmlFor="expiryAt" className="text-sm font-medium text-brand-navy">
                        Access expires on {!noExpiry && <span className="text-red-500" aria-hidden="true">*</span>}
                      </label>
                      <Controller
                        control={control}
                        name="noExpiry"
                        render={({ field }) => (
                          <label className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={(e) => {
                                field.onChange(e.target.checked)
                                if (e.target.checked) setValue('expiryAt', '')
                              }}
                              className="rounded border-brand-border accent-brand-orange"
                              aria-label="No expiry"
                            />
                            <span className="text-xs font-medium text-brand-navy/70">No expiry</span>
                          </label>
                        )}
                      />
                    </div>
                    {noExpiry ? (
                      <div className="flex items-center gap-2 rounded-lg border border-brand-border bg-brand-surface/50 px-3 py-2.5">
                        <span className="text-sm text-brand-navy/50">Token never expires</span>
                      </div>
                    ) : (
                      <input
                        {...register('expiryAt')} id="expiryAt" type="datetime-local"
                        aria-required={!noExpiry}
                        aria-describedby={errors.expiryAt ? 'expiryAt-error' : undefined}
                        className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition-shadow ${errors.expiryAt ? 'border-red-400 focus:ring-2 focus:ring-red-200' : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15'}`}
                      />
                    )}
                    {errors.expiryAt && (
                      <motion.p id="expiryAt-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-1.5 text-xs text-red-500">
                        {errors.expiryAt.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Usage Limit */}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-brand-navy">Usage Limit</p>
                    <div className="flex gap-2 mb-2.5">
                      <Controller
                        control={control}
                        name="usageMode"
                        render={({ field }) => (
                          <>
                            {(['single', 'multiple', 'unlimited'] as const).map((mode) => (
                              <button
                                key={mode} type="button"
                                onClick={() => field.onChange(mode)}
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${field.value === mode ? 'border-brand-orange bg-brand-orange/5 text-brand-orange' : 'border-brand-border text-brand-navy/60 hover:border-brand-navy/30'}`}
                              >
                                {mode === 'single' ? 'Single' : mode === 'multiple' ? 'Multiple' : 'Unlimited'}
                              </button>
                            ))}
                          </>
                        )}
                      />
                    </div>
                    {usageMode === 'multiple' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} transition={{ duration: 0.15 }}>
                        <input
                          {...register('usageLimit', { valueAsNumber: true })}
                          type="number" min={2} placeholder="e.g. 3"
                          className="w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                        />
                      </motion.div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Notes
                      <span className="ml-1.5 text-xs font-normal text-brand-navy/40">(optional)</span>
                    </label>
                    <textarea
                      {...register('notes')} id="notes" rows={3}
                      placeholder="Internal notes about this candidate…"
                      className="w-full rounded-lg border border-brand-border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow resize-none"
                    />
                  </div>

                  {create.isError && (
                    <motion.div role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                      <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm text-red-600">{String(create.error)}</p>
                    </motion.div>
                  )}
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-brand-border px-6 py-4">
              {createdToken ? (
                <button
                  type="button" onClick={handleClose}
                  className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-light transition-colors"
                >
                  Done
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button" onClick={handleClose}
                    className="flex-1 rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-navy hover:border-brand-navy transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit" form="invite-form"
                    disabled={isSubmitting || create.isPending}
                    className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(isSubmitting || create.isPending) && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
                    Send Invite
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyBtn({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      type="button" onClick={copy} aria-label={`Copy ${label}`} title={`Copy ${label}`}
      className="rounded p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors"
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function InviteStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-brand-border rounded-xl p-4">
      <p className="font-bold text-2xl text-brand-navy tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-brand-navy/60">{label}</p>
    </div>
  )
}

// ── Invite row ────────────────────────────────────────────────────────────────

function InviteRow({
  invite,
  isSelected,
  onToggleSelect,
  onRevoke,
  onDelete,
}: {
  invite: Invite
  isSelected: boolean
  onToggleSelect: () => void
  onRevoke: (i: Invite) => void
  onDelete: (i: Invite) => void
}) {
  const st = getInviteStatus(invite)
  const cfg = INVITE_STATUS_CONFIG[st]
  const expiry = invite.expiry_at ? new Date(invite.expiry_at) : null
  const isUnlimited = invite.usage_limit === null || invite.usage_limit === undefined
  const usagePct = isUnlimited ? 0 : Math.min(100, Math.round((invite.used_count / invite.usage_limit!) * 100))

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0, transition: { duration: 0.15 } } }}
      className={`group flex items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 transition-colors ${isSelected ? 'bg-brand-orange/[0.03]' : 'hover:bg-brand-surface/40'}`}
    >
      {/* Checkbox */}
      <div className="w-4 shrink-0 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${invite.candidate_name}`}
          className="h-3.5 w-3.5 rounded border-brand-border accent-brand-orange cursor-pointer"
        />
      </div>

      {/* Candidate */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-navy truncate">{invite.candidate_name}</p>
        <p className="text-xs text-brand-navy/50 truncate">{invite.candidate_email}</p>
      </div>

      {/* Token */}
      <div className="w-36 flex items-center gap-1">
        <code className="font-mono text-xs font-semibold text-brand-navy/70 tracking-wider">
          {invite.token_value.slice(0, 8)}…
        </code>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <CopyBtn text={invite.token_value} label="token" />
        </span>
      </div>

      {/* Usage */}
      <div className="w-24">
        <p className="text-xs font-medium text-brand-navy tabular-nums mb-1.5">
          {isUnlimited ? `${invite.used_count} / ∞` : `${invite.used_count}/${invite.usage_limit}`}
        </p>
        {!isUnlimited && (
          <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${usagePct >= 100 ? 'bg-amber-400' : 'bg-brand-orange'}`}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
      </div>

      {/* Expires */}
      <div className="w-28">
        {expiry ? (
          <>
            <p className={`text-sm font-medium ${isPast(expiry) ? 'text-red-500' : 'text-brand-navy'}`}>
              {format(expiry, 'MMM d, yyyy')}
            </p>
            <p className={`text-xs ${isPast(expiry) ? 'text-red-400' : 'text-brand-navy/40'}`}>
              {isPast(expiry) ? `${formatDistanceToNow(expiry)} ago` : `in ${formatDistanceToNow(expiry)}`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-brand-navy">Never</p>
            <p className="text-xs text-brand-navy/40">No expiry</p>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="w-28">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div className="w-20 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
        <CopyBtn text={invite.token_value} label="token value" />
        <button
          type="button"
          onClick={() => onRevoke(invite)}
          disabled={invite.is_revoked}
          aria-label="Revoke invite"
          title="Revoke invite"
          className="rounded p-1.5 text-brand-navy/40 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          <ShieldOff size={13} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(invite)}
          aria-label="Delete invite"
          title="Delete invite"
          className="rounded p-1.5 text-brand-navy/40 hover:bg-red-50 hover:text-red-500 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [showInviteDrawer, setShowInviteDrawer] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Invite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Invite | null>(null)
  const [selectedInviteIds, setSelectedInviteIds] = useState<Set<string>>(new Set())
  const [showBulkRevokeDialog, setShowBulkRevokeDialog] = useState(false)
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [showBulkEmailDialog, setShowBulkEmailDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'candidates' | 'questions' | 'invites'>('candidates')

  const { data, isLoading } = useQuery({
    queryKey: ['assessments', id],
    queryFn: () => assessmentsApi.get(id),
  })

  const { data: invites = [], isLoading: invitesLoading } = useQuery({
    queryKey: ['invites', id],
    queryFn: () => assessmentsApi.listInvites(id),
  })

  const { data: allAssessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const archive = useMutation({
    mutationFn: () => assessmentsApi.archive(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments'] })
      router.push('/dashboard/assessments')
    },
  })

  const revoke = useMutation({
    mutationFn: (tokenId: string) => tokensApi.revoke(tokenId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['invites', id] })
      toast.success('Invite revoked')
      setRevokeTarget(null)
    },
    onError: () => toast.error('Failed to revoke invite'),
  })

  const bulkRevoke = useMutation({
    mutationFn: (ids: string[]) => tokensApi.bulkRevoke(ids),
    onSuccess: (_data, ids) => {
      qc.invalidateQueries({ queryKey: ['invites', id] })
      toast.success(`${ids.length} ${ids.length === 1 ? 'invite' : 'invites'} revoked`)
      setSelectedInviteIds(new Set())
      setShowBulkRevokeDialog(false)
    },
    onError: () => toast.error('Failed to revoke invites'),
  })

  const bulkDelete = useMutation({
    mutationFn: (ids: string[]) => tokensApi.bulkDelete(ids),
    onSuccess: (_data, ids) => {
      qc.invalidateQueries({ queryKey: ['invites', id] })
      toast.success(`${ids.length} ${ids.length === 1 ? 'invite' : 'invites'} deleted`)
      setDeleteTarget(null)
      setSelectedInviteIds(new Set())
      setShowBulkDeleteDialog(false)
    },
    onError: () => toast.error('Failed to delete invites'),
  })

  const bulkSendEmail = useMutation({
    mutationFn: (ids: string[]) => assessmentsApi.sendInviteEmails(id, ids),
    onSuccess: (result) => {
      const sentCount = result.sent.length
      const failedCount = result.failed.length
      if (sentCount > 0) {
        toast.success(`Email${sentCount !== 1 ? 's' : ''} sent to ${sentCount} candidate${sentCount !== 1 ? 's' : ''}`)
      }
      if (failedCount > 0) {
        toast.error(`Failed to send to ${failedCount} candidate${failedCount !== 1 ? 's' : ''}: ${result.failed.map((f) => f.name).join(', ')}`)
      }
      setSelectedInviteIds(new Set())
      setShowBulkEmailDialog(false)
    },
    onError: () => toast.error('Failed to send emails — check API email configuration'),
  })

  useEffect(() => {
    setSelectedInviteIds(new Set())
  }, [activeTab])

  if (isLoading) return <PageSkeleton />

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <AlertCircle size={32} className="text-red-400 mb-3" aria-hidden="true" />
        <p className="text-brand-navy font-medium">Assessment not found</p>
        <Link href="/dashboard/assessments" className="mt-3 text-sm text-brand-orange hover:text-brand-orange-light transition-colors">
          ← Back to assessments
        </Link>
      </div>
    )
  }

  const metrics = [
    { icon: Clock,   label: 'Duration',   value: `${data.duration_minutes} min` },
    { icon: Shield,  label: 'Security',   value: data.security_level },
    { icon: Users,   label: 'Candidates', value: String(data.candidate_count) },
    { icon: Code,    label: 'Languages',  value: data.allowed_languages.length > 2
      ? `${data.allowed_languages.slice(0, 2).join(', ')} +${data.allowed_languages.length - 2}`
      : data.allowed_languages.join(', ') },
  ]

  const inviteStats = {
    total:  invites.length,
    active: invites.filter((i) => getInviteStatus(i) === 'active').length,
    done:   invites.filter((i) => i.usage_limit !== null && i.usage_limit !== undefined && i.used_count >= i.usage_limit).length,
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Hero header */}
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Link href="/dashboard/assessments" className="mb-2 inline-flex items-center gap-1.5 text-xs text-brand-navy/40 hover:text-brand-navy transition-colors">
          <ArrowLeft size={12} aria-hidden="true" />
          Assessments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">{data.title}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                data.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-brand-surface text-brand-navy/50 ring-brand-border'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${data.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-brand-border'}`} />
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
              {data.allowed_languages.length > 0 && (
                <>
                  <span className="text-brand-border">·</span>
                  <span className="text-xs text-brand-navy/40">{data.allowed_languages.join(' · ')}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('invites'); setShowInviteDrawer(true) }}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm"
            >
              <UserPlus size={15} aria-hidden="true" />
              Invite Candidate
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
      </div>

      {/* Metric strip */}
      <div className="border-b border-brand-border bg-white px-8 py-4">
        <div className="flex items-center gap-8">
          {metrics.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5">
              <Icon size={15} className="text-brand-navy/35 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-[11px] text-brand-navy/50 uppercase tracking-wider leading-none mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-brand-navy capitalize">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-8 max-w-5xl space-y-6">
        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-brand-border">
          {([
            { key: 'candidates', label: 'Candidates', count: data.candidate_count },
            { key: 'questions',  label: 'Questions',  count: data.assessment_questions?.length ?? 0 },
            { key: 'invites',    label: 'Invites',    count: invites.length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${activeTab === key ? 'text-brand-navy' : 'text-brand-navy/50 hover:text-brand-navy/70'}`}
            >
              {label}
              <span className="ml-1.5 rounded-full bg-brand-surface px-1.5 py-0.5 text-xs text-brand-navy/50 tabular-nums">{count}</span>
              {activeTab === key && (
                <motion.div layoutId="tab-indicator" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-orange rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'candidates' && (
            <motion.section key="candidates" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                {data.candidates.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface border border-brand-border">
                      <Users size={22} className="text-brand-navy/25" />
                    </div>
                    <p className="text-sm font-medium text-brand-navy/60">No candidates yet</p>
                    <p className="text-xs text-brand-navy/40 mt-1 max-w-xs">
                      Invite candidates to this assessment to see their progress here.
                    </p>
                    <button
                      onClick={() => { setActiveTab('invites'); setShowInviteDrawer(true) }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3.5 py-2 text-xs font-medium text-white hover:bg-brand-orange-light transition-colors"
                    >
                      <UserPlus size={13} aria-hidden="true" />
                      Invite now
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
                      <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Candidate</span>
                      <span className="w-28 text-center text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Status</span>
                      <span className="w-16 text-center text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Score</span>
                      <span className="w-20 text-right text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Report</span>
                    </div>
                    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show">
                      {data.candidates.map((candidate) => (
                        <CandidateRowItem key={candidate.id} candidate={candidate} />
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </motion.section>
          )}

          {activeTab === 'questions' && (
            <QuestionsTab
              assessmentId={id}
              initialAssessmentQuestions={data.assessment_questions ?? []}
            />
          )}

          {activeTab === 'invites' && (
            <motion.section key="invites" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-brand-navy" style={{ fontFamily: 'Syne, sans-serif' }}>
                  Candidate Invites
                </h2>
                <button
                  type="button"
                  onClick={() => setShowInviteDrawer(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm"
                >
                  <Plus size={14} aria-hidden="true" />
                  Invite Candidate
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <InviteStatCard label="Total invited"   value={inviteStats.total} />
                <InviteStatCard label="Active invites"  value={inviteStats.active} />
                <InviteStatCard label="Completed"       value={inviteStats.done} />
              </div>

              {/* Bulk action bar */}
              <AnimatePresence>
                {selectedInviteIds.size > 0 && !invitesLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-2 rounded-xl border border-brand-navy/10 bg-brand-navy/[0.04] px-4 py-2.5"
                    role="toolbar"
                    aria-label="Bulk invite actions"
                  >
                    <span className="flex-1 text-xs font-semibold text-brand-navy">
                      {selectedInviteIds.size} {selectedInviteIds.size === 1 ? 'invite' : 'invites'} selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowBulkEmailDialog(true)}
                      disabled={bulkSendEmail.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-brand-orange/30 bg-brand-orange/8 px-3 py-1.5 text-xs font-medium text-brand-orange hover:bg-brand-orange/15 transition-colors disabled:opacity-50"
                    >
                      {bulkSendEmail.isPending ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Mail size={12} aria-hidden="true" />}
                      Send Email
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkRevokeDialog(true)}
                      disabled={bulkRevoke.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                    >
                      <ShieldOff size={12} aria-hidden="true" />
                      Revoke Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkDeleteDialog(true)}
                      disabled={bulkDelete.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={12} aria-hidden="true" />
                      Delete Selected
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedInviteIds(new Set())}
                      className="rounded-lg border border-brand-border bg-white px-3 py-1.5 text-xs text-brand-navy/60 hover:text-brand-navy transition-colors"
                    >
                      Clear
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table */}
              <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                {invitesLoading ? (
                  <div className="animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-brand-border last:border-0">
                        <div className="h-3.5 w-3.5 bg-brand-border/60 rounded" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-40 bg-brand-border rounded" />
                          <div className="h-3 w-24 bg-brand-border/60 rounded" />
                        </div>
                        <div className="h-5 w-24 bg-brand-border/60 rounded" />
                        <div className="h-5 w-20 bg-brand-border/60 rounded" />
                        <div className="h-5 w-24 bg-brand-border/60 rounded" />
                        <div className="h-5 w-20 bg-brand-border/60 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : invites.length === 0 ? (
                  <div className="flex flex-col items-center py-16 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-surface border border-brand-border">
                      <Users size={22} className="text-brand-navy/25" />
                    </div>
                    <p className="text-sm font-semibold text-brand-navy/60">No candidates invited yet</p>
                    <p className="text-xs text-brand-navy/40 mt-1">Invite a candidate to generate their access token.</p>
                    <button
                      type="button"
                      onClick={() => setShowInviteDrawer(true)}
                      className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
                    >
                      <Plus size={14} aria-hidden="true" />
                      Invite Candidate
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
                      <div className="w-4 flex items-center">
                        <input
                          type="checkbox"
                          checked={invites.length > 0 && selectedInviteIds.size === invites.length}
                          onChange={() => {
                            if (selectedInviteIds.size === invites.length) {
                              setSelectedInviteIds(new Set())
                            } else {
                              setSelectedInviteIds(new Set(invites.map((i) => i.id)))
                            }
                          }}
                          aria-label="Select all invites"
                          className="h-3.5 w-3.5 rounded border-brand-border accent-brand-orange cursor-pointer"
                        />
                      </div>
                      <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Candidate</span>
                      <span className="w-36 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Token</span>
                      <span className="w-24 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Usage</span>
                      <span className="w-28 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Expires</span>
                      <span className="w-28 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Status</span>
                      <span className="w-20" />
                    </div>
                    <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="show">
                      {invites.map((invite) => (
                        <InviteRow
                          key={invite.id}
                          invite={invite}
                          isSelected={selectedInviteIds.has(invite.id)}
                          onToggleSelect={() => {
                            setSelectedInviteIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(invite.id)) next.delete(invite.id)
                              else next.add(invite.id)
                              return next
                            })
                          }}
                          onRevoke={setRevokeTarget}
                          onDelete={setDeleteTarget}
                        />
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {/* Invite drawer */}
      <InviteDrawer
        open={showInviteDrawer}
        onClose={() => setShowInviteDrawer(false)}
        assessmentId={id}
        assessmentTitle={data.title}
        allAssessments={allAssessments}
      />

      {/* Revoke single confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this invite?"
        description={`The invite for ${revokeTarget?.candidate_name ?? 'this candidate'} will be permanently revoked. They will no longer be able to use it to access the assessment.`}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => revokeTarget && revoke.mutate(revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Delete single confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this invite?"
        description={`The invite for ${deleteTarget?.candidate_name ?? 'this candidate'} will be permanently removed. Any submissions made using this token are preserved and remain viewable in Results.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => deleteTarget && bulkDelete.mutate([deleteTarget.id])}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Bulk send email confirm */}
      <ConfirmDialog
        open={showBulkEmailDialog}
        title={`Send invite email to ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'candidate' : 'candidates'}?`}
        description={`Each selected candidate will receive an email with their unique access token, a download link for the SecureAssess app, and assessment guidelines. Emails are sent from hiring@wamolabs.com.`}
        confirmLabel={bulkSendEmail.isPending ? 'Sending…' : `Send ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'Email' : 'Emails'}`}
        cancelLabel="Cancel"
        variant="primary"
        onConfirm={() => bulkSendEmail.mutate([...selectedInviteIds])}
        onCancel={() => setShowBulkEmailDialog(false)}
      />

      {/* Bulk revoke confirm */}
      <ConfirmDialog
        open={showBulkRevokeDialog}
        title={`Revoke ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'invite' : 'invites'}?`}
        description="These candidates will no longer be able to use their tokens to access the assessment. Completed submissions are not affected."
        confirmLabel={`Revoke ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'Invite' : 'Invites'}`}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => bulkRevoke.mutate([...selectedInviteIds])}
        onCancel={() => setShowBulkRevokeDialog(false)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={showBulkDeleteDialog}
        title={`Delete ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'invite' : 'invites'}?`}
        description="The invite records will be permanently removed. All submissions made using these tokens are preserved and remain viewable in Results. This cannot be undone."
        confirmLabel={`Delete ${selectedInviteIds.size} ${selectedInviteIds.size === 1 ? 'Invite' : 'Invites'}`}
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => bulkDelete.mutate([...selectedInviteIds])}
        onCancel={() => setShowBulkDeleteDialog(false)}
      />
    </motion.div>
  )
}

// ── Candidate row ─────────────────────────────────────────────────────────────

function CandidateRowItem({ candidate }: { candidate: CandidateRow }) {
  const cfg = CANDIDATE_STATUS[candidate.status] ?? CANDIDATE_STATUS_FALLBACK
  return (
    <motion.div
      variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0, transition: { duration: 0.15 } } }}
      className="flex items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 hover:bg-brand-surface/40 transition-colors"
    >
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <AvatarCircle name={candidate.name} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-brand-navy truncate">{candidate.name}</p>
          <p className="text-xs text-brand-navy/50 truncate">{candidate.email}</p>
        </div>
      </div>
      <div className="w-28 flex justify-center">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
          {cfg.label}
        </span>
      </div>
      <div className="w-16 flex justify-center">
        {candidate.score != null ? (
          <span className={`text-sm font-semibold tabular-nums ${candidate.score >= 70 ? 'text-emerald-600' : candidate.score >= 40 ? 'text-amber-600' : 'text-red-500'}`}>
            {candidate.score}%
          </span>
        ) : (
          <span className="text-brand-navy/30 text-sm">—</span>
        )}
      </div>
      <div className="w-20 flex justify-end">
        {candidate.session_id ? (
          <Link
            href={`/dashboard/reports/${candidate.session_id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-orange hover:bg-brand-orange-pale transition-colors"
          >
            <BarChart2 size={11} aria-hidden="true" />
            Report
          </Link>
        ) : null}
      </div>
    </motion.div>
  )
}

// ── Questions tab ─────────────────────────────────────────────────────────────

function QuestionsTab({
  assessmentId,
  initialAssessmentQuestions,
}: {
  assessmentId: string
  initialAssessmentQuestions: AssessmentQuestion[]
}) {
  const qc = useQueryClient()
  type AqEntry = { question_id: string; weightage: number; order_index: number }
  const [aqEntries, setAqEntries] = useState<AqEntry[]>(
    initialAssessmentQuestions.map((aq, i) => ({
      question_id: aq.question.id,
      weightage: aq.weightage,
      order_index: i,
    })),
  )
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAqEntries(
      initialAssessmentQuestions.map((aq, i) => ({
        question_id: aq.question.id,
        weightage: aq.weightage,
        order_index: i,
      })),
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAssessmentQuestions.map((aq) => aq.question.id).join(',')])

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  })

  const save = useMutation({
    mutationFn: () =>
      assessmentsApi.patch(assessmentId, {
        questions: aqEntries.map((e, i) => ({ ...e, order_index: i })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments', assessmentId] })
      setDirty(false)
    },
  })

  const attachedIds = aqEntries.map((e) => e.question_id)
  const attachedQs = attachedIds
    .map((id) => allQuestions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined)

  const available = allQuestions.filter(
    (q) => !attachedIds.includes(q.id) && q.title.toLowerCase().includes(search.toLowerCase()),
  )

  const addQuestion = (q: Question) => {
    setAqEntries((prev) => [...prev, { question_id: q.id, weightage: 0, order_index: prev.length }])
    setDirty(true)
  }

  const removeQuestion = (qId: string) => {
    setAqEntries((prev) => prev.filter((e) => e.question_id !== qId))
    setDirty(true)
  }

  const updateWeightage = (qId: string, v: number) => {
    setAqEntries((prev) => prev.map((e) => (e.question_id === qId ? { ...e, weightage: v } : e)))
    setDirty(true)
  }

  const weightageTotal = aqEntries.reduce((s, e) => s + e.weightage, 0)

  return (
    <motion.section key="questions" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }} className="space-y-4">
      {/* Attached questions */}
      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Attached Questions</span>
          <span className="tabular-nums text-xs text-brand-navy/40">{aqEntries.length} total</span>
        </div>

        {isLoading ? (
          <div className="animate-pulse">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-brand-border last:border-0">
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-48 bg-brand-border rounded" />
                  <div className="h-3 w-24 bg-brand-border/60 rounded" />
                </div>
                <div className="h-5 w-14 bg-brand-border/60 rounded-full" />
                <div className="h-6 w-16 bg-brand-border/60 rounded" />
                <div className="h-6 w-6 bg-brand-border/60 rounded" />
              </div>
            ))}
          </div>
        ) : attachedQs.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface border border-brand-border">
              <FileCode2 size={20} className="text-brand-navy/25" />
            </div>
            <p className="text-sm font-medium text-brand-navy/60">No questions attached</p>
            <p className="text-xs text-brand-navy/40 mt-1">Add questions from the bank below.</p>
          </div>
        ) : (
          <>
            <motion.div variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} initial="hidden" animate="show">
              {attachedQs.map((q) => {
                const entry = aqEntries.find((e) => e.question_id === q.id)!
                return (
                  <motion.div
                    key={q.id}
                    variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0, transition: { duration: 0.12 } } }}
                    className="flex items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-brand-navy truncate">{q.title}</p>
                      <p className="text-xs text-brand-navy/40 mt-0.5">{TYPE_LABEL[q.type] ?? q.type}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset ${DIFFICULTY_BADGE[q.difficulty] ?? 'bg-brand-surface text-brand-navy/50 ring-brand-border'}`}>
                      {q.difficulty}
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={entry.weightage}
                        onChange={(e) => updateWeightage(q.id, Number(e.target.value))}
                        aria-label={`Weightage for ${q.title}`}
                        className="w-16 text-center font-mono text-sm border border-brand-border rounded-lg px-2 py-1 outline-none focus:border-brand-orange transition-colors"
                      />
                      <span className="text-xs text-brand-navy/50">%</span>
                    </div>
                    <button
                      type="button" onClick={() => removeQuestion(q.id)} aria-label={`Remove ${q.title}`}
                      className="rounded-md p-1.5 text-brand-navy/30 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Weightage total */}
            <div className="border-t border-brand-border px-5 py-3 bg-brand-surface/30">
              <div className="mb-1.5 h-1.5 rounded-full bg-brand-border overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, weightageTotal)}%`,
                    backgroundColor: weightageTotal === 100 ? '#16a34a' : weightageTotal > 100 ? '#ef4444' : '#DE5E1F',
                  }}
                />
              </div>
              <p className={`text-xs font-medium ${weightageTotal === 100 ? 'text-green-600' : weightageTotal > 100 ? 'text-red-600' : 'text-amber-600'}`}>
                {weightageTotal === 100 ? '✓ Balanced — 100%' : weightageTotal < 100 ? `${100 - weightageTotal}% remaining` : `${weightageTotal - 100}% over limit`}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Question bank picker */}
      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
        <div className="border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Add from Question Bank</span>
        </div>
        <div className="p-4">
          <div className="relative mb-3">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/35" aria-hidden="true" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-lg border border-brand-border bg-white py-2.5 pl-9 pr-3 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border bg-white">
            {isLoading ? (
              <div className="animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 h-3.5 bg-brand-border rounded" />
                    <div className="h-4 w-14 bg-brand-border/60 rounded-full" />
                  </div>
                ))}
              </div>
            ) : available.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-brand-navy/40">
                {search ? `No questions match "${search}"` : allQuestions.length === aqEntries.length ? 'All questions are already attached.' : 'No questions in the bank yet.'}
              </div>
            ) : (
              available.map((q) => (
                <div key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface transition-colors">
                  <span className="flex-1 text-sm text-brand-navy">{q.title}</span>
                  <span className="text-xs text-brand-navy/40">{TYPE_LABEL[q.type] ?? q.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset ${DIFFICULTY_BADGE[q.difficulty] ?? 'bg-brand-surface text-brand-navy/50 ring-brand-border'}`}>
                    {q.difficulty}
                  </span>
                  <button
                    type="button" onClick={() => addQuestion(q)} aria-label={`Add ${q.title}`}
                    className="rounded-md p-1 text-brand-navy/40 hover:bg-brand-orange-pale hover:text-brand-orange transition-colors"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.15 }}
            className="flex items-center justify-between rounded-xl border border-brand-orange/30 bg-brand-orange-pale px-5 py-3.5"
          >
            <p className="text-sm text-brand-navy/70">You have unsaved changes to the question list.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAqEntries(initialAssessmentQuestions.map((aq, i) => ({ question_id: aq.question.id, weightage: aq.weightage, order_index: i })))
                  setDirty(false)
                }}
                className="rounded-lg border border-brand-border bg-white px-3.5 py-2 text-sm text-brand-navy/60 hover:text-brand-navy transition-colors"
              >
                Discard
              </button>
              <button
                type="button" onClick={() => save.mutate()} disabled={save.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm disabled:opacity-50"
              >
                {save.isPending ? (
                  <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>
                ) : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {save.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          <span className="font-medium">Error: </span>{String(save.error)}
        </div>
      )}
    </motion.section>
  )
}
