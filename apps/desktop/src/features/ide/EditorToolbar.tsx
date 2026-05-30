import { useState } from 'react'
import { Loader2, PlayCircle, RotateCcw } from 'lucide-react'
import { ConfirmDialog } from '@secureassess/ui'
import { LanguageSelector } from './LanguageSelector'
import type { Language } from './templates'

interface EditorToolbarProps {
  language: Language
  onLanguageChange: (lang: Language) => void
  onRun: () => void
  onSave: () => void
  onResetCode?: () => void
  isRunning: boolean
  fontSize: number
  onFontSizeChange: (size: number) => void
}

const FONT_MIN = 12
const FONT_MAX = 20

export function EditorToolbar({
  language,
  onLanguageChange,
  onRun,
  onResetCode,
  isRunning,
  fontSize,
  onFontSizeChange,
}: EditorToolbarProps) {
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [shortcutsVisible, setShortcutsVisible] = useState(false)

  return (
    <>
      <div className="flex h-[36px] shrink-0 items-center gap-2 border-b border-brand-border bg-brand-surface px-3">
        {/* Left group */}
        <LanguageSelector value={language} onChange={onLanguageChange} />

        <span className="h-4 w-px bg-brand-border" aria-hidden="true" />

        {/* Font size */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.max(FONT_MIN, fontSize - 1))}
            disabled={fontSize <= FONT_MIN}
            aria-label="Decrease font size"
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-brand-navy/50 hover:bg-brand-border hover:text-brand-navy disabled:opacity-30 transition-colors"
          >
            A-
          </button>
          <button
            type="button"
            onClick={() => onFontSizeChange(Math.min(FONT_MAX, fontSize + 1))}
            disabled={fontSize >= FONT_MAX}
            aria-label="Increase font size"
            className="flex h-6 w-6 items-center justify-center rounded text-xs text-brand-navy/50 hover:bg-brand-border hover:text-brand-navy disabled:opacity-30 transition-colors"
            style={{ fontSize: '0.9375rem' }}
          >
            A+
          </button>
        </div>

        {/* Right group */}
        <div className="ml-auto flex items-center gap-2">
          {/* Reset code */}
          {onResetCode && (
            <button
              type="button"
              onClick={() => setResetConfirmOpen(true)}
              aria-label="Reset code to template"
              title="Reset to template"
              className="flex h-6 w-6 items-center justify-center rounded text-brand-navy/40 hover:bg-brand-border hover:text-brand-navy transition-colors"
            >
              <RotateCcw size={13} />
            </button>
          )}

          {/* Keyboard shortcuts hint */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShortcutsVisible((v) => !v)}
              aria-label="Keyboard shortcuts"
              className="flex h-6 w-6 items-center justify-center rounded text-xs font-medium text-brand-navy/40 hover:bg-brand-border hover:text-brand-navy transition-colors"
            >
              ?
            </button>
            {shortcutsVisible && (
              <div
                className="absolute right-0 top-8 z-10 w-52 rounded-xl border border-brand-border bg-white p-3 shadow-lg text-xs text-brand-navy/70 space-y-1.5"
                role="tooltip"
              >
                <div className="flex justify-between">
                  <span>Run tests</span>
                  <kbd className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-brand-navy">⌘ Enter</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Save</span>
                  <kbd className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-brand-navy">⌘ S</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Undo</span>
                  <kbd className="rounded bg-brand-surface px-1.5 py-0.5 font-mono text-brand-navy">⌘ Z</kbd>
                </div>
              </div>
            )}
          </div>

          <span className="h-4 w-px bg-brand-border" aria-hidden="true" />

          {/* Run tests */}
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning}
            aria-label={isRunning ? 'Running tests…' : 'Run tests (⌘ Enter)'}
            className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brand-orange-light disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Loader2 size={13} className="animate-spin" aria-hidden="true" />
                Running…
              </>
            ) : (
              <>
                <PlayCircle size={13} aria-hidden="true" />
                Run Tests
              </>
            )}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset to template?"
        description="This will clear your current code and restore the starter template. This cannot be undone."
        confirmLabel="Reset"
        cancelLabel="Keep code"
        variant="danger"
        onConfirm={() => { setResetConfirmOpen(false); onResetCode?.() }}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </>
  )
}
