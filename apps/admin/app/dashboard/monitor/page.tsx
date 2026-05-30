'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { Monitor } from 'lucide-react'
import { sessionsApi, type Session, type SessionDetail } from '../../../lib/api'
import { PageHeader } from '../../../components/PageHeader'
import { format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const STATUS_DOT: Record<Session['status'], string> = {
  active:     'bg-green-400',
  idle:       'bg-brand-orange',
  completed:  'bg-brand-navy/20',
  terminated: 'bg-red-400',
}

export default function MonitorPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
    refetchInterval: 30_000,
  })

  useEffect(() => {
    const channel = supabase
      .channel('sessions-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessment_sessions' }, () => {
        qc.invalidateQueries({ queryKey: ['sessions'] })
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, () => {
        qc.invalidateQueries({ queryKey: ['sessions'] })
        if (selectedId) qc.invalidateQueries({ queryKey: ['sessions', selectedId] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc, selectedId])

  const activeSessions = sessions.filter((s) => s.status === 'active' || s.status === 'idle')
  const pastSessions = sessions.filter((s) => s.status === 'completed' || s.status === 'terminated')

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <PageHeader
          title="Live Monitor"
          subtitle={`${activeSessions.length} active session${activeSessions.length !== 1 ? 's' : ''}`}
        />

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 px-8 pt-6">
          {[
            { label: 'Active', value: activeSessions.filter(s => s.status === 'active').length, dot: 'bg-green-400' },
            { label: 'Violations', value: sessions.reduce((n, s) => n + s.violation_count, 0), dot: 'bg-brand-orange' },
            { label: 'Submitted', value: pastSessions.filter(s => s.status === 'completed').length, dot: 'bg-brand-navy/30' },
            { label: 'Terminated', value: pastSessions.filter(s => s.status === 'terminated').length, dot: 'bg-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3 rounded-xl border border-brand-border bg-white px-4 py-3 shadow-sm">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${stat.dot}`} aria-hidden="true" />
              <div>
                <p className="text-xl font-bold text-brand-navy">{stat.value}</p>
                <p className="text-xs text-brand-navy/50">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 rounded-xl border border-brand-border bg-white animate-pulse" />
              ))}
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-brand-navy/40">
              <Monitor size={40} className="mb-3" aria-hidden="true" />
              <p className="text-sm font-medium">No active assessments</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  isSelected={selectedId === s.id}
                  onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                />
              ))}
            </div>
          )}

          {pastSessions.length > 0 && (
            <>
              <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wide text-brand-navy/40">
                Completed / Terminated
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
                {pastSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    isSelected={selectedId === s.id}
                    onClick={() => setSelectedId(selectedId === s.id ? null : s.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {selectedId && (
        <RightDrawer sessionId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  )
}

function SessionCard({
  session,
  isSelected,
  onClick,
}: {
  session: Session
  isSelected: boolean
  onClick: () => void
}) {
  const initials = session.candidate_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const progress =
    session.total_questions > 0
      ? Math.round((session.questions_done / session.total_questions) * 100)
      : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:shadow-md cursor-pointer ${
        isSelected
          ? 'border-brand-orange ring-2 ring-brand-orange/20'
          : 'border-brand-border hover:border-brand-orange'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy-pale text-xs font-semibold text-brand-navy">
            {initials}
          </div>
          <div>
            <p className="text-sm font-semibold text-brand-navy truncate max-w-[120px]">
              {session.candidate_name}
            </p>
            <p className="text-xs text-brand-navy/50 truncate max-w-[120px]">
              {session.assessment_title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${STATUS_DOT[session.status]}`} />
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

function RightDrawer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', sessionId],
    queryFn: () => sessionsApi.get(sessionId),
  })

  const terminate = useMutation({
    mutationFn: () => sessionsApi.terminate(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      onClose()
    },
  })

  return (
    <aside className="fixed right-0 top-0 bottom-0 flex w-80 shrink-0 flex-col border-l border-brand-border bg-white shadow-xl z-40">
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
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="space-y-3 border-b border-brand-border p-5">
        <InfoRow label="Candidate" value={data.candidate_name} />
        <InfoRow label="Email" value={data.candidate_email} />
        <InfoRow label="Assessment" value={data.assessment_title} />
        <InfoRow label="Started" value={format(new Date(data.started_at), 'MMM d, HH:mm')} />
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
            {data.security_events.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 border-b border-brand-border py-3 last:border-0">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-navy">{ev.type}</p>
                  {Object.keys(ev.metadata).length > 0 && (
                    <p className="mt-0.5 text-xs text-brand-navy/60 truncate">
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
          className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
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
      <span className="text-brand-navy text-right">{value}</span>
    </div>
  )
}
