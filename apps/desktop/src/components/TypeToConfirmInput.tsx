import { useState } from 'react'

const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

interface TypeToConfirmInputProps {
  confirmWord: string
  onConfirmed: () => void
}

export function TypeToConfirmInput({ confirmWord, onConfirmed }: TypeToConfirmInputProps) {
  const [value, setValue] = useState('')
  const isMatch = value === confirmWord

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.toUpperCase()
    setValue(next)
    if (next === confirmWord) {
      onConfirmed()
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs text-brand-navy/60" style={DM_SANS}>
        Type{' '}
        <kbd className="rounded border border-brand-border bg-brand-surface px-1 py-0.5 text-[11px] font-medium">
          {confirmWord}
        </kbd>{' '}
        to confirm
      </p>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={confirmWord}
        aria-label={`Type ${confirmWord} to confirm`}
        className={[
          'w-full rounded-xl border px-3 py-2 text-sm uppercase tracking-widest outline-none transition-colors',
          'focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-1',
          isMatch
            ? 'border-red-400 bg-red-50 text-red-700'
            : 'border-brand-border bg-white text-brand-navy',
        ].join(' ')}
        style={DM_MONO}
      />
    </div>
  )
}
