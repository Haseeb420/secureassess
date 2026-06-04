'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { ArrowLeft, Search, Plus, Minus, CheckCircle2, Infinity, CalendarX2, Clock, GripVertical, Trash2, FileCode2 } from 'lucide-react'
import Link from 'next/link'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { assessmentsApi, questionsApi, type Question, type CreateAssessmentBody } from '../../../../lib/api'

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

const TYPE_BADGE: Record<string, string> = {
  coding: 'bg-blue-50 text-blue-700',
  mcq:    'bg-violet-50 text-violet-700',
  text:   'bg-amber-50 text-amber-700',
}

const DURATION_PRESETS = [30, 60, 90, 120]

const TIMEZONES = [
  { value: 'Asia/Karachi',        label: 'PKT — UTC+5' },
  { value: 'UTC',                 label: 'UTC' },
  { value: 'America/New_York',    label: 'EST/EDT — UTC-5/-4' },
  { value: 'America/Chicago',     label: 'CST/CDT — UTC-6/-5' },
  { value: 'America/Los_Angeles', label: 'PST/PDT — UTC-8/-7' },
  { value: 'Europe/London',       label: 'GMT/BST — UTC+0/+1' },
  { value: 'Europe/Paris',        label: 'CET/CEST — UTC+1/+2' },
  { value: 'Asia/Dubai',          label: 'GST — UTC+4' },
  { value: 'Asia/Kolkata',        label: 'IST — UTC+5:30' },
  { value: 'Asia/Singapore',      label: 'SGT — UTC+8' },
]

const ASSESSMENT_TYPES = [
  {
    value: 'open' as const,
    title: 'Open Access',
    desc: 'No time restriction. Candidate can start any time the token is valid.',
    Icon: Infinity,
  },
  {
    value: 'deadline' as const,
    title: 'Deadline Based',
    desc: 'Accessible immediately. Candidate must complete before the deadline.',
    Icon: CalendarX2,
  },
  {
    value: 'window' as const,
    title: 'Time Window',
    desc: 'Only accessible during a defined time window.',
    Icon: Clock,
  },
]

const formVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 10 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.2 } },
}

function TimezoneSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor="timezone" className="mb-1.5 block text-sm font-medium text-brand-navy">
        Timezone
      </label>
      <select
        id="timezone"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
      >
        {TIMEZONES.map((tz) => (
          <option key={tz.value} value={tz.value}>{tz.label}</option>
        ))}
      </select>
    </div>
  )
}

