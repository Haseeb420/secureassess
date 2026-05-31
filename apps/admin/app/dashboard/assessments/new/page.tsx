'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Plus, Minus, Check, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { assessmentsApi, questionsApi, type CreateAssessmentBody } from '../../../../lib/api'

const LANGUAGES = ['python', 'javascript', 'typescript', 'cpp', 'java', 'go'] as const

const LANGUAGE_CONFIG: Record<string, { label: string; active: string; inactive: string }> = {
  python:     { label: 'Python',     active: 'bg-blue-600 text-white shadow-sm',   inactive: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200' },
  javascript: { label: 'JavaScript', active: 'bg-yellow-500 text-white shadow-sm', inactive: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200' },
  typescript: { label: 'TypeScript', active: 'bg-sky-600 text-white shadow-sm',    inactive: 'bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200' },
  cpp:        { label: 'C++',        active: 'bg-purple-600 text-white shadow-sm', inactive: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200' },
  java:       { label: 'Java',       active: 'bg-red-600 text-white shadow-sm',    inactive: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
  go:         { label: 'Go',         active: 'bg-cyan-600 text-white shadow-sm',   inactive: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200' },
}

const DIFFICULTY_BADGE: Record<string, string> = {
  easy:   'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  hard:   'bg-red-50 text-red-600',
}

const DURATION_PRESETS = [30, 60, 90, 120]

const formVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [languages, setLanguages] = useState<string[]>(['python'])
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'strict'>('standard')
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  })

  const filtered = questions.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()),
  )

  const create = useMutation({
    mutationFn: (body: CreateAssessmentBody) => assessmentsApi.create(body),
    onSuccess: () => router.push('/dashboard/assessments'),
  })

  const toggleLang = (lang: string) =>
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    )

  const toggleQuestion = (id: string) =>
    setQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id],
    )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate({
      title,
      duration_minutes: duration,
      allowed_languages: languages,
      security_level: securityLevel,
      question_ids: questionIds,
    })
  }

  return (
    <div className="min-h-full bg-brand-surface">
      {/* Header */}
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Link
          href="/dashboard/assessments"
          className="mb-2 inline-flex items-center gap-1.5 text-xs text-brand-navy/40 hover:text-brand-navy transition-colors"
        >
          <ArrowLeft size={12} aria-hidden="true" />
          Assessments
        </Link>
        <h1 className="text-xl font-semibold text-brand-navy">New Assessment</h1>
        <p className="mt-0.5 text-sm text-brand-navy/50">Configure and launch a new coding assessment for candidates</p>
      </div>

      <div className="p-8 max-w-3xl">
        <form onSubmit={handleSubmit}>
          <motion.div variants={formVariants} initial="hidden" animate="show" className="space-y-5">

            {/* Section 1: Basic info */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Basic Information</h2>
              </div>
              <div className="p-6 space-y-5">
                {/* Title */}
                <div>
                  <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-brand-navy">
                    Assessment Title <span className="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="title"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Backend Engineering Round 1"
                    aria-required="true"
                    className="w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-brand-navy">
                    Duration <span className="text-red-400" aria-hidden="true">*</span>
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center rounded-lg border border-brand-border bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setDuration((d) => Math.max(5, d - 15))}
                        aria-label="Decrease duration"
                        className="px-3 py-2.5 text-brand-navy/50 hover:bg-brand-surface hover:text-brand-navy transition-colors border-r border-brand-border"
                      >
                        <Minus size={14} aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min={5}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        aria-label="Duration in minutes"
                        className="w-16 text-center text-sm font-semibold text-brand-navy outline-none bg-transparent py-2.5"
                      />
                      <button
                        type="button"
                        onClick={() => setDuration((d) => d + 15)}
                        aria-label="Increase duration"
                        className="px-3 py-2.5 text-brand-navy/50 hover:bg-brand-surface hover:text-brand-navy transition-colors border-l border-brand-border"
                      >
                        <Plus size={14} aria-hidden="true" />
                      </button>
                    </div>
                    <span className="text-sm text-brand-navy/50">minutes</span>
                    <div className="flex gap-1.5">
                      {DURATION_PRESETS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className={[
                            'rounded-full px-3 py-1 text-xs font-medium transition-all',
                            duration === d
                              ? 'bg-brand-navy text-white shadow-sm'
                              : 'bg-brand-surface border border-brand-border text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy',
                          ].join(' ')}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Section 2: Languages */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Allowed Languages</h2>
                <span className="text-xs text-brand-navy/40 tabular-nums">
                  {languages.length} selected
                </span>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => {
                    const cfg = LANGUAGE_CONFIG[lang]
                    const active = languages.includes(lang)
                    return (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => toggleLang(lang)}
                        className={['rounded-lg px-4 py-2 text-sm font-medium transition-all', active ? cfg.active : cfg.inactive].join(' ')}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
                {languages.length === 0 && (
                  <p className="mt-3 text-xs text-red-500" role="alert">Select at least one language.</p>
                )}
              </div>
            </motion.div>

            {/* Section 3: Security level */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Security Level</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'standard', label: 'Standard', desc: 'Focus and tab-switch tracking. Suitable for most assessments.', icon: '🔒' },
                    { value: 'strict',   label: 'Strict',   desc: 'Full lockdown. Screen sharing blocked, process monitoring active.', icon: '🛡️' },
                  ].map(({ value, label, desc, icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSecurityLevel(value as 'standard' | 'strict')}
                      className={[
                        'rounded-xl border-2 p-4 text-left transition-all',
                        securityLevel === value
                          ? 'border-brand-orange bg-brand-orange-pale'
                          : 'border-brand-border bg-white hover:border-brand-navy/25',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl" aria-hidden="true">{icon}</span>
                        {securityLevel === value && (
                          <CheckCircle2 size={16} className="text-brand-orange" aria-hidden="true" />
                        )}
                      </div>
                      <p className="font-semibold text-sm text-brand-navy">{label}</p>
                      <p className="text-xs text-brand-navy/50 mt-0.5 leading-relaxed">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Section 4: Questions */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Questions</h2>
                {questionIds.length > 0 && (
                  <span className="rounded-full bg-brand-orange px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                    {questionIds.length} selected
                  </span>
                )}
              </div>
              <div className="p-6">
                <div className="relative mb-3">
                  <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/35" aria-hidden="true" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search question bank…"
                    className="w-full rounded-lg border border-brand-border bg-white py-2.5 pl-9 pr-3 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border bg-white">
                  {questionsLoading ? (
                    <div className="animate-pulse">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <div className="h-4 w-4 bg-brand-border rounded" />
                          <div className="flex-1 h-3.5 bg-brand-border rounded" />
                          <div className="h-4 w-14 bg-brand-border/60 rounded-full" />
                        </div>
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-brand-navy/40">
                      {search ? `No questions match "${search}"` : 'No questions in the question bank yet.'}
                    </div>
                  ) : (
                    filtered.map((q) => {
                      const selected = questionIds.includes(q.id)
                      return (
                        <label
                          key={q.id}
                          className={[
                            'flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors',
                            selected ? 'bg-brand-orange-pale' : 'hover:bg-brand-surface',
                          ].join(' ')}
                        >
                          <div className={[
                            'h-4 w-4 shrink-0 rounded border-2 flex items-center justify-center transition-colors',
                            selected ? 'border-brand-orange bg-brand-orange' : 'border-brand-border bg-white',
                          ].join(' ')} aria-hidden="true">
                            {selected && <Check size={10} className="text-white" />}
                          </div>
                          <span className="flex-1 text-sm text-brand-navy">{q.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${DIFFICULTY_BADGE[q.difficulty] ?? 'bg-brand-surface text-brand-navy/50'}`}>
                            {q.difficulty}
                          </span>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleQuestion(q.id)}
                            aria-label={`Select question: ${q.title}`}
                            className="sr-only"
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </motion.div>

            {/* Error alert */}
            {create.isError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
                role="alert"
              >
                <span className="font-medium">Error: </span>
                {String(create.error)}
              </motion.div>
            )}

            {/* Actions */}
            <motion.div variants={sectionVariants} className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={create.isPending || languages.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors shadow-sm disabled:opacity-50 disabled:pointer-events-none"
              >
                {create.isPending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating…
                  </>
                ) : (
                  <>
                    <Plus size={15} aria-hidden="true" />
                    Create Assessment
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-brand-border px-4 py-2.5 text-sm text-brand-navy/60 hover:border-brand-navy/40 hover:text-brand-navy transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        </form>
      </div>
    </div>
  )
}
