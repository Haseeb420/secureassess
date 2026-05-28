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

  if (isLoading) return <div className="p-6 text-zinc-500">Loading report…</div>
  if (!data) return <div className="p-6 text-red-400">Report not found.</div>

  const scoreColor =
    data.final_score >= 70
      ? 'text-green-400'
      : data.final_score >= 40
        ? 'text-yellow-400'
        : 'text-red-400'

  return (
    <div className="p-6 max-w-4xl">
      <Link href="/dashboard/assessments" className="mb-2 block text-xs text-zinc-500 hover:text-zinc-300">
        ← Assessments
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{data.candidate_name}</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {data.candidate_email} · {data.assessment_title}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Final Score</p>
          <p className={`text-4xl font-bold ${scoreColor}`}>{data.final_score}%</p>
        </div>
      </div>

      {/* Submissions */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Submissions</h2>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400">
              <tr>
                {['Question', 'Score', 'Tests Passed', 'Submitted At'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {data.submissions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    No submissions.
                  </td>
                </tr>
              ) : (
                data.submissions.map((sub) => (
                  <tr key={sub.question_id} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-zinc-200">{sub.question_title}</td>
                    <td className="px-4 py-3 font-medium text-zinc-200">{sub.score}%</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {sub.passed_tests}/{sub.total_tests}
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
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
        <h2 className="mb-3 text-sm font-medium text-zinc-400">Violations</h2>
        {data.violations.length === 0 ? (
          <p className="text-sm text-zinc-600">No security violations recorded.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  {['Type', 'Count', 'First Occurrence'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {data.violations.map((v) => (
                  <tr key={v.type} className="hover:bg-zinc-900/50">
                    <td className="px-4 py-3 text-red-400">{v.type}</td>
                    <td className="px-4 py-3 text-zinc-200">{v.count}</td>
                    <td className="px-4 py-3 text-zinc-400">
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
  )
}
