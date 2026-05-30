'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { FileText } from 'lucide-react'
import { motion } from 'framer-motion'
import { EmptyState, Skeleton } from '@secureassess/ui'
import { PageHeader } from '../../../components/PageHeader'
import { sessionsApi, type Session } from '../../../lib/api'

export default function ReportsPage() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', 'completed'],
    queryFn: () => sessionsApi.list('completed'),
  })

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle={`${sessions.length} completed assessment${sessions.length !== 1 ? 's' : ''}`}
      />

      <div className="p-8">
        {isLoading ? (
          <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b border-brand-border px-4 py-3 last:border-0">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24 ml-auto" />
              </div>
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<FileText size={36} />}
            title="No completed assessments"
            description="Reports will appear here once candidates finish their assessments."
          />
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm"
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface">
                  {['Candidate', 'Assessment', 'Score', 'Violations', 'Completed'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {sessions.map((session: Session, i) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15, delay: i * 0.04 }}
                    className="border-b border-brand-border hover:bg-brand-navy-pale transition-colors last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-navy">{session.candidate_name}</p>
                      <p className="text-xs text-brand-navy/50">{session.candidate_email}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-navy">{session.assessment_title}</td>
                    <td className="px-4 py-3 text-brand-navy">
                      {session.questions_done}/{session.total_questions} questions
                    </td>
                    <td className="px-4 py-3">
                      {session.violation_count > 0 ? (
                        <span className="rounded-full bg-brand-orange-pale px-2 py-0.5 text-xs font-medium text-brand-orange">
                          {session.violation_count} violation{session.violation_count !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-brand-navy/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-brand-navy/60">
                      {format(new Date(session.started_at), 'MMM d, yyyy HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/reports/${session.id}`}
                        className="text-xs font-medium text-brand-orange hover:underline"
                      >
                        View Report →
                      </Link>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </div>
  )
}
