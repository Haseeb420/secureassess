'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { assessmentsApi, questionsApi, type CreateAssessmentBody } from '../../../../lib/api'

const LANGUAGES = ['cpp', 'python', 'javascript', 'typescript', 'java', 'go']
const LANGUAGE_LABELS: Record<string, string> = {
  cpp: 'C++', python: 'Python', javascript: 'JavaScript',
  typescript: 'TypeScript', java: 'Java', go: 'Go',
}

export default function NewAssessmentPage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [duration, setDuration] = useState(60)
  const [languages, setLanguages] = useState<string[]>(['python'])
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'strict'>('standard')
  const [questionIds, setQuestionIds] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const { data: questions = [] } = useQuery({
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
    create.mutate({ title, duration_minutes: duration, allowed_languages: languages, security_level: securityLevel, question_ids: questionIds })
  }

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-brand-navy">New Assessment</h1>
        <p className="mt-0.5 text-sm text-brand-navy/60">Create a new assessment for candidates</p>
      </div>

      <div className="p-8 max-w-2xl">
        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Title">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g. Backend Engineering Round 1"
              />
            </Field>

            <Field label="Duration (minutes)">
              <input
                type="number"
                required
                min={5}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="input w-32"
              />
            </Field>

            <Field label="Allowed Languages">
              <div className="flex flex-wrap gap-3">
                {LANGUAGES.map((lang) => (
                  <label key={lang} className="flex items-center gap-2 cursor-pointer text-brand-navy text-sm">
                    <input
                      type="checkbox"
                      checked={languages.includes(lang)}
                      onChange={() => toggleLang(lang)}
                      style={{ accentColor: '#DE5E1F' }}
                    />
                    {LANGUAGE_LABELS[lang]}
                  </label>
                ))}
              </div>
            </Field>

            <Field label="Security Level">
              <select
                value={securityLevel}
                onChange={(e) => setSecurityLevel(e.target.value as 'standard' | 'strict')}
                className="input w-48"
              >
                <option value="standard">Standard</option>
                <option value="strict">Strict</option>
              </select>
            </Field>

            <Field label="Questions">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search question bank…"
                className="input mb-2"
              />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-brand-border divide-y divide-brand-border bg-white">
                {filtered.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-brand-navy/40">No questions found.</p>
                ) : (
                  filtered.map((q) => (
                    <label key={q.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-brand-surface">
                      <input
                        type="checkbox"
                        checked={questionIds.includes(q.id)}
                        onChange={() => toggleQuestion(q.id)}
                        style={{ accentColor: '#DE5E1F' }}
                      />
                      <span className="text-sm text-brand-navy">{q.title}</span>
                      <span className="ml-auto text-xs text-brand-navy/40 capitalize">{q.difficulty}</span>
                    </label>
                  ))
                )}
              </div>
              {questionIds.length > 0 && (
                <p className="mt-1 text-xs text-brand-navy/40">{questionIds.length} question(s) selected</p>
              )}
            </Field>

            {create.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{String(create.error)}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors disabled:opacity-50"
              >
                {create.isPending ? 'Creating…' : 'Create Assessment'}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-navy hover:border-brand-navy transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brand-navy">{label}</label>
      {children}
    </div>
  )
}
