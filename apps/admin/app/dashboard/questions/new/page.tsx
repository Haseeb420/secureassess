'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { questionsApi, type CreateQuestionBody, type TestCase } from '../../../../lib/api'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const TYPES = ['coding', 'debugging', 'sql', 'mcq', 'system_design'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

function emptyCase(hidden: boolean): TestCase {
  return { input: '', expected_output: '', is_hidden: hidden }
}

export default function NewQuestionPage() {
  const router = useRouter()

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

  const create = useMutation({
    mutationFn: (body: CreateQuestionBody) => questionsApi.create(body),
    onSuccess: () => router.push('/dashboard/questions'),
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
    create.mutate({
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

  return (
    <div className="p-6 max-w-3xl" data-color-mode="dark">
      <h1 className="mb-6 text-xl font-semibold">New Question</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Title">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="e.g. Two Sum"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as CreateQuestionBody['type'])}
              className="input"
            >
              {TYPES.map((t) => (
                <option key={t} value={t} className="capitalize">
                  {t.replace('_', ' ')}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Difficulty">
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as CreateQuestionBody['difficulty'])}
              className="input capitalize"
            >
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d} className="capitalize">
                  {d}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Time Limit (ms)">
            <input
              type="number"
              min={100}
              value={timeLimitMs}
              onChange={(e) => setTimeLimitMs(Number(e.target.value))}
              className="input"
            />
          </Field>
          <Field label="Memory Limit (MB)">
            <input
              type="number"
              min={16}
              value={memoryLimitMb}
              onChange={(e) => setMemoryLimitMb(Number(e.target.value))}
              className="input"
            />
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
            <button
              type="button"
              onClick={addTag}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 text-zinc-500 hover:text-zinc-200">×</button>
                </span>
              ))}
            </div>
          )}
        </Field>

        <Field label="Description (Markdown)">
          <MDEditor
            value={description}
            onChange={setDescription}
            height={300}
            preview="edit"
          />
        </Field>

        <TestCasesSection
          label="Sample Test Cases"
          cases={sampleCases}
          setCases={setSampleCases}
          isHidden={false}
          updateCase={updateCase}
        />

        <TestCasesSection
          label="Hidden Test Cases"
          cases={hiddenCases}
          setCases={setHiddenCases}
          isHidden={true}
          updateCase={updateCase}
        />

        {create.isError && (
          <p className="text-sm text-red-400">{String(create.error)}</p>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create Question'}
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

function TestCasesSection({
  label,
  cases,
  setCases,
  isHidden,
  updateCase,
}: {
  label: string
  cases: TestCase[]
  setCases: React.Dispatch<React.SetStateAction<TestCase[]>>
  isHidden: boolean
  updateCase: (
    list: TestCase[],
    setList: React.Dispatch<React.SetStateAction<TestCase[]>>,
    idx: number,
    field: keyof TestCase,
    value: string | boolean,
  ) => void
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-300">{label}</label>
        <button
          type="button"
          onClick={() => setCases((prev) => [...prev, { input: '', expected_output: '', is_hidden: isHidden }])}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          + Add case
        </button>
      </div>
      <div className="space-y-3">
        {cases.map((tc, idx) => (
          <div key={idx} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-zinc-500">Case {idx + 1}</span>
              {cases.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCases(cases.filter((_, i) => i !== idx))}
                  className="text-xs text-zinc-600 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="mb-1 text-xs text-zinc-500">Input</p>
                <textarea
                  value={tc.input}
                  onChange={(e) => updateCase(cases, setCases, idx, 'input', e.target.value)}
                  rows={3}
                  className="input resize-y font-mono text-xs"
                  placeholder="stdin input"
                />
              </div>
              <div>
                <p className="mb-1 text-xs text-zinc-500">Expected Output</p>
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
      <label className="mb-1.5 block text-sm font-medium text-zinc-300">{label}</label>
      {children}
    </div>
  )
}
