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

const DIFFICULTY_COLORS: Record<Question['difficulty'], string> = {
  easy: 'text-green-400',
  medium: 'text-yellow-400',
  hard: 'text-red-400',
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
      <span className={`capitalize font-medium ${DIFFICULTY_COLORS[i.getValue()]}`}>
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
            <span key={tag} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-400">
              {tag}
            </span>
          ))}
        </div>
      ) : (
        <span className="text-zinc-600">—</span>
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
        className="text-sm text-blue-400 hover:underline"
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
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Question Bank</h1>
        <Link
          href="/dashboard/questions/new"
          className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 hover:opacity-90"
        >
          + New Question
        </Link>
      </div>

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
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="px-4 py-3 text-left font-medium">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  Loading…
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-zinc-500">
                  No questions found.
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-900/50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 text-zinc-200">
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
  )
}
