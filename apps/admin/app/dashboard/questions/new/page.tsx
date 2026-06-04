'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { Terminal, ListChecks, FileText, CheckCircle2, Trash2, AlertTriangle } from 'lucide-react'
import { questionsApi, type CreateQuestionBody, type TestCase, type McqOption } from '../../../../lib/api'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

type QuestionType = 'coding' | 'mcq' | 'text'
const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

const QUESTION_TYPES = [
  {
    value: 'coding' as const,
    title: 'Coding',
    desc: 'Code + test cases. Auto-scored.',
    Icon: Terminal,
  },
  {
    value: 'mcq' as const,
    title: 'MCQ',
    desc: 'Multiple choice. Auto-scored.',
    Icon: ListChecks,
  },
  {
    value: 'text' as const,
    title: 'Text',
    desc: 'Written answer. Manually scored.',
    Icon: FileText,
  },
]

function emptyCase(hidden: boolean): TestCase {
  return { input: '', expected_output: '', is_hidden: hidden }
}

function emptyOption(): McqOption {
  return { id: crypto.randomUUID(), text: '', is_correct: false }
}

export default function NewQuestionPage() {
  const router = useRouter()

  const [questionType, setQuestionType] = useState<QuestionType>('coding')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState<string | undefined>('')
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [timeLimitMs, setTimeLimitMs] = useState(2000)
  const [memoryLimitMb, setMemoryLimitMb] = useState(256)
  const [sampleCases, setSampleCases] = useState<TestCase[]>([emptyCase(false)])
  const [hiddenCases, setHiddenCases] = useState<TestCase[]>([emptyCase(true)])
  const [options, setOptions] = useState<McqOption[]>([emptyOption(), emptyOption()])
  const [mcqError, setMcqError] = useState<string | null>(null)

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

  const addOption = () => {
    if (options.length < 8) setOptions((prev) => [...prev, emptyOption()])
  }

  const removeOption = (id: string) => {
    if (options.length > 2) setOptions((prev) => prev.filter((o) => o.id !== id))
  }

  const setCorrectOption = (id: string) => {
    setOptions((prev) => prev.map((o) => ({ ...o, is_correct: o.id === id })))
    setMcqError(null)
  }

  const updateOptionText = (id: string, text: string) => {
    setOptions((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)))
  }

  const validateMcq = (): string | null => {
    if (options.length < 2) return 'Add at least 2 options.'
    if (options.some((o) => !o.text.trim())) return 'All options must have text.'
    if (!options.some((o) => o.is_correct)) return 'Mark one option as correct.'
    return null
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (questionType === 'mcq') {
      const err = validateMcq()
      if (err) { setMcqError(err); return }
      setMcqError(null)
    }

    const body: CreateQuestionBody = {
      title,
      description: description ?? '',
      type: questionType,
      difficulty,
      tags,
    }

    if (questionType === 'coding') {
      body.time_limit_ms = timeLimitMs
      body.memory_limit_mb = memoryLimitMb
      body.test_cases = [...sampleCases, ...hiddenCases]
    }

    if (questionType === 'mcq') {
      body.options = options
    }

    create.mutate(body)
  }

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5">
        <h1 className="text-xl font-semibold text-brand-navy">New Question</h1>
        <p className="mt-0.5 text-sm text-brand-navy/60">Add a question to the bank</p>
      </div>

      <div className="p-8 max-w-3xl" data-color-mode="light">
        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Question type selector */}
            <div>
              <p className="mb-2 text-sm font-medium text-brand-navy">Question Type</p>
              <div className="grid grid-cols-3 gap-3">
                {QUESTION_TYPES.map(({ value, title: typeTitle, desc, Icon }) => {
                  const selected = questionType === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setQuestionType(value)}
                      className={[
                        'rounded-xl p-4 text-left transition-all',
                        selected
                          ? 'border-2 border-brand-orange bg-brand-orange-pale/30'
                          : 'border border-brand-border bg-white hover:border-brand-navy/30',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon
                          size={18}
                          className={selected ? 'text-brand-orange' : 'text-brand-navy/40'}
                          aria-hidden="true"
                        />
                        {selected && (
                          <CheckCircle2 size={14} className="text-brand-orange" aria-hidden="true" />
                        )}
                      </div>
                      <p className="font-semibold text-sm text-brand-navy">{typeTitle}</p>
                      <p className="text-xs text-brand-navy/50 mt-0.5 leading-relaxed">{desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <Field label="Title">
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="e.g. Two Sum"
              />
            </Field>

            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="input capitalize"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d} className="capitalize">{d}</option>
                ))}
              </select>
            </Field>

            <Field label="Description (Markdown)">
              <MDEditor value={description} onChange={setDescription} height={200} preview="edit" />
            </Field>

            {/* Coding-specific fields */}
            {questionType === 'coding' && (
              <>
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
                      className="rounded-lg border border-brand-border px-3 py-1.5 text-sm text-brand-navy hover:border-brand-navy transition-colors"
                    >
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

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Time Limit (ms)">
                    <input type="number" min={100} value={timeLimitMs} onChange={(e) => setTimeLimitMs(Number(e.target.value))} className="input" />
                  </Field>
                  <Field label="Memory Limit (MB)">
                    <input type="number" min={16} value={memoryLimitMb} onChange={(e) => setMemoryLimitMb(Number(e.target.value))} className="input" />
                  </Field>
                </div>

                <TestCasesSection label="Sample Test Cases" cases={sampleCases} setCases={setSampleCases} isHidden={false} updateCase={updateCase} />
                <TestCasesSection label="Hidden Test Cases" cases={hiddenCases} setCases={setHiddenCases} isHidden={true} updateCase={updateCase} />
              </>
            )}

            {/* MCQ options */}
            {questionType === 'mcq' && (
              <div>
                <div className="mb-3 flex items-center justify-between border-b border-brand-border pb-2">
                  <label className="text-sm font-semibold uppercase tracking-wide text-brand-navy">Answer Options</label>
                  {options.length < 8 && (
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-xs font-medium text-brand-orange hover:text-brand-orange-light flex items-center gap-1 transition-colors"
                    >
                      + Add Option
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_option"
                        checked={opt.is_correct}
                        onChange={() => setCorrectOption(opt.id)}
                        aria-label="Mark as correct answer"
                        className="h-4 w-4 accent-brand-orange cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOptionText(opt.id, e.target.value)}
                        placeholder="Option text"
                        className="input flex-1"
                      />
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeOption(opt.id)}
                          aria-label="Remove option"
                          className="p-1 text-brand-navy/30 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-brand-navy/40">
                  Select the radio button next to the correct answer.
                </p>
                {mcqError && (
                  <p className="mt-2 text-xs text-red-500" role="alert">{mcqError}</p>
                )}
              </div>
            )}

            {/* Text question info box */}
            {questionType === 'text' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2.5 items-start">
                <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" aria-hidden="true" />
                <p className="text-sm text-amber-800">
                  Text questions require manual scoring by an admin after submission.
                </p>
              </div>
            )}

            {create.isError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600" role="alert">
                {String(create.error)}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={create.isPending}
                className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors disabled:opacity-50"
              >
                {create.isPending ? 'Creating…' : 'Create Question'}
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
