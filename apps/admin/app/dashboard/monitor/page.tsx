'use client'

import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import {
  Monitor, ChevronDown, ChevronUp, ArrowLeft,
  AlertTriangle, Activity, Users,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { sessionsApi, assessmentsApi, type Session, type SessionDetail, type Assessment } from '../../../lib/api'
import { PageHeader } from '../../../components/PageHeader'
import { format, formatDistanceToNow } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

type ViewMode = 'live' | 'by-assessment'

// All possible session statuses from the DB
const STATUS_META: Record<string, { dot: string; label: string; badge: string }> = {
  active:     { dot: 'bg-green-400 animate-pulse', label: 'Active',     badge: 'text-green-700 bg-green-50 border-green-200' },
  idle:       { dot: 'bg-amber-400',               label: 'Idle',       badge: 'text-amber-700 bg-amber-50 border-amber-200' },
  completed:  { dot: 'bg-blue-400',                label: 'Completed',  badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  submitted:  { dot: 'bg-blue-400',                label: 'Submitted',  badge: 'text-blue-700 bg-blue-50 border-blue-200' },
  terminated: { dot: 'bg-red-400',                 label: 'Terminated', badge: 'text-red-700 bg-red-50 border-red-200' },
  abandoned:  { dot: 'bg-brand-navy/20',           label: 'Abandoned',  badge: 'text-brand-navy/50 bg-brand-navy/5 border-brand-navy/10' },
  timed_out:  { dot: 'bg-brand-navy/20',           label: 'Timed Out',  badge: 'text-brand-navy/50 bg-brand-navy/5 border-brand-navy/10' },
}

function sMeta(status: string) {
  return STATUS_META[status] ?? { dot: 'bg-brand-navy/20', label: status, badge: 'text-brand-navy/50 bg-brand-navy/5 border-brand-navy/10' }
}

function isLive(s: Session) { return s.status === 'active' || s.status === 'idle' }
function isDone(s: Session) { return !isLive(s) }

type AssessmentGroup = {
  assessment_id: string
  assessment_title: string
  is_archived: boolean
  sessions: Session[]
}

// ── Initials avatar ────────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const i = name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-navy-pale text-xs font-semibold text-brand-navy">
      {i || '?'}
    </div>
  )
}

