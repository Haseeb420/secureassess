'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@supabase/supabase-js'
import { sessionsApi, type Session, type SessionDetail } from '../../../lib/api'
import { format } from 'date-fns'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const STATUS_COLORS: Record<Session['status'], string> = {
  active: 'bg-green-900/60 border-green-700 text-green-200',
  idle: 'bg-yellow-900/60 border-yellow-700 text-yellow-200',
  completed: 'bg-zinc-800 border-zinc-700 text-zinc-400',
  terminated: 'bg-red-900/60 border-red-700 text-red-300',
}

const STATUS_DOT: Record<Session['status'], string> = {
  active: 'bg-green-400',
  idle: 'bg-yellow-400',
  completed: 'bg-zinc-500',
  terminated: 'bg-red-500',
}

export default function MonitorPage() {
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionsApi.list(),
    refetchInterval: 30_000,
  })

  // Subscribe to Supabase Realtime for live session updates
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
      <div className="flex-1 overflow-y-auto p-6">
        <h1 className="mb-6 text-xl font-semibold">Live Monitor</h1>

        {isLoading ? (
          <p className="text-zinc-500">Loading sessions…</p>
        ) : activeSessions.length === 0 ? (
          <p className="text-zinc-500">No active sessions right now.</p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
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
            <h2 className="mb-3 mt-8 text-sm font-medium text-zinc-400">Completed / Terminated</h2>
            <div className="grid grid-cols-3 gap-4 opacity-60">
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
  const progress =
    session.total_questions > 0
      ? Math.round((session.questions_done / session.total_questions) * 100)
      : 0

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-4 text-left transition-all ${STATUS_COLORS[session.status]} ${isSelected ? 'ring-2 ring-white/20' : 'hover:brightness-110'}`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${STATUS_DOT[session.status]}`} />
        <span className="text-sm font-medium truncate">{session.candidate_name}</span>
        {session.violation_count > 0 && (
          <span className="ml-auto rounded bg-red-800 px-1.5 py-0.5 text-xs text-red-200">
            {session.violation_count}⚠
          </span>
        )}
      </div>
      <p className="text-xs opacity-70 truncate">{session.assessment_title}</p>
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs opacity-60">
          <span>{session.questions_done}/{session.total_questions} questions</span>
          <span>{progress}%</span>
        </div>
        <div className="h-1 rounded-full bg-black/30">
          <div className="h-1 rounded-full bg-white/40" style={{ width: `${progress}%` }} />
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
    <aside className="flex w-80 shrink-0 flex-col border-l border-zinc-800 bg-[#111]">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-medium text-zinc-200">Session Detail</span>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-500 hover:text-zinc-200"
          aria-label="Close drawer"
        >
          ✕
        </button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-zinc-500">Loading…</div>
      ) : !data ? (
        <div className="p-4 text-sm text-red-400">Session not found.</div>
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
      <div className="space-y-3 border-b border-zinc-800 p-4">
        <InfoRow label="Candidate" value={data.candidate_name} />
        <InfoRow label="Email" value={data.candidate_email} />
        <InfoRow label="Assessment" value={data.assessment_title} />
        <InfoRow label="Started" value={format(new Date(data.started_at), 'MMM d, HH:mm')} />
        <InfoRow label="Violations" value={String(data.violation_count)} />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
          Security Events
        </h3>
        {data.security_events.length === 0 ? (
          <p className="text-xs text-zinc-600">No events recorded.</p>
        ) : (
          <ul className="space-y-2">
            {data.security_events.map((ev) => (
              <li key={ev.id} className="rounded-md bg-zinc-900 p-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-red-400">{ev.type}</span>
                  <span className="text-xs text-zinc-600">
                    {format(new Date(ev.created_at), 'HH:mm:ss')}
                  </span>
                </div>
                {Object.keys(ev.metadata).length > 0 && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {JSON.stringify(ev.metadata)}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-zinc-800 p-4">
        <button
          type="button"
          onClick={() => terminate.mutate()}
          disabled={data.status === 'terminated' || data.status === 'completed' || terminate.isPending}
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
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
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 text-right">{value}</span>
    </div>
  )
}
