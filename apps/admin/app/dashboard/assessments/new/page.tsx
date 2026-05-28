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
    <div className="p-6 max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold">New Assessment</h1>

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
              <label key={lang} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={languages.includes(lang)}
                  onChange={() => toggleLang(lang)}
                  className="rounded border-zinc-600 bg-zinc-800 text-white"
                />
                <span className="text-sm text-zinc-300">{LANGUAGE_LABELS[lang]}</span>
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
          <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-700 divide-y divide-zinc-800">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-500">No questions found.</p>
            ) : (
              filtered.map((q) => (
                <label key={q.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-zinc-800">
                  <input
                    type="checkbox"
                    checked={questionIds.includes(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="rounded border-zinc-600 bg-zinc-800"
                  />
                  <span className="text-sm text-zinc-300">{q.title}</span>
                  <span className="ml-auto text-xs text-zinc-500 capitalize">{q.difficulty}</span>
                </label>
              ))
            )}
          </div>
          {questionIds.length > 0 && (
            <p className="mt-1 text-xs text-zinc-500">{questionIds.length} question(s) selected</p>
          )}
        </Field>

        {create.isError && (
          <p className="text-sm text-red-400">{String(create.error)}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create Assessment'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  )
}
