'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { format, fromUnixTime } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Shield, Code, Users, ArrowLeft, UserPlus,
  Check, Copy, BarChart2, AlertCircle, FileCode2, Search, X, Plus,
} from 'lucide-react'
import { assessmentsApi, questionsApi, type CandidateRow, type Invite, type Question } from '../../../../lib/api'
import { InviteDialog } from '../../../../components/InviteDialog'

const CANDIDATE_STATUS = {
  not_started: { label: 'Not started', dot: 'bg-brand-border',  text: 'text-brand-navy/50', bg: 'bg-brand-surface',  pulse: false },
  in_progress: { label: 'In progress',  dot: 'bg-blue-400',     text: 'text-blue-700',      bg: 'bg-blue-50',        pulse: true  },
  completed:   { label: 'Completed',    dot: 'bg-emerald-400',  text: 'text-emerald-700',   bg: 'bg-emerald-50',     pulse: false },
} as const

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

export default function AssessmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [activeTab, setActiveTab] = useState<'candidates' | 'questions' | 'invites'>('candidates')

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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {/* Hero header */}
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Link
          href="/dashboard/assessments"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-brand-navy/40 hover:text-brand-navy transition-colors"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Assessments
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-brand-navy">{data.title}</h1>
            <div className="mt-1.5 flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                data.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-brand-surface text-brand-navy/50 ring-brand-border'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${data.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-brand-border'}`} />
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
              {data.allowed_languages.length > 0 && (
                <>
                  <span className="text-brand-border">·</span>
                  <span className="text-xs text-brand-navy/40">
                    {data.allowed_languages.join(' · ')}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInviteDialog(true)}
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
            { key: 'questions',  label: 'Questions',  count: data.question_ids?.length ?? 0 },
            { key: 'invites',    label: 'Invites',    count: invites.length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={[
                'relative px-4 py-2.5 text-sm font-medium transition-colors',
                activeTab === key ? 'text-brand-navy' : 'text-brand-navy/50 hover:text-brand-navy/70',
              ].join(' ')}
            >
              {label}
              <span className="ml-1.5 rounded-full bg-brand-surface px-1.5 py-0.5 text-xs text-brand-navy/50 tabular-nums">
                {count}
              </span>
              {activeTab === key && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-orange rounded-full"
                />
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === 'candidates' && (
            <motion.section
              key="candidates"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
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
                      onClick={() => setShowInviteDialog(true)}
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
                    <motion.div
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                      initial="hidden"
                      animate="show"
                    >
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
              initialQuestionIds={data.question_ids ?? []}
            />
          )}

          {activeTab === 'invites' && (
            <motion.section
              key="invites"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
                {invitesLoading ? (
                  <div className="animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-brand-border last:border-0">
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-40 bg-brand-border rounded" />
                          <div className="h-3 w-24 bg-brand-border/60 rounded" />
                        </div>
                        <div className="h-6 w-32 bg-brand-border/60 rounded" />
                        <div className="h-3 w-28 bg-brand-border/60 rounded" />
                        <div className="h-5 w-16 bg-brand-border/60 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : invites.length === 0 ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <p className="text-sm text-brand-navy/50 font-medium">No invites sent yet</p>
                    <p className="text-xs text-brand-navy/40 mt-1">Invite candidates to generate shareable access links.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4 border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
                      <span className="flex-1 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Candidate</span>
                      <span className="w-40 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Token</span>
                      <span className="w-36 text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Expires</span>
                      <span className="w-20 text-right text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Status</span>
                    </div>
                    <motion.div
                      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
                      initial="hidden"
                      animate="show"
                    >
                      {invites.map((invite) => (
                        <InviteRowItem key={invite.id} invite={invite} />
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      {showInviteDialog && (
        <InviteDialog
          assessmentId={id}
          assessmentTitle={data.title}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
    </motion.div>
  )
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700 ring-emerald-200',
  medium: 'bg-amber-50 text-amber-700 ring-amber-200',
  hard:   'bg-red-50 text-red-600 ring-red-200',
}

const TYPE_LABEL: Record<string, string> = {
  coding:        'Coding',
  debugging:     'Debugging',
  sql:           'SQL',
  mcq:           'MCQ',
  system_design: 'System Design',
}

function QuestionsTab({
  assessmentId,
  initialQuestionIds,
}: {
  assessmentId: string
  initialQuestionIds: string[]
}) {
  const qc = useQueryClient()
  const [questionIds, setQuestionIds] = useState<string[]>(initialQuestionIds)
  const [search, setSearch] = useState('')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    setQuestionIds(initialQuestionIds)
    setDirty(false)
  }, [initialQuestionIds.join(',')])

  const { data: allQuestions = [], isLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  })

  const save = useMutation({
    mutationFn: () => assessmentsApi.patch(assessmentId, { question_ids: questionIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assessments', assessmentId] })
      setDirty(false)
    },
  })

  const toggle = (id: string) => {
    setQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    )
    setDirty(true)
  }

  const attached = allQuestions.filter((q) => questionIds.includes(q.id))
  const available = allQuestions.filter(
    (q) => !questionIds.includes(q.id) && q.title.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <motion.section
      key="questions"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.15 }}
      className="space-y-4"
    >
      {/* Attached questions */}
      <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-border bg-brand-surface/70 px-5 py-2.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
            Attached Questions
          </span>
          <span className="tabular-nums text-xs text-brand-navy/40">{questionIds.length} total</span>
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
                <div className="h-5 w-16 bg-brand-border/60 rounded-full" />
                <div className="h-6 w-6 bg-brand-border/60 rounded" />
              </div>
            ))}
          </div>
        ) : attached.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-brand-surface border border-brand-border">
              <FileCode2 size={20} className="text-brand-navy/25" />
            </div>
            <p className="text-sm font-medium text-brand-navy/60">No questions attached</p>
            <p className="text-xs text-brand-navy/40 mt-1">Add questions from the bank below.</p>
          </div>
        ) : (
          <motion.div
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
            initial="hidden"
            animate="show"
          >
            {attached.map((q) => (
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
                {q.tags.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1">
                    {q.tags.slice(0, 2).map((tag) => (
                      <span key={tag} className="rounded-full bg-brand-surface border border-brand-border px-2 py-0.5 text-[10px] text-brand-navy/50">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggle(q.id)}
                  aria-label={`Remove ${q.title}`}
                  className="rounded-md p-1.5 text-brand-navy/30 hover:bg-red-50 hover:text-red-500 transition-colors"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              </motion.div>
            ))}
          </motion.div>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions…"
              className="w-full rounded-lg border border-brand-border bg-white py-2.5 pl-9 pr-3 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
            />
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border bg-white">
            {isLoading ? (
              <div className="animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="h-4 w-4 bg-brand-border rounded" />
                    <div className="flex-1 h-3.5 bg-brand-border rounded" />
                    <div className="h-4 w-14 bg-brand-border/60 rounded-full" />
                  </div>
                ))}
              </div>
            ) : available.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-brand-navy/40">
                {search ? `No questions match "${search}"` : allQuestions.length === questionIds.length ? 'All questions are already attached.' : 'No questions in the bank yet.'}
              </div>
            ) : (
              available.map((q) => (
                <label
                  key={q.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-brand-surface transition-colors"
                >
                  <div className="h-4 w-4 shrink-0 rounded border-2 border-brand-border bg-white flex items-center justify-center" aria-hidden="true" />
                  <span className="flex-1 text-sm text-brand-navy">{q.title}</span>
                  <span className="text-xs text-brand-navy/40">{TYPE_LABEL[q.type] ?? q.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1 ring-inset ${DIFFICULTY_BADGE[q.difficulty] ?? 'bg-brand-surface text-brand-navy/50 ring-brand-border'}`}>
                    {q.difficulty}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggle(q.id)}
                    aria-label={`Add ${q.title}`}
                    className="rounded-md p-1 text-brand-navy/40 hover:bg-brand-orange-pale hover:text-brand-orange transition-colors"
                  >
                    <Plus size={14} aria-hidden="true" />
                  </button>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Save bar */}
      <AnimatePresence>
        {dirty && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-between rounded-xl border border-brand-orange/30 bg-brand-orange-pale px-5 py-3.5"
          >
            <p className="text-sm text-brand-navy/70">You have unsaved changes to the question list.</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { setQuestionIds(initialQuestionIds); setDirty(false) }}
                className="rounded-lg border border-brand-border bg-white px-3.5 py-2 text-sm text-brand-navy/60 hover:text-brand-navy transition-colors"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => save.mutate()}
                disabled={save.isPending}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm disabled:opacity-50"
              >
                {save.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving…
                  </>
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

function CandidateRowItem({ candidate }: { candidate: CandidateRow }) {
  const cfg = CANDIDATE_STATUS[candidate.status]
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
          <span className={`text-sm font-semibold tabular-nums ${
            candidate.score >= 70 ? 'text-emerald-600' : candidate.score >= 40 ? 'text-amber-600' : 'text-red-500'
          }`}>
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

function InviteRowItem({ invite }: { invite: Invite }) {
  const [copied, setCopied] = useState(false)
  const isExpired = invite.expires_at < Math.floor(Date.now() / 1000)
  const isUsed = !!invite.used_at

  const copy = async () => {
    await navigator.clipboard.writeText(invite.token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      variants={{ hidden: { opacity: 0, x: -4 }, show: { opacity: 1, x: 0, transition: { duration: 0.15 } } }}
      className="flex items-center gap-4 border-b border-brand-border px-5 py-3.5 last:border-0 hover:bg-brand-surface/40 transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-navy truncate">{invite.candidate_email}</p>
        {invite.candidate_name && (
          <p className="text-xs text-brand-navy/50 truncate">{invite.candidate_name}</p>
        )}
      </div>
      <div className="w-40 flex items-center gap-1.5">
        <code className="rounded-md bg-brand-surface border border-brand-border px-2 py-0.5 font-mono text-xs text-brand-navy/70">
          {invite.token.slice(0, 12)}…
        </code>
        <button
          onClick={copy}
          aria-label="Copy token"
          className="rounded p-1 text-brand-navy/40 hover:text-brand-navy hover:bg-brand-surface transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
        </button>
      </div>
      <div className="w-36 text-xs text-brand-navy/50">
        {format(fromUnixTime(invite.expires_at), 'MMM d, yyyy HH:mm')}
      </div>
      <div className="w-20 flex justify-end">
        {isUsed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            <Check size={9} aria-hidden="true" />
            Used
          </span>
        ) : isExpired ? (
          <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-200">
            Expired
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-brand-orange-pale px-2 py-0.5 text-xs font-medium text-brand-orange ring-1 ring-inset ring-orange-200">
            Pending
          </span>
        )}
      </div>
    </motion.div>
  )
}
