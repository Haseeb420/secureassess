'use client'

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useState } from 'react'
import { format } from 'date-fns'
import { questionsApi, type Question } from '../../../lib/api'

const col = createColumnHelper<Question>()

const DIFFICULTY_CLASSES: Record<Question['difficulty'], string> = {
  easy:   'bg-green-100 text-green-700',
  medium: 'bg-brand-orange-pale text-brand-orange',
  hard:   'bg-red-100 text-red-700',
}

const columns = [
  col.accessor('title', { header: 'Title' }),
  col.accessor('type', {
    header: 'Type',
    cell: (i) => <span className="capitalize">{i.getValue().replace('_', ' ')}</span>,
  }),
  col.accessor('difficulty', {
    header: 'Difficulty',
    cell: (i) => (
      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${DIFFICULTY_CLASSES[i.getValue()]}`}>
        {i.getValue()}
      </span>
    ),
  }),
  col.accessor('tags', {
    header: 'Tags',
    cell: (i) =>
      i.getValue().length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {i.getValue().map((tag) => (
            <span key={tag} className="rounded bg-brand-navy-pale px-1.5 py-0.5 text-xs text-brand-navy">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-brand-navy/30">—</span>
      ),
  }),
  col.accessor('created_at', {
    header: 'Created',
    cell: (i) => format(new Date(i.getValue()), 'MMM d, yyyy'),
  }),
  col.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => (
      <Link
        href={`/dashboard/questions/${row.original.id}`}
        className="text-sm font-medium text-brand-orange hover:text-brand-orange-light"
      >
        Edit
      </Link>
    ),
  }),
]

const TYPES = ['coding', 'debugging', 'sql', 'mcq', 'system_design']
const DIFFICULTIES = ['easy', 'medium', 'hard']

export default function QuestionsPage() {
  const [type, setType] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [tags, setTags] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: ['questions', { type, difficulty, tags }],
    queryFn: () => questionsApi.list({ type: type || undefined, difficulty: difficulty || undefined, tags: tags || undefined }),
  })

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })

  return (
    <div>
      <div className="border-b border-brand-border bg-white px-8 py-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-brand-navy">Question Bank</h1>
          <p className="mt-0.5 text-sm text-brand-navy/60">Manage coding questions</p>
        </div>
        <Link
          href="/dashboard/questions/new"
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
        >
          + New Question
        </Link>
      </div>

      <div className="p-8">
        <div className="mb-4 flex flex-wrap gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input w-44"
          >
            <option value="">All Types</option>
            {TYPES.map((t) => (
              <option key={t} value={t} className="capitalize">
                {t.replace('_', ' ')}
              </option>
            ))}
          </select>

          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="input w-40"
          >
            <option value="">All Difficulties</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d} className="capitalize">
                {d}
              </option>
            ))}
          </select>

          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Filter by tag…"
            className="input w-44"
          />

          {(type || difficulty || tags) && (
            <button
              type="button"
              onClick={() => { setType(''); setDifficulty(''); setTags('') }}
              className="text-sm text-brand-navy/40 hover:text-brand-navy"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-brand-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="border-b border-brand-border bg-brand-surface">
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-brand-navy/60">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-brand-navy/40">
                    Loading…
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-brand-navy/40">
                    No questions found.
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-brand-border hover:bg-brand-navy-pale transition-colors last:border-0">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 text-brand-navy">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
