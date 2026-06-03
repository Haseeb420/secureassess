'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow, isToday, isPast, addDays } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Key, Plus, Copy, Check, X, Pencil, ShieldOff,
  ClipboardList, ChevronRight, Loader2, AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { ConfirmDialog } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { tokensApi, assessmentsApi, type Token, type Assessment } from '../../../lib/api'

// ── Zod schema ────────────────────────────────────────────────────────────────

const createSchema = z.object({
  candidateName:  z.string().min(2, 'Enter at least 2 characters'),
  candidateEmail: z.string().email('Enter a valid email'),
  assessmentId:   z.string().min(1, 'Select an assessment'),
  mockIds:        z.array(z.string()),
  expiryAt:       z.string().min(1, 'Set an expiry date'),
  usageLimit:     z.number().int().min(1, 'Minimum 1').max(100, 'Maximum 100'),
})

type CreateForm = z.infer<typeof createSchema>

// ── Status helpers ────────────────────────────────────────────────────────────

type TokenStatus = 'active' | 'expired' | 'limit_reached' | 'revoked'

function getStatus(t: Token): TokenStatus {
  if (t.is_revoked) return 'revoked'
  if (isPast(new Date(t.expiry_at))) return 'expired'
  if (t.used_count >= t.usage_limit) return 'limit_reached'
  return 'active'
}

const STATUS_CONFIG: Record<TokenStatus, { label: string; dot: string; badge: string }> = {
  active:        { label: 'Active',        dot: 'bg-emerald-400 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  expired:       { label: 'Expired',       dot: 'bg-red-400',                   badge: 'bg-red-50 text-red-700 ring-red-200' },
  limit_reached: { label: 'Limit Reached', dot: 'bg-amber-400',                 badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  revoked:       { label: 'Revoked',       dot: 'bg-brand-border',              badge: 'bg-brand-surface text-brand-navy/50 ring-brand-border' },
}

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = { show: { transition: { staggerChildren: 0.05 } } }
const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.17 } },
}

// ── Skeleton row ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 border-b border-brand-border px-6 py-4 last:border-0 animate-pulse">
      <div className="w-36 h-5 bg-brand-border rounded font-mono" />
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="h-4 bg-brand-border rounded w-40" />
        <div className="h-3 bg-brand-border/60 rounded w-32" />
      </div>
      <div className="w-40 space-y-1">
        <div className="h-4 bg-brand-border rounded w-36" />
        <div className="h-3 bg-brand-border/60 rounded w-20" />
      </div>
      <div className="w-28 space-y-1.5">
        <div className="h-3 bg-brand-border rounded w-16" />
        <div className="h-2 bg-brand-border/60 rounded-full w-24" />
      </div>
      <div className="w-28 space-y-1">
        <div className="h-4 bg-brand-border rounded w-24" />
        <div className="h-3 bg-brand-border/60 rounded w-16" />
      </div>
      <div className="w-20 h-5 bg-brand-border/60 rounded-full" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => <div key={i} className="h-7 w-7 bg-brand-border/60 rounded" />)}
      </div>
    </div>
  )
}

// ── Stats card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, loading }: { label: string; value: number; loading: boolean }) {
  return (
    <div className="bg-white border border-brand-border rounded-xl p-4">
      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-7 w-12 bg-brand-border rounded" />
          <div className="h-3 w-24 bg-brand-border/60 rounded" />
        </div>
      ) : (
        <>
          <p className="font-bold text-2xl text-brand-navy tabular-nums">{value}</p>
          <p className="mt-0.5 text-xs text-brand-navy/60">{label}</p>
        </>
      )}
    </div>
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
      type="button"
      onClick={copy}
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      className="rounded p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

// ── Icon button ───────────────────────────────────────────────────────────────

