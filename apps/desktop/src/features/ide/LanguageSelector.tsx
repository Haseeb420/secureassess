import type { Language } from './templates'

interface LanguageSelectorProps {
  value: Language
  onChange: (lang: Language) => void
}

const LANGUAGE_LABELS: Array<{ value: Language; label: string; color: string }> = [
  { value: 'python',     label: 'Python',     color: '#3572A5' },
  { value: 'javascript', label: 'JavaScript', color: '#F7DF1E' },
  { value: 'typescript', label: 'TypeScript', color: '#3178C6' },
  { value: 'java',       label: 'Java',       color: '#B07219' },
  { value: 'cpp',        label: 'C++',        color: '#00599C' },
  { value: 'c',          label: 'C',          color: '#555555' },
  { value: 'csharp',     label: 'C#',         color: '#239120' },
  { value: 'go',         label: 'Go',         color: '#00ADD8' },
  { value: 'rust',       label: 'Rust',       color: '#DEA584' },
  { value: 'ruby',       label: 'Ruby',       color: '#CC342D' },
  { value: 'kotlin',     label: 'Kotlin',     color: '#7F52FF' },
  { value: 'swift',      label: 'Swift',      color: '#FA7343' },
  { value: 'php',        label: 'PHP',        color: '#777BB4' },
  { value: 'scala',      label: 'Scala',      color: '#DC322F' },
  { value: 'r',          label: 'R',          color: '#198CE7' },
  { value: 'bash',       label: 'Bash',       color: '#4EAA25' },
  { value: 'haskell',    label: 'Haskell',    color: '#5D4F85' },
  { value: 'lua',        label: 'Lua',        color: '#000080' },
  { value: 'perl',       label: 'Perl',       color: '#39457E' },
  { value: 'elixir',     label: 'Elixir',     color: '#6E4A7E' },
]

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const current = LANGUAGE_LABELS.find((l) => l.value === value)

  return (
    <div className="relative flex items-center gap-1.5">
      {current && (
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: current.color }}
          aria-hidden="true"
        />
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Language)}
        aria-label="Programming language"
        className="appearance-none rounded-lg border border-brand-border bg-white py-1 pl-2 pr-6 text-sm text-brand-navy outline-none transition-colors hover:border-brand-navy focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20"
      >
        {LANGUAGE_LABELS.map((lang) => (
          <option key={lang.value} value={lang.value}>
            {lang.label}
          </option>
        ))}
      </select>
      {/* Custom dropdown arrow */}
      <svg
        className="pointer-events-none absolute right-2 h-3 w-3 text-brand-navy/40"
        viewBox="0 0 12 12"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M6 8L1 3h10L6 8z" />
      </svg>
    </div>
  )
}
