import { useEffect, useState } from 'react'
import type { Language } from '../features/ide/templates'

export type SaveStatus = 'saved' | 'saving' | 'offline'

export interface StatusBarProps {
  language: Language
  line?: number
  col?: number
  saveStatus?: SaveStatus
  lastSavedAt?: Date | null
}

const LANG_DOT: Record<Language, string> = {
  python:     'bg-yellow-400',
  javascript: 'bg-yellow-300',
  typescript: 'bg-blue-400',
  cpp:        'bg-blue-600',
  c:          'bg-gray-400',
  csharp:     'bg-green-500',
  java:       'bg-orange-500',
  go:         'bg-cyan-400',
  rust:       'bg-orange-300',
  ruby:       'bg-red-500',
  kotlin:     'bg-purple-400',
  swift:      'bg-orange-400',
  php:        'bg-indigo-400',
  r:          'bg-sky-400',
  scala:      'bg-red-600',
  bash:       'bg-green-400',
  haskell:    'bg-purple-600',
  lua:        'bg-blue-900',
  perl:       'bg-indigo-600',
  elixir:     'bg-purple-500',
}

const LANG_LABEL: Record<Language, string> = {
  python:     'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp:        'C++',
  c:          'C',
  csharp:     'C#',
  java:       'Java',
  go:         'Go',
  rust:       'Rust',
  ruby:       'Ruby',
  kotlin:     'Kotlin',
  swift:      'Swift',
  php:        'PHP',
  r:          'R',
  scala:      'Scala',
  bash:       'Bash',
  haskell:    'Haskell',
  lua:        'Lua',
  perl:       'Perl',
  elixir:     'Elixir',
}

const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac')
const MOD = isMac ? '⌘' : 'Ctrl'
const SHORTCUTS = `${MOD}+↩ Run  ·  ${MOD}+S Save`

const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

export function StatusBar({
  language,
  line = 1,
  col = 1,
  saveStatus = 'saved',
  lastSavedAt,
}: StatusBarProps) {
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    if (!lastSavedAt || saveStatus !== 'saved') return
    const tick = () => {
      setSecondsAgo(Math.max(0, Math.floor((Date.now() - lastSavedAt.getTime()) / 1000)))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [lastSavedAt, saveStatus])

  let saveLabel: string
  if (saveStatus === 'saving') {
    saveLabel = 'Saving...'
  } else if (saveStatus === 'offline') {
    saveLabel = 'Queued — offline'
  } else {
    saveLabel = lastSavedAt ? `Saved ${secondsAgo}s ago` : 'Saved'
  }

  return (
    <div
      className="flex h-[22px] shrink-0 items-center gap-5 border-t border-white/5 bg-[#1A1A30] px-4"
      style={DM_MONO}
      aria-hidden="true"
    >
      {/* Left cluster: language dot + name + cursor position + encoding */}
      <div className="flex items-center gap-2">
        <span className={`h-1 w-1 shrink-0 rounded-full ${LANG_DOT[language]}`} />
        <span className="text-[11px] text-white/30">{LANG_LABEL[language]}</span>
        <span className="text-[11px] text-white/20">·</span>
        <span className="text-[11px] text-white/30">Ln {line}, Col {col}</span>
        <span className="text-[11px] text-white/20">·</span>
        <span className="text-[11px] text-white/30">UTF-8</span>
      </div>

      {/* Center: auto-save status */}
      <span className="text-[11px] text-white/30">{saveLabel}</span>

      {/* Right: keyboard shortcuts */}
      <span className="ml-auto text-[11px] text-white/25">{SHORTCUTS}</span>
    </div>
  )
}