function SortableQuestionCard({
  question,
  weightage,
  onWeightageChange,
  onRemove,
}: {
  question: Question
  weightage: number
  onWeightageChange: (v: number) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-brand-border rounded-xl p-3 mb-2 flex items-center gap-2"
    >
      <button
        type="button"
        aria-label="Drag to reorder"
        className="cursor-grab text-brand-navy/30 hover:text-brand-navy/50 touch-none shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} aria-hidden="true" />
      </button>
      <p className="flex-1 text-sm font-medium text-brand-navy truncate min-w-0">{question.title}</p>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0 ${TYPE_BADGE[question.type] ?? 'bg-brand-surface text-brand-navy/50'}`}>
        {question.type}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <input
          type="number"
          min={0}
          max={100}
          value={weightage}
          onChange={(e) => onWeightageChange(Number(e.target.value))}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`Weightage for ${question.title}`}
          className="w-16 text-center font-mono text-sm border border-brand-border rounded-lg px-2 py-1 outline-none focus:border-brand-orange transition-colors"
        />
        <span className="text-xs text-brand-navy/50 ml-0.5">%</span>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${question.title}`}
        className="text-brand-navy/30 hover:text-red-400 transition-colors shrink-0"
      >
        <Trash2 size={14} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [languages, setLanguages] = useState<string[]>(['python'])
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'strict'>('standard')
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [questionWeightages, setQuestionWeightages] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const [assessmentType, setAssessmentType] = useState<'open' | 'deadline' | 'window'>('open')
  const [deadlineAt, setDeadlineAt] = useState('')
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [timezone, setTimezone] = useState('Asia/Karachi')
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['questions'],
    queryFn: () => questionsApi.list(),
  })

  const availableQuestions = questions.filter((q) =>
    !questionIds.includes(q.id) &&
    q.title.toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter ? q.type === typeFilter : true),
  )

  const addedQuestions = questionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter((q): q is Question => q !== undefined)

  const create = useMutation({
    mutationFn: (body: CreateAssessmentBody) => assessmentsApi.create(body),
    onSuccess: () => router.push('/dashboard/assessments'),
  })

  const toggleLang = (lang: string) =>
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    )

  const addQuestion = (id: string) => {
    setQuestionIds((prev) => [...prev, id])
    setQuestionWeightages((w) => ({ ...w, [id]: 0 }))
  }

  const removeQuestion = (id: string) => {
    setQuestionIds((prev) => prev.filter((q) => q !== id))
    setQuestionWeightages((w) => { const next = { ...w }; delete next[id]; return next })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setQuestionIds((ids) =>
        arrayMove(ids, ids.indexOf(active.id as string), ids.indexOf(over.id as string)),
      )
    }
  }

  const weightageTotal = questionIds.reduce((sum, id) => sum + (questionWeightages[id] ?? 0), 0)

  const validateSchedule = (): string | null => {
    if (assessmentType === 'deadline') {
      if (!deadlineAt) return 'Deadline date and time is required.'
      if (new Date(deadlineAt) <= new Date()) return 'Deadline must be in the future.'
    }
    if (assessmentType === 'window') {
      if (!windowStart) return 'Window start date and time is required.'
      if (!windowEnd) return 'Window end date and time is required.'
      if (new Date(windowEnd) <= new Date(windowStart)) return 'Window end must be after window start.'
    }
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validateSchedule()
    if (err) { setScheduleError(err); return }
    setScheduleError(null)
    create.mutate({
      title,
      duration_minutes: duration,
      allowed_languages: languages,
      security_level: securityLevel,
      questions: questionIds.map((id, idx) => ({
        question_id: id,
        weightage: questionWeightages[id] ?? 0,
        order_index: idx,
      })),
      assessment_type: assessmentType,
      deadline_at:  assessmentType === 'deadline' ? deadlineAt  : undefined,
      window_start: assessmentType === 'window'   ? windowStart : undefined,
      window_end:   assessmentType === 'window'   ? windowEnd   : undefined,
      timezone,
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

            {/* Section 4: Schedule */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-brand-navy/60">Assessment Type</h2>
              </div>
              <div className="p-6 space-y-4">
                {/* Type card-radios */}
                <div className="grid grid-cols-3 gap-3">
                  {ASSESSMENT_TYPES.map(({ value, title, desc, Icon }) => {
                    const selected = assessmentType === value
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => { setAssessmentType(value); setScheduleError(null) }}
                        className={[
                          'rounded-xl p-4 text-left transition-all',
                          selected
                            ? 'border-2 border-brand-orange bg-brand-orange-pale/30'
                            : 'border border-brand-border bg-white hover:border-brand-navy/30',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Icon
                            size={18}
                            className={selected ? 'text-brand-orange' : 'text-brand-navy/40'}
                            aria-hidden="true"
                          />
                          {selected && (
                            <CheckCircle2 size={14} className="text-brand-orange" aria-hidden="true" />
                          )}
                        </div>
                        <p className="font-semibold text-sm text-brand-navy">{title}</p>
                        <p className="text-xs text-brand-navy/50 mt-0.5 leading-relaxed">{desc}</p>
                      </button>
                    )
                  })}
                </div>

                {/* Deadline fields */}
                {assessmentType === 'deadline' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div>
                      <label htmlFor="deadlineAt" className="mb-1.5 block text-sm font-medium text-brand-navy">
                        Deadline date and time <span className="text-red-400" aria-hidden="true">*</span>
                      </label>
                      <input
                        id="deadlineAt"
                        type="datetime-local"
                        value={deadlineAt}
                        onChange={(e) => { setDeadlineAt(e.target.value); setScheduleError(null) }}
                        aria-required="true"
                        className="w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                      />
                    </div>
                    <TimezoneSelect value={timezone} onChange={setTimezone} />
                  </motion.div>
                )}

                {/* Window fields */}
                {assessmentType === 'window' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    transition={{ duration: 0.15 }}
                    className="space-y-3 overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="windowStart" className="mb-1.5 block text-sm font-medium text-brand-navy">
                          Window opens <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="windowStart"
                          type="datetime-local"
                          value={windowStart}
                          onChange={(e) => { setWindowStart(e.target.value); setScheduleError(null) }}
                          aria-required="true"
                          className="w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                        />
                      </div>
                      <div>
                        <label htmlFor="windowEnd" className="mb-1.5 block text-sm font-medium text-brand-navy">
                          Window closes <span className="text-red-400" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="windowEnd"
                          type="datetime-local"
                          value={windowEnd}
                          onChange={(e) => { setWindowEnd(e.target.value); setScheduleError(null) }}
                          aria-required="true"
                          className="w-full rounded-lg border border-brand-border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                        />
                      </div>
                    </div>
                    <TimezoneSelect value={timezone} onChange={setTimezone} />
                  </motion.div>
                )}

                {/* Schedule validation error */}
                {scheduleError && (
                  <p className="text-xs text-red-500" role="alert">
                    {scheduleError}
                  </p>
                )}
              </div>
            </motion.div>

            {/* Section 5: Questions — split panel */}
            <motion.div variants={sectionVariants} className="rounded-xl border border-brand-border bg-white shadow-sm overflow-hidden">
              <div className="border-b border-brand-border bg-brand-surface/50 px-6 py-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">Questions</h2>
                {questionIds.length > 0 && (
                  <span className="rounded-full bg-brand-orange px-2 py-0.5 text-xs font-medium text-white tabular-nums">
                    {questionIds.length} selected
                  </span>
                )}
              </div>
              <div className="flex" style={{ height: 420 }}>
                {/* Left: question bank browser */}
                <div className="flex flex-col border-r border-brand-border" style={{ width: '60%' }}>
                  <div className="p-3 border-b border-brand-border space-y-2">
                    <div className="relative">
                      <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-navy/35" aria-hidden="true" />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search question bank…"
                        className="w-full rounded-lg border border-brand-border bg-white py-2 pl-8 pr-3 text-sm text-brand-navy placeholder-brand-navy/30 outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/15 transition-shadow"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {['', 'coding', 'mcq', 'text'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTypeFilter(t)}
                          className={[
                            'rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all',
                            typeFilter === t
                              ? 'bg-brand-navy text-white'
                              : 'bg-brand-surface border border-brand-border text-brand-navy/60 hover:border-brand-navy/40',
                          ].join(' ')}
                        >
                          {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto divide-y divide-brand-border">
                    {questionsLoading ? (
                      <div className="animate-pulse p-3 space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-3 px-1 py-2">
                            <div className="flex-1 h-3.5 bg-brand-border rounded" />
                            <div className="h-4 w-12 bg-brand-border/60 rounded-full" />
                          </div>
                        ))}
                      </div>
                    ) : availableQuestions.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-sm text-brand-navy/40 text-center p-4">
                        {search || typeFilter ? 'No questions match your filters.' : 'No questions in the bank yet.'}
                      </div>
                    ) : (
                      availableQuestions.map((q) => (
                        <div key={q.id} className="flex items-center gap-3 px-4 py-3 hover:bg-brand-surface transition-colors">
                          <span className="flex-1 text-sm text-brand-navy truncate">{q.title}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize shrink-0 ${TYPE_BADGE[q.type] ?? 'bg-brand-surface text-brand-navy/50'}`}>
                            {q.type}
                          </span>
                          <button
                            type="button"
                            onClick={() => addQuestion(q.id)}
                            aria-label={`Add ${q.title}`}
                            className="rounded-md p-1 text-brand-navy/40 hover:bg-brand-orange-pale hover:text-brand-orange transition-colors shrink-0"
                          >
                            <Plus size={14} aria-hidden="true" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Right: added questions with weightage */}
                <div className="flex flex-col" style={{ width: '40%' }}>
                  <div className="px-4 py-3 border-b border-brand-border shrink-0">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy/50">
                      Assessment Questions ({questionIds.length})
                    </p>
                  </div>

                  {questionIds.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                      <FileCode2 size={28} className="text-brand-navy/15 mb-2" aria-hidden="true" />
                      <p className="text-xs text-brand-navy/40">Add questions from the bank</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto p-3">
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                          <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
                            {addedQuestions.map((q) => (
                              <SortableQuestionCard
                                key={q.id}
                                question={q}
                                weightage={questionWeightages[q.id] ?? 0}
                                onWeightageChange={(v) => setQuestionWeightages((p) => ({ ...p, [q.id]: v }))}
                                onRemove={() => removeQuestion(q.id)}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      </div>

                      {/* Weightage total bar */}
                      <div className="border-t border-brand-border p-3 bg-white shrink-0">
                        <div className="mb-1.5 h-2 rounded-full bg-brand-border overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-200"
                            style={{
                              width: `${Math.min(100, weightageTotal)}%`,
                              backgroundColor: weightageTotal === 100 ? '#16a34a' : weightageTotal > 100 ? '#ef4444' : '#DE5E1F',
                            }}
                          />
                        </div>
                        <p className={[
                          'text-sm font-medium',
                          weightageTotal === 100 ? 'text-green-600' : weightageTotal > 100 ? 'text-red-600' : 'text-amber-600',
                        ].join(' ')}>
                          {weightageTotal === 100
                            ? '✓ Balanced — 100%'
                            : weightageTotal < 100
                              ? `${100 - weightageTotal}% remaining`
                              : `${weightageTotal - 100}% over limit`}
                        </p>
                      </div>
                    </>
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
                disabled={create.isPending || languages.length === 0 || (questionIds.length > 0 && weightageTotal !== 100)}
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
