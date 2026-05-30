'use client'

import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { format } from 'date-fns'
import { reportsApi } from '../../../../lib/api'

export default function ReportPage() {
  const { sessionId } = useParams<{ sessionId: string }>()

  const { data, isLoading } = useQuery({
    queryKey: ['reports', sessionId],
    queryFn: () => reportsApi.get(sessionId),
  })

  if (isLoading) return <div className="p-8 text-brand-navy/40">Loading report…</div>
  if (!data) return <div className="p-8 text-red-500">Report not found.</div>

  const scoreColor =
    data.final_score >= 70
      ? 'text-green-600'
      : data.final_score >= 40
        ? 'text-brand-orange'
        : 'text-red-600'

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Link href="/dashboard/assessments" className="mb-1 block text-xs text-brand-navy/40 hover:text-brand-navy">
          ← Assessments
        </Link>
        <h1 className="text-xl font-semibold text-brand-navy">{data.candidate_name}</h1>
        <p className="mt-0.5 text-sm text-brand-navy/60">
          {data.candidate_email} · {data.assessment_title}
        </p>
      </div>

      <div className="p-8 max-w-4xl">
        {/* Score card */}
        <div className="mb-6 flex items-center gap-6 rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <div>
            <p className="text-xs text-brand-navy/50">Final Score</p>
            <p className={`text-6xl font-bold ${scoreColor}`}>{data.final_score}%</p>
          </div>
          <div className="border-l border-brand-border pl-6 space-y-1">
            <p className="text-sm text-brand-navy"><span className="text-brand-navy/50">Candidate:</span> {data.candidate_name}</p>
            <p className="text-sm text-brand-navy"><span className="text-brand-navy/50">Assessment:</span> {data.assessment_title}</p>
          </div>
        </div>

        {/* Submissions */}
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-navy/50">Submissions</h2>
          <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border bg-brand-surface">
                  {['Question', 'Score', 'Tests Passed', 'Submitted At'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.submissions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-brand-navy/40">
                      No submissions.
                    </td>
                  </tr>
                ) : (
                  data.submissions.map((sub) => (
                    <tr key={sub.question_id} className="border-b border-brand-border hover:bg-brand-navy-pale transition-colors last:border-0">
                      <td className="px-4 py-3 text-brand-navy">{sub.question_title}</td>
                      <td className="px-4 py-3 font-medium text-brand-navy">{sub.score}%</td>
                      <td className="px-4 py-3 text-brand-navy/60">
                        {sub.passed_tests}/{sub.total_tests}
                      </td>
                      <td className="px-4 py-3 text-brand-navy/60">
                        {format(new Date(sub.submitted_at), 'MMM d, HH:mm:ss')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Violations */}
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-navy/50">Violations</h2>
          {data.violations.length === 0 ? (
            <p className="text-sm text-brand-navy/40">No security violations recorded.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border bg-brand-surface">
                    {['Type', 'Count', 'First Occurrence'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.violations.map((v) => (
                    <tr key={v.type} className="border-b border-brand-border border-l-2 border-l-brand-orange bg-brand-orange-pale/30 last:border-b-0">
                      <td className="px-4 py-3 text-brand-navy font-medium">{v.type}</td>
                      <td className="px-4 py-3 text-brand-navy">{v.count}</td>
                      <td className="px-4 py-3 text-brand-navy/60">
                        {format(new Date(v.first_occurrence), 'MMM d, HH:mm:ss')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