function IconBtn({
  label, onClick, children, disabled, danger,
}: {
  label: string; onClick: () => void; children: React.ReactNode
  disabled?: boolean; danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={[
        'rounded p-1.5 transition-colors disabled:opacity-30 disabled:pointer-events-none',
        danger
          ? 'text-brand-navy/40 hover:bg-red-50 hover:text-red-500'
          : 'text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ── Token row ─────────────────────────────────────────────────────────────────

function TokenRow({
  token, onRevoke,
}: {
  token: Token
  onRevoke: (t: Token) => void
}) {
  const st = getStatus(token)
  const cfg = STATUS_CONFIG[st]
  const expiry = new Date(token.expiry_at)
  const usagePct = Math.min(100, Math.round((token.used_count / token.usage_limit) * 100))

  return (
    <motion.div
      variants={rowVariants}
      className="group flex items-center gap-4 border-b border-brand-border px-6 py-4 last:border-0 hover:bg-brand-surface/50 transition-colors"
    >
      {/* Token value */}
      <div className="w-36 flex items-center gap-1 min-w-0">
        <code className="font-mono text-xs font-semibold text-brand-navy tracking-wider truncate">
          {token.token_value}
        </code>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <CopyBtn text={token.token_value} label="token" />
        </span>
      </div>

      {/* Candidate */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-navy truncate">{token.candidate_name}</p>
        <p className="text-xs text-brand-navy/50 truncate">{token.candidate_email}</p>
      </div>

      {/* Assessment */}
      <div className="w-40 min-w-0">
        <p className="text-sm text-brand-navy truncate">{token.assessment_title || '—'}</p>
        <p className="text-xs text-brand-navy/40">Assessment</p>
      </div>

      {/* Usage */}
      <div className="w-28">
        <p className="text-xs font-medium text-brand-navy tabular-nums mb-1.5">
          {token.used_count}/{token.usage_limit} uses
        </p>
        <div className="h-1.5 rounded-full bg-brand-border overflow-hidden">
          <div
            className={[
              'h-full rounded-full transition-all',
              usagePct >= 100 ? 'bg-amber-400' : 'bg-brand-orange',
            ].join(' ')}
            style={{ width: `${usagePct}%` }}
          />
        </div>
      </div>

      {/* Expires */}
      <div className="w-28">
        <p className={['text-sm font-medium', isPast(expiry) ? 'text-red-500' : 'text-brand-navy'].join(' ')}>
          {format(expiry, 'MMM d, yyyy')}
        </p>
        <p className={['text-xs', isPast(expiry) ? 'text-red-400' : 'text-brand-navy/40'].join(' ')}>
          {isPast(expiry)
            ? `${formatDistanceToNow(expiry)} ago`
            : isToday(expiry)
            ? 'Today'
            : `${formatDistanceToNow(expiry)} left`}
        </p>
      </div>

      {/* Status badge */}
      <div className="w-28">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${cfg.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
      </div>

      {/* Actions */}
      <div
        className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <CopyBtn text={token.token_value} label="token value" />
        <IconBtn
          label="Revoke token"
          onClick={() => onRevoke(token)}
          disabled={token.is_revoked}
          danger
        >
          <ShieldOff size={14} />
        </IconBtn>
      </div>
    </motion.div>
  )
}

// ── Create Drawer ─────────────────────────────────────────────────────────────

function CreateDrawer({
  open,
  onClose,
  assessments,
}: {
  open: boolean
  onClose: () => void
  assessments: Assessment[]
}) {
  const qc = useQueryClient()
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [usageMode, setUsageMode] = useState<'single' | 'multiple'>('single')

  const defaultExpiry = addDays(new Date(), 7).toISOString().slice(0, 16)

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      candidateName:  '',
      candidateEmail: '',
      assessmentId:   '',
      mockIds:        [],
      expiryAt:       defaultExpiry,
      usageLimit:     1,
    },
  })

  const selectedAssessmentId = watch('assessmentId')
  const mockOptions = assessments.filter((a) => a.id !== selectedAssessmentId)

  const create = useMutation({
    mutationFn: (data: CreateForm) =>
      tokensApi.create({
        candidate_name:  data.candidateName,
        candidate_email: data.candidateEmail,
        assessment_id:   data.assessmentId,
        mock_ids:        data.mockIds,
        expiry_at:       new Date(data.expiryAt).toISOString(),
        usage_limit:     data.usageLimit,
        notes:           undefined,
      }),
    onSuccess: (token) => {
      setCreatedToken(token.token_value)
      qc.invalidateQueries({ queryKey: ['tokens'] })
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
    setUsageMode('single')
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-brand-navy/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col w-full max-w-[480px] bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Create Invitation Token"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-border px-6 py-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10">
                  <Key size={16} className="text-brand-orange" aria-hidden="true" />
                </div>
                <h2 className="text-base font-semibold text-brand-navy">Create Invitation Token</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close drawer"
                className="rounded-lg p-1.5 text-brand-navy/40 hover:bg-brand-surface hover:text-brand-navy transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {createdToken ? (
                <SuccessState token={createdToken} copied={copied} onCopy={copyToken} />
              ) : (
                <form id="create-token-form" onSubmit={handleSubmit((d) => create.mutateAsync(d))} noValidate className="space-y-5">
                  {/* Candidate Name */}
                  <div>
                    <label htmlFor="candidateName" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Candidate Name <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      {...register('candidateName')}
                      id="candidateName"
                      type="text"
                      placeholder="Jane Smith"
                      aria-required="true"
                      aria-describedby={errors.candidateName ? 'candidateName-error' : undefined}
                      className={[
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none transition-shadow',
                        errors.candidateName
                          ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15',
                      ].join(' ')}
                    />
                    {errors.candidateName && (
                      <motion.p
                        id="candidateName-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1.5 text-xs text-red-500"
                      >
                        {errors.candidateName.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Candidate Email */}
                  <div>
                    <label htmlFor="candidateEmail" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Candidate Email <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      {...register('candidateEmail')}
                      id="candidateEmail"
                      type="email"
                      placeholder="jane@example.com"
                      aria-required="true"
                      aria-describedby={errors.candidateEmail ? 'candidateEmail-error' : undefined}
                      className={[
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none transition-shadow',
                        errors.candidateEmail
                          ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15',
                      ].join(' ')}
                    />
                    {errors.candidateEmail && (
                      <motion.p
                        id="candidateEmail-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1.5 text-xs text-red-500"
                      >
                        {errors.candidateEmail.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Assessment */}
                  <div>
                    <label htmlFor="assessmentId" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Assessment <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <select
                      {...register('assessmentId')}
                      id="assessmentId"
                      aria-required="true"
                      aria-describedby={errors.assessmentId ? 'assessmentId-error' : undefined}
                      className={[
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition-shadow',
                        errors.assessmentId
                          ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15',
                      ].join(' ')}
                    >
                      <option value="">Select an assessment…</option>
                      {assessments
                        .filter((a) => a.status === 'active')
                        .map((a) => (
                          <option key={a.id} value={a.id}>{a.title}</option>
                        ))}
                    </select>
                    {errors.assessmentId && (
                      <motion.p
                        id="assessmentId-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1.5 text-xs text-red-500"
                      >
                        {errors.assessmentId.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Mock Assessments */}
                  {mockOptions.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-sm font-medium text-brand-navy">
                        Mock Assessments
                        <span className="ml-1.5 text-xs font-normal text-brand-navy/40">(optional)</span>
                      </p>
                      <div className="rounded-lg border border-brand-border bg-brand-surface/50 px-3 py-2.5 space-y-2 max-h-36 overflow-y-auto">
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
                                      if (e.target.checked) {
                                        field.onChange([...field.value, a.id])
                                      } else {
                                        field.onChange(field.value.filter((id) => id !== a.id))
                                      }
                                    }}
                                    className="rounded border-brand-border text-brand-orange accent-brand-orange"
                                  />
                                  <span className="text-sm text-brand-navy">{a.title}</span>
                                </label>
                              ))}
                            </>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  {/* Token Expiry */}
                  <div>
                    <label htmlFor="expiryAt" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Token Expiry <span className="text-red-500" aria-hidden="true">*</span>
                    </label>
                    <input
                      {...register('expiryAt')}
                      id="expiryAt"
                      type="datetime-local"
                      aria-required="true"
                      aria-describedby={errors.expiryAt ? 'expiryAt-error' : undefined}
                      className={[
                        'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy outline-none transition-shadow',
                        errors.expiryAt
                          ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                          : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15',
                      ].join(' ')}
                    />
                    {errors.expiryAt && (
                      <motion.p
                        id="expiryAt-error"
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1.5 text-xs text-red-500"
                      >
                        {errors.expiryAt.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Usage Limit */}
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-brand-navy">Usage Limit</p>
                    <div className="flex gap-2 mb-2.5">
                      {(['single', 'multiple'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setUsageMode(mode)
                            if (mode === 'single') setValue('usageLimit', 1)
                          }}
                          className={[
                            'flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                            usageMode === mode
                              ? 'border-brand-orange bg-brand-orange/5 text-brand-orange'
                              : 'border-brand-border text-brand-navy/60 hover:border-brand-navy/30',
                          ].join(' ')}
                        >
                          {mode === 'single' ? 'Single use' : 'Multiple uses'}
                        </button>
                      ))}
                    </div>
                    {usageMode === 'multiple' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.15 }}
                      >
                        <input
                          {...register('usageLimit', { valueAsNumber: true })}
                          id="usageLimit"
                          type="number"
                          min={1}
                          max={100}
                          placeholder="e.g. 5"
                          aria-describedby={errors.usageLimit ? 'usageLimit-error' : undefined}
                          className={[
                            'w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none transition-shadow',
                            errors.usageLimit
                              ? 'border-red-400 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                              : 'border-brand-border focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15',
                          ].join(' ')}
                        />
                        {errors.usageLimit && (
                          <motion.p
                            id="usageLimit-error"
                            role="alert"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-1.5 text-xs text-red-500"
                          >
                            {errors.usageLimit.message}
                          </motion.p>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Submit error */}
                  {create.isError && (
                    <motion.div
                      role="alert"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                    >
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
                  type="button"
                  onClick={handleClose}
                  className="w-full rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-navy-light transition-colors"
                >
                  Done
                </button>
              ) : (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 rounded-lg border border-brand-border px-4 py-2.5 text-sm font-medium text-brand-navy hover:border-brand-navy transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="create-token-form"
                    disabled={isSubmitting || create.isPending}
                    className="flex-1 rounded-lg bg-brand-orange px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {(isSubmitting || create.isPending) && (
                      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                    )}
                    Create Token
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

// ── Success state inside drawer ───────────────────────────────────────────────

function SuccessState({
  token, copied, onCopy,
}: {
  token: string; copied: boolean; onCopy: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <div className="flex flex-col items-center py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 mb-3">
          <CheckCircle2 size={28} className="text-emerald-500" aria-hidden="true" />
        </div>
        <h3 className="text-base font-semibold text-brand-navy">Token Created</h3>
        <p className="mt-1 text-sm text-brand-navy/60">Share this token with the candidate</p>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-4">
        <p className="mb-2 text-xs font-medium text-brand-navy/50 uppercase tracking-wide">Invitation Token</p>
        <code className="block text-center font-mono text-2xl font-bold text-brand-navy tracking-[0.2em] py-2">
          {token}
        </code>
      </div>

      <button
        type="button"
        onClick={onCopy}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-orange px-4 py-3 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
      >
        {copied ? (
          <><Check size={15} aria-hidden="true" /> Copied!</>
        ) : (
          <><Copy size={15} aria-hidden="true" /> Copy Token</>
        )}
      </button>

      <p className="text-center text-xs text-brand-navy/40">
        The candidate enters this token in the desktop app to access their assessment.
      </p>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TokensPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<Token | null>(null)

  const { data: tokens = [], isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokensApi.list(),
  })

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: assessmentsApi.list,
  })

  const revoke = useMutation({
    mutationFn: (id: string) => tokensApi.revoke(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tokens'] })
      toast.success('Token revoked')
      setRevokeTarget(null)
    },
    onError: () => toast.error('Failed to revoke token'),
  })

  const now = new Date()

  const stats = useMemo(() => ({
    total:    tokens.length,
    active:   tokens.filter((t) => getStatus(t) === 'active').length,
    usedUp:   tokens.filter((t) => getStatus(t) === 'limit_reached').length,
    expiring: tokens.filter((t) => {
      if (getStatus(t) !== 'active') return false
      const exp = new Date(t.expiry_at)
      return isToday(exp)
    }).length,
  }), [tokens])

  return (
    <div className="min-h-full">
      <PageHeader
        title="Token Management"
        subtitle="Create and manage invitation tokens for candidates"
        actions={
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm"
          >
            <Plus size={15} aria-hidden="true" />
            Create Token
          </button>
        }
      />

      <div className="p-8 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total tokens"   value={stats.total}    loading={isLoading} />
          <StatCard label="Active tokens"  value={stats.active}   loading={isLoading} />
          <StatCard label="Used up"        value={stats.usedUp}   loading={isLoading} />
          <StatCard label="Expiring today" value={stats.expiring} loading={isLoading} />
        </div>

        {/* Tokens table */}
        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          {/* Column headers */}
          {!isLoading && tokens.length > 0 && (
            <div className="flex items-center gap-4 border-b border-brand-border bg-brand-surface/70 px-6 py-2.5">
              <span className="w-36 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Token</span>
              <span className="flex-1 min-w-0 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Candidate</span>
              <span className="w-40 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Assessment</span>
              <span className="w-28 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Usage</span>
              <span className="w-28 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Expires</span>
              <span className="w-28 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Status</span>
              <span className="w-16" />
            </div>
          )}

          {isLoading ? (
            <div>{Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}</div>
          ) : tokens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-surface border border-brand-border">
                <Key size={28} className="text-brand-navy/25" aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold text-brand-navy">No tokens yet</h3>
              <p className="mt-1.5 text-sm text-brand-navy/50 max-w-xs">
                Create a token to invite a candidate to an assessment.
              </p>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
              >
                <Plus size={15} aria-hidden="true" />
                Create Token
              </button>
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show">
              {tokens.map((token) => (
                <TokenRow
                  key={token.id}
                  token={token}
                  onRevoke={setRevokeTarget}
                />
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create drawer */}
      <CreateDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        assessments={assessments}
      />

      {/* Revoke confirm */}
      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke this token?"
        description={`The token for ${revokeTarget?.candidate_name ?? 'this candidate'} will be permanently revoked. They will no longer be able to use it to access the assessment.`}
        confirmLabel="Revoke"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => revokeTarget && revoke.mutate(revokeTarget.id)}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
