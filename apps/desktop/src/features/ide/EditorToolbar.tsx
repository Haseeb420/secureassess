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
    <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5">
      <LanguageSelector value={language} onChange={onLanguageChange} />

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onSave}
          className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
        >
          Save
        </button>

        <button
          type="button"
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
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
