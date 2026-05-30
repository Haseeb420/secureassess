import type { Language } from './templates'

interface LanguageSelectorProps {
  value: Language
  onChange: (lang: Language) => void
}

const LANGUAGE_LABELS: Array<{ value: Language; label: string }> = [
  { value: 'cpp', label: 'C++' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'go', label: 'Go' },
]

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Language)}
      aria-label="Programming language"
      className="rounded-md border border-brand-navy-light bg-brand-navy-mid px-2 py-1 text-sm text-white outline-none focus:ring-2 focus:ring-brand-orange"
    >
      {LANGUAGE_LABELS.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  )
}