// ── Root page ──────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const qc = useQueryClient()
  const [view, setViewState] = useState<ViewMode>('live')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
  const [showPast, setShowPast] = useState(false)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
    refetchInterval: 30_000,
  })

  const { data: assessments = [] } = useQuery({
    queryKey: ['assessments'],
    queryFn: () => assessmentsApi.list(),
  })

  useEffect(() => {
    const channel = supabase
      .channel('sessions-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_sessions' }, () => {
        qc.invalidateQueries({ queryKey: ['sessions'] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, () => {
        qc.invalidateQueries({ queryKey: ['sessions'] })
        if (selectedSessionId) qc.invalidateQueries({ queryKey: ['sessions', selectedSessionId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc, selectedSessionId])

  const assessmentMap = useMemo(() => {
    const m = new Map<string, Assessment>()
    for (const a of assessments) m.set(a.id, a)
    return m
  }, [assessments])

  // Live view: exclude sessions from archived assessments
  const liveScopedSessions = useMemo(
    () => sessions.filter(s => assessmentMap.get(s.assessment_id)?.status !== 'archived'),
    [sessions, assessmentMap],
  )
  const activeSessions = liveScopedSessions.filter(isLive)
  const pastSessions   = liveScopedSessions.filter(isDone)

  // By Assessment: include all sessions (even archived) so admins can audit
  const assessmentGroups = useMemo<AssessmentGroup[]>(() => {
    const map = new Map<string, AssessmentGroup>()
    for (const s of sessions) {
      if (!map.has(s.assessment_id)) {
        const a = assessmentMap.get(s.assessment_id)
        map.set(s.assessment_id, {
          assessment_id:    s.assessment_id,
          assessment_title: s.assessment_title,
          is_archived:      a?.status === 'archived',
          sessions:         [],
        })
      }
      map.get(s.assessment_id)!.sessions.push(s)
    }
    return Array.from(map.values()).sort((a, b) => {
      const al = a.sessions.filter(isLive).length
      const bl = b.sessions.filter(isLive).length
      return bl - al || b.sessions.length - a.sessions.length
    })
  }, [sessions, assessmentMap])

  const selectedGroup = useMemo(
    () => assessmentGroups.find(g => g.assessment_id === selectedAssessmentId) ?? null,
    [assessmentGroups, selectedAssessmentId],
  )

  function changeView(v: ViewMode) {
    setViewState(v)
    setSelectedAssessmentId(null)
    setSelectedSessionId(null)
  }

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <PageHeader
          title="Live Monitor"
          subtitle={`${activeSessions.length} live · ${sessions.length} total sessions`}
        />

        {/* View toggle */}
        <div className="flex gap-1 px-8 pt-5 pb-1">
          {([
            { id: 'live' as ViewMode,          label: 'Live Sessions',  Icon: Activity },
            { id: 'by-assessment' as ViewMode, label: 'By Assessment',  Icon: Users },
          ]).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeView(id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                view === id
                  ? 'bg-brand-navy text-white'
                  : 'text-brand-navy/60 hover:text-brand-navy hover:bg-brand-surface'
              }`}
            >
              <Icon size={14} aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {view === 'live' ? (
          <LiveSessionsView
            activeSessions={activeSessions}
            pastSessions={pastSessions}
            isLoading={isLoading}
            showPast={showPast}
            onTogglePast={() => setShowPast(p => !p)}
            selectedId={selectedSessionId}
            onSelect={(id) => setSelectedSessionId(prev => prev === id ? null : id)}
          />
        ) : (
          <ByAssessmentView
            groups={assessmentGroups}
            selectedGroup={selectedGroup}
            onSelectAssessment={(id) => { setSelectedAssessmentId(id); setSelectedSessionId(null) }}
            onBack={() => setSelectedAssessmentId(null)}
            selectedSessionId={selectedSessionId}
            onSelectSession={(id) => setSelectedSessionId(prev => prev === id ? null : id)}
            isLoading={isLoading}
          />
        )}
      </div>

      {selectedSessionId && (
        <RightDrawer sessionId={selectedSessionId} onClose={() => setSelectedSessionId(null)} />
      )}
    </div>
  )
}

// ── Live Sessions view ─────────────────────────────────────────────────────────

function LiveSessionsView({
  activeSessions, pastSessions, isLoading, showPast, onTogglePast, selectedId, onSelect,
}: {
  activeSessions: Session[]
  pastSessions: Session[]
  isLoading: boolean
  showPast: boolean
  onTogglePast: () => void
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const totalViolations = [...activeSessions, ...pastSessions].reduce((n, s) => n + s.violation_count, 0)
  const completedCount  = pastSessions.filter(s => s.status === 'completed' || s.status === 'submitted').length
  const terminatedCount = pastSessions.filter(s => s.status === 'terminated').length

  return (
    <div className="p-8 pt-6">
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Active',     value: activeSessions.filter(s => s.status === 'active').length, dot: 'bg-green-400 animate-pulse' },
          { label: 'Idle',       value: activeSessions.filter(s => s.status === 'idle').length,   dot: 'bg-amber-400' },
          { label: 'Violations', value: totalViolations,                                           dot: 'bg-brand-orange' },
          { label: 'Completed',  value: completedCount,                                            dot: 'bg-blue-400' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-brand-border bg-white px-4 py-3 shadow-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stat.dot}`} aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-brand-navy">{stat.value}</p>
              <p className="text-xs text-brand-navy/50">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Active session grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      ) : activeSessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-navy/40">
          <Monitor size={40} className="mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold">No active sessions</p>
          <p className="mt-1 text-xs">Candidates will appear here when they start an assessment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeSessions.map(s => (
            <SessionCard
              key={s.id}
              session={s}
              isSelected={selectedId === s.id}
              onClick={() => onSelect(s.id)}
            />
          ))}
        </div>
      )}

      {/* Past sessions — collapsed by default */}
      {!isLoading && pastSessions.length > 0 && (
        <div className="mt-8">
          <button
            type="button"
            onClick={onTogglePast}
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-navy/40 hover:text-brand-navy/60 transition-colors"
          >
            {showPast ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Past Sessions &mdash; {completedCount} completed{terminatedCount > 0 ? `, ${terminatedCount} terminated` : ''}
          </button>

          <AnimatePresence>
            {showPast && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="mt-3 grid grid-cols-1 gap-4 opacity-60 sm:grid-cols-2 lg:grid-cols-3">
                  {pastSessions.map(s => (
                    <SessionCard
                      key={s.id}
                      session={s}
                      isSelected={selectedId === s.id}
                      onClick={() => onSelect(s.id)}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ── Session card (live grid) ───────────────────────────────────────────────────

function SessionCard({ session, isSelected, onClick }: {
  session: Session
  isSelected: boolean
  onClick: () => void
}) {
  const meta     = sMeta(session.status)
  const initials = session.candidate_name.split(' ').map(n => n[0] ?? '').join('').toUpperCase().slice(0, 2)
  const progress = session.total_questions > 0
    ? Math.round((session.questions_done / session.total_questions) * 100) : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md cursor-pointer ${
        isSelected ? 'border-brand-orange ring-2 ring-brand-orange/20' : 'border-brand-border hover:border-brand-orange'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy-pale text-xs font-semibold text-brand-navy">
            {initials || '?'}
          </div>
          <div>
            <p className="max-w-[120px] truncate text-sm font-semibold text-brand-navy">
              {session.candidate_name}
            </p>
            <p className="max-w-[120px] truncate text-xs text-brand-navy/50">
              {session.assessment_title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
          <span className="text-xs text-brand-navy/40">{meta.label}</span>
          {session.violation_count > 0 && (
            <span className="rounded-full bg-brand-orange-pale px-2 py-0.5 text-xs font-medium text-brand-orange">
              {session.violation_count}⚠
            </span>
          )}
        </div>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-brand-navy/60">
          <span>Progress</span>
          <span>{session.questions_done}/{session.total_questions} · {progress}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-brand-surface">
          <div className="h-1.5 rounded-full bg-brand-orange transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </button>
  )
}

// ── By Assessment view ─────────────────────────────────────────────────────────

function ByAssessmentView({
  groups, selectedGroup, onSelectAssessment, onBack,
  selectedSessionId, onSelectSession, isLoading,
}: {
  groups: AssessmentGroup[]
  selectedGroup: AssessmentGroup | null
  onSelectAssessment: (id: string) => void
  onBack: () => void
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
  isLoading: boolean
}) {
  if (selectedGroup) {
    return (
      <AssessmentDrillDown
        group={selectedGroup}
        onBack={onBack}
        selectedSessionId={selectedSessionId}
        onSelectSession={onSelectSession}
      />
    )
  }

  return (
    <div className="p-8 pt-6">
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-brand-border bg-white" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-brand-navy/40">
          <Users size={40} className="mb-3" aria-hidden="true" />
          <p className="text-sm font-semibold">No sessions recorded</p>
          <p className="mt-1 text-xs">Candidate sessions will appear here after they begin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map(g => (
            <AssessmentGroupCard
              key={g.assessment_id}
              group={g}
              onClick={() => onSelectAssessment(g.assessment_id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AssessmentGroupCard({ group, onClick }: { group: AssessmentGroup; onClick: () => void }) {
  const live       = group.sessions.filter(isLive).length
  const completed  = group.sessions.filter(s => s.status === 'completed' || s.status === 'submitted').length
  const terminated = group.sessions.filter(s => s.status === 'terminated').length
  const total      = group.sessions.length
  const violations = group.sessions.reduce((n, s) => n + s.violation_count, 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-xl border border-brand-border bg-white p-5 text-left shadow-sm transition-all hover:border-brand-orange hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-brand-navy">{group.assessment_title}</p>
          {group.is_archived && (
            <span className="mt-0.5 inline-block text-xs text-brand-navy/40">Archived</span>
          )}
        </div>
        {live > 0 ? (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
            {live} live
          </span>
        ) : (
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-surface px-2 py-0.5 text-xs text-brand-navy/40">
            No live
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs text-brand-navy/60">
        <span><span className="font-semibold text-brand-navy">{total}</span> candidates</span>
        {completed > 0  && <span className="text-blue-600">{completed} completed</span>}
        {terminated > 0 && <span className="text-red-500">{terminated} terminated</span>}
        {violations > 0 && (
          <span className="flex items-center gap-0.5 text-brand-orange">
            <AlertTriangle size={10} aria-hidden="true" />
            {violations} violations
          </span>
        )}
      </div>

      <div className="mt-3">
        <div className="h-1 overflow-hidden rounded-full bg-brand-surface">
          <div
            className="h-1 rounded-full bg-blue-400 transition-all"
            style={{ width: total > 0 ? `${(completed / total) * 100}%` : '0%' }}
          />
        </div>
      </div>
    </button>
  )
}

// ── Assessment drill-down (candidate table) ────────────────────────────────────

const STATUS_SORT_ORDER = ['active', 'idle', 'completed', 'submitted', 'timed_out', 'abandoned', 'terminated']

function AssessmentDrillDown({
  group, onBack, selectedSessionId, onSelectSession,
}: {
  group: AssessmentGroup
  onBack: () => void
  selectedSessionId: string | null
  onSelectSession: (id: string) => void
}) {
  const live       = group.sessions.filter(isLive).length
  const completed  = group.sessions.filter(s => s.status === 'completed' || s.status === 'submitted').length
  const violations = group.sessions.reduce((n, s) => n + s.violation_count, 0)

  const sorted = useMemo(
    () => [...group.sessions].sort((a, b) =>
      STATUS_SORT_ORDER.indexOf(a.status) - STATUS_SORT_ORDER.indexOf(b.status)
    ),
    [group.sessions],
  )

  return (
    <div className="p-8 pt-6">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 flex items-center gap-1.5 text-sm text-brand-navy/50 transition-colors hover:text-brand-navy"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        All Assessments
      </button>

      <div className="mb-5 flex items-center gap-3">
        <h2 className="text-lg font-bold text-brand-navy">{group.assessment_title}</h2>
        {group.is_archived && (
          <span className="rounded-full border border-brand-border bg-brand-surface px-2 py-0.5 text-xs text-brand-navy/40">
            Archived
          </span>
        )}
      </div>

      {/* Assessment stats */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: 'Live',       value: live,                   dot: 'bg-green-400 animate-pulse' },
          { label: 'Total',      value: group.sessions.length,  dot: 'bg-brand-navy/30' },
          { label: 'Completed',  value: completed,              dot: 'bg-blue-400' },
          { label: 'Violations', value: violations,             dot: 'bg-brand-orange' },
        ].map(stat => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-brand-border bg-white px-4 py-3 shadow-sm">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stat.dot}`} aria-hidden="true" />
            <div>
              <p className="text-xl font-bold text-brand-navy">{stat.value}</p>
              <p className="text-xs text-brand-navy/50">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Candidate table */}
      <div className="overflow-hidden rounded-xl border border-brand-border bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border bg-brand-surface/60">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy/50">Candidate</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy/50">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy/50">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy/50">Violations</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-brand-navy/50">Started</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(s => (
              <CandidateRow
                key={s.id}
                session={s}
                isSelected={selectedSessionId === s.id}
                onClick={() => onSelectSession(s.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CandidateRow({ session, isSelected, onClick }: {
  session: Session
  isSelected: boolean
  onClick: () => void
}) {
  const meta     = sMeta(session.status)
  const progress = session.total_questions > 0
    ? Math.round((session.questions_done / session.total_questions) * 100) : 0

  return (
    <tr
      onClick={onClick}
      className={`cursor-pointer border-b border-brand-border last:border-0 transition-colors ${
        isSelected ? 'bg-brand-orange/[0.03]' : 'hover:bg-brand-surface/40'
      }`}
    >
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <Initials name={session.candidate_name} />
          <div className="min-w-0">
            <p className="truncate font-medium text-brand-navy">{session.candidate_name}</p>
            <p className="truncate text-xs text-brand-navy/50">{session.candidate_email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.badge}`}>
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.dot.replace(' animate-pulse', '')}`} aria-hidden="true" />
          {meta.label}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-brand-surface">
            <div className="h-1.5 rounded-full bg-brand-orange transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs text-brand-navy/50">{session.questions_done}/{session.total_questions}</span>
        </div>
      </td>
      <td className="px-4 py-3.5">
        {session.violation_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-orange">
            <AlertTriangle size={12} aria-hidden="true" />
            {session.violation_count}
          </span>
        ) : (
          <span className="text-xs text-brand-navy/30">—</span>
        )}
      </td>
      <td className="px-4 py-3.5 text-xs text-brand-navy/50">
        {formatDistanceToNow(new Date(session.started_at), { addSuffix: true })}
      </td>
    </tr>
  )
}

// ── Right drawer ───────────────────────────────────────────────────────────────

function RightDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn:  () => sessionsApi.get(sessionId),
  })

  const terminate = useMutation({
    mutationFn: () => sessionsApi.terminate(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
    },
  })

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-40 flex w-80 shrink-0 flex-col border-l border-brand-border bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-brand-border px-5 py-4">
        <span className="font-semibold text-brand-navy">Session Detail</span>
        <button
          type="button"
          onClick={onClose}
          className="text-brand-navy/40 hover:text-brand-navy"
          aria-label="Close drawer"
        >
          ✕
        </button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-brand-navy/40">Loading…</div>
      ) : !data ? (
        <div className="p-4 text-sm text-red-500">Session not found.</div>
      ) : (
        <DrawerContent data={data} terminate={terminate} />
      )}
    </aside>
  )
}

function DrawerContent({
  data,
  terminate,
}: {
  data: SessionDetail
  terminate: { mutate: () => void; isPending: boolean }
}) {
  const meta = sMeta(data.status)

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="space-y-3 border-b border-brand-border p-5">
        <div className="flex items-center justify-between">
          <InfoRow label="Candidate" value={data.candidate_name} />
          <span className={`ml-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot.replace(' animate-pulse', '')}`} aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <InfoRow label="Email"      value={data.candidate_email} />
        <InfoRow label="Assessment" value={data.assessment_title} />
        <InfoRow label="Started"    value={format(new Date(data.started_at), 'MMM d, HH:mm')} />
        <InfoRow label="Violations" value={String(data.violation_count)} />
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-navy/50">
          Security Events
        </h3>
        {data.security_events.length === 0 ? (
          <p className="text-xs text-brand-navy/30">No events recorded.</p>
        ) : (
          <ul className="space-y-0">
            {data.security_events.map(ev => (
              <li key={ev.id} className="flex items-start gap-3 border-b border-brand-border py-3 last:border-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-navy">{ev.type}</p>
                  {Object.keys(ev.metadata).length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-brand-navy/60">
                      {JSON.stringify(ev.metadata)}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-brand-navy/40">
                    {format(new Date(ev.created_at), 'HH:mm:ss')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-brand-border p-5">
        <button
          type="button"
          onClick={() => terminate.mutate()}
          disabled={data.status === 'terminated' || data.status === 'completed' || terminate.isPending}
          className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-40"
        >
          {terminate.isPending ? 'Terminating…' : 'Terminate Session'}
        </button>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-brand-navy/50">{label}</span>
      <span className="text-right text-brand-navy">{value}</span>
    </div>
  )
}
