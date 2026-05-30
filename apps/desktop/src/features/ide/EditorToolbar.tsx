import { LanguageSelector } from './LanguageSelector'
import type { Language } from './templates'

interface EditorToolbarProps {
  language: Language
  onLanguageChange: (lang: Language) => void
  onRun: () => void
  onSave: () => void
  isRunning: boolean
}

export function EditorToolbar({
  language,
  onLanguageChange,
  onRun,
  onSave,
  isRunning,
}: EditorToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-brand-navy-light bg-brand-navy px-3 py-1.5">
      <LanguageSelector value={language} onChange={onLanguageChange} />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          aria-label="Save code (Ctrl+S)"
          className="rounded-md border border-brand-navy-light px-3 py-1 text-xs text-white transition-colors hover:border-brand-orange focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
          Save
        </button>

        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          aria-label={isRunning ? 'Running tests…' : 'Run sample tests (Ctrl+Enter)'}
          className="flex items-center gap-1.5 rounded-md bg-brand-orange hover:bg-brand-orange-light px-3 py-1 text-xs font-medium text-white transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
          {isRunning ? (
            <>
              <svg
                className="h-3 w-3 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Running…
            </>
          ) : (
            'Run Tests'
          )}
        </button>
      </div>
    </div>
  )
}
