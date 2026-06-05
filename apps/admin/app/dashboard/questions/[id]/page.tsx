'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { questionsApi, type CreateQuestionBody, type TestCase } from '../../../../lib/api'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const TYPES = ['coding', 'debugging', 'sql', 'mcq', 'system_design'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

function emptyCase(hidden: boolean): TestCase {
  return { input: '', expected_output: '', is_hidden: hidden }
}

export default function EditQuestionPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['questions', id],
    queryFn: () => questionsApi.get(id),
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<string | undefined>('')
  const [type, setType] = useState<CreateQuestionBody['type']>('coding')
  const [difficulty, setDifficulty] = useState<CreateQuestionBody['difficulty']>('medium')
  const [timeLimitMs, setTimeLimitMs] = useState(2000)
  const [memoryLimitMb, setMemoryLimitMb] = useState(256)
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [sampleCases, setSampleCases] = useState<TestCase[]>([emptyCase(false)])
  const [hiddenCases, setHiddenCases] = useState<TestCase[]>([emptyCase(true)])
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (data && !initialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(data.title)
      setDescription(data.description)
      setType(data.type as CreateQuestionBody['type'])
      setDifficulty(data.difficulty as CreateQuestionBody['difficulty'])
      setTimeLimitMs(data.time_limit_ms)
      setMemoryLimitMb(data.memory_limit_mb)
      setTags(data.tags ?? [])
      const sample = data.test_cases.filter((tc) => !tc.is_hidden)
      const hidden = data.test_cases.filter((tc) => tc.is_hidden)
      setSampleCases(sample.length > 0 ? sample : [emptyCase(false)])
      setHiddenCases(hidden.length > 0 ? hidden : [emptyCase(true)])
      setInitialized(true)
    }
  }, [data, initialized])

  const update = useMutation({
    mutationFn: (body: CreateQuestionBody) => questionsApi.update(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions'] })
      router.push('/dashboard/questions')
    },
  })

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  const removeTag = (tag: string) => setTags((prev) => prev.filter((t) => t !== tag))

  const updateCase = (
    list: TestCase[],
    setList: React.Dispatch<React.SetStateAction<TestCase[]>>,
    idx: number,
    field: keyof TestCase,
    value: string | boolean,
  ) => {
    setList(list.map((c, i) => (i === idx ? { ...c, [field]: value } : c)))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    update.mutate({
      title,
      description: description ?? '',
      type,
      difficulty,
      time_limit_ms: timeLimitMs,
      memory_limit_mb: memoryLimitMb,
      tags,
      test_cases: [...sampleCases, ...hiddenCases],
    })
  }

  if (isLoading) return <div className="p-8 text-brand-navy/40">Loading…</div>
  if (!data) return <div className="p-8 text-red-500">Question not found.</div>

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <Link href="/dashboard/questions" className="mb-1 block text-xs text-brand-navy/40 hover:text-brand-navy">
          ← Questions
        </Link>
        <h1 className="text-xl font-semibold text-brand-navy">Edit Question</h1>
      </div>

      <div className="p-8 max-w-3xl" data-color-mode="light">
        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Field label="Title">
              <input required value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="e.g. Two Sum" />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Type">
                <select value={type} onChange={(e) => setType(e.target.value as CreateQuestionBody['type'])} className="input">
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace('_', ' ')}</option>
                  ))}
                </select>
              </Field>
              <Field label="Difficulty">
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as CreateQuestionBody['difficulty'])} className="input capitalize">
                  {DIFFICULTIES.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Time Limit (ms)">
                <input type="number" min={100} value={timeLimitMs} onChange={(e) => setTimeLimitMs(Number(e.target.value))} className="input" />
              </Field>
              <Field label="Memory Limit (MB)">
                <input type="number" min={16} value={memoryLimitMb} onChange={(e) => setMemoryLimitMb(Number(e.target.value))} className="input" />
              </Field>
            </div>

            <Field label="Tags">
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                  placeholder="Add tag and press Enter"
                  className="input"
                />
                <button type="button" onClick={addTag} className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-navy hover:border-brand-navy transition-colors">
                  Add
                </button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-brand-navy-pale px-2.5 py-0.5 text-xs text-brand-navy">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-brand-navy/40 hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
              )}
            </Field>

            <Field label="Description (Markdown)">
              <MDEditor value={description} onChange={setDescription} height={300} preview="edit" />
            </Field>

            <TestCasesSection label="Sample Test Cases" cases={sampleCases} setCases={setSampleCases} isHidden={false} updateCase={updateCase} />
            <TestCasesSection label="Hidden Test Cases" cases={hiddenCases} setCases={setHiddenCases} isHidden={true} updateCase={updateCase} />

            {update.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{String(update.error)}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={update.isPending} className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors disabled:opacity-50">
                {update.isPending ? 'Saving…' : 'Save Changes'}
              </button>
              <button type="button" onClick={() => router.back()} className="rounded-lg border border-brand-border px-4 py-2 text-sm text-brand-navy hover:border-brand-navy transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function TestCasesSection({
  label, cases, setCases, isHidden, updateCase,
}: {
  label: string
  cases: TestCase[]
  setCases: React.Dispatch<React.SetStateAction<TestCase[]>>
  isHidden: boolean
  updateCase: (list: TestCase[], setList: React.Dispatch<React.SetStateAction<TestCase[]>>, idx: number, field: keyof TestCase, value: string | boolean) => void
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b border-brand-border pb-2">
        <label className="text-sm font-semibold uppercase tracking-wide text-brand-navy">{label}</label>
        <button
          type="button"
          onClick={() => setCases((prev) => [...prev, { input: '', expected_output: '', is_hidden: isHidden }])}
          className="text-xs font-medium text-brand-orange hover:text-brand-orange-light flex items-center gap-1"
        >
          + Add case
        </button>
      </div>
      <div className="space-y-3">
        {cases.map((tc, idx) => (
          <div key={idx} className="rounded-lg border border-brand-border bg-brand-surface p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-brand-navy/50">Case {idx + 1}</span>
              {cases.length > 1 && (
                <button type="button" onClick={() => setCases(cases.filter((_, i) => i !== idx))} className="text-xs text-red-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs font-medium text-brand-navy/50">Input</p>
                <textarea
                  value={tc.input}
                  onChange={(e) => updateCase(cases, setCases, idx, 'input', e.target.value)}
                  rows={3}
                  className="input resize-y font-mono text-xs"
                  placeholder="stdin input"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-brand-navy/50">Expected Output</p>
                <textarea
                  value={tc.expected_output}
                  onChange={(e) => updateCase(cases, setCases, idx, 'expected_output', e.target.value)}
                  rows={3}
                  className="input resize-y font-mono text-xs"
                  placeholder="expected stdout"
                />
              </div>
            </div>
          </div>
        ))}
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
