import { useState, useEffect, useRef } from 'react'
import * as Select from '@radix-ui/react-select'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Check, ChevronDown, ChevronUp, HelpCircle, Loader2, PlayCircle, RotateCcw } from 'lucide-react'
import { cn, ConfirmDialog } from '@secureassess/ui'
import type { Language } from './templates'
import { IdeGuideModal } from './IdeGuideModal'

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

// All languages supported by the Judge0 Extra CE instance, sorted alphabetically.
const LANGUAGES: Array<{ value: Language; label: string; color: string }> = [
  { value: 'bash',       label: 'Bash',       color: '#4EAA25' },
  { value: 'c',          label: 'C',          color: '#7B8DB0' },
  { value: 'csharp',     label: 'C#',         color: '#239120' },
  { value: 'cpp',        label: 'C++',        color: '#00599C' },
  { value: 'elixir',     label: 'Elixir',     color: '#6E4A7E' },
  { value: 'go',         label: 'Go',         color: '#00ADD8' },
  { value: 'haskell',    label: 'Haskell',    color: '#5D4F85' },
  { value: 'java',       label: 'Java',       color: '#B07219' },
  { value: 'javascript', label: 'JavaScript', color: '#F7DF1E' },
  { value: 'kotlin',     label: 'Kotlin',     color: '#7F52FF' },
  { value: 'lua',        label: 'Lua',        color: '#6B8CC3' },
  { value: 'perl',       label: 'Perl',       color: '#39457E' },
  { value: 'php',        label: 'PHP',        color: '#777BB4' },
  { value: 'python',     label: 'Python',     color: '#3572A5' },
  { value: 'r',          label: 'R',          color: '#198CE7' },
  { value: 'ruby',       label: 'Ruby',       color: '#CC342D' },
  { value: 'rust',       label: 'Rust',       color: '#DEA584' },
  { value: 'scala',      label: 'Scala',      color: '#DC322F' },
  { value: 'swift',      label: 'Swift',      color: '#FA7343' },
  { value: 'typescript', label: 'TypeScript', color: '#3178C6' },
]

const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', system-ui, sans-serif" }
const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" }

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
  const [guideOpen, setGuideOpen] = useState(false)
  const [passFlash, setPassFlash] = useState(false)
  const prevRunningRef = useRef(false)

  useEffect(() => {
    const wasRunning = prevRunningRef.current
    prevRunningRef.current = isRunning
    if (wasRunning && !isRunning) {
      setPassFlash(true)
      const timer = setTimeout(() => setPassFlash(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isRunning])

  return (
    <>
      <Tooltip.Provider delayDuration={400}>
        <div className="flex h-[42px] shrink-0 items-center gap-0 border-b border-[#383850] bg-[#1E1E30] px-2">

          {/* Language selector dropdown */}
          <div className="flex flex-1 items-center pl-1">
            <Select.Root value={language} onValueChange={(val) => onLanguageChange(val as Language)}>
              <Select.Trigger
                aria-label="Programming language"
                className={cn(
                  'flex items-center gap-2 rounded-md border border-[#383850] px-2.5 py-1 text-[11px] font-semibold',
                  'text-[#CDD6F4]/80 transition-colors hover:border-[#505070] hover:text-[#CDD6F4]',
                  'outline-none focus-visible:ring-1 focus-visible:ring-brand-orange/50',
                  'min-w-[120px] justify-between select-none',
                )}
                style={DM_MONO}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: LANGUAGES.find((l) => l.value === language)?.color }}
                    aria-hidden="true"
                  />
                  <Select.Value />
                </span>
                <Select.Icon asChild>
                  <ChevronDown size={10} className="shrink-0 text-[#CDD6F4]/40" aria-hidden="true" />
                </Select.Icon>
              </Select.Trigger>

              <Select.Portal>
                <Select.Content
                  className="z-50 min-w-[160px] overflow-hidden rounded-lg border border-[#383850] bg-[#1A1A2E] shadow-2xl"
                  position="popper"
                  sideOffset={5}
                  align="start"
                >
                  <Select.ScrollUpButton className="flex cursor-default items-center justify-center py-1.5 text-[#CDD6F4]/30">
                    <ChevronUp size={12} aria-hidden="true" />
                  </Select.ScrollUpButton>

                  <Select.Viewport className="max-h-64 p-1">
                    {LANGUAGES.map((lang) => (
                      <Select.Item
                        key={lang.value}
                        value={lang.value}
                        className={cn(
                          'flex cursor-default items-center gap-2 rounded px-2.5 py-1.5 text-[11px]',
                          'text-[#CDD6F4]/60 outline-none select-none',
                          'data-[highlighted]:bg-white/5 data-[highlighted]:text-[#CDD6F4]',
                          'data-[state=checked]:text-brand-orange',
                        )}
                        style={DM_MONO}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: lang.color }}
                          aria-hidden="true"
                        />
                        <Select.ItemText>{lang.label}</Select.ItemText>
                        <Select.ItemIndicator className="ml-auto">
                          <Check size={10} className="text-brand-orange" aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>

                  <Select.ScrollDownButton className="flex cursor-default items-center justify-center py-1.5 text-[#CDD6F4]/30">
                    <ChevronDown size={12} aria-hidden="true" />
                  </Select.ScrollDownButton>
                </Select.Content>
              </Select.Portal>
            </Select.Root>
          </div>

          {/* Fixed right section */}
          <div className="flex shrink-0 items-center gap-1.5 border-l border-[#383850] pl-2">

            {/* Font size controls */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => onFontSizeChange(Math.max(FONT_MIN, fontSize - 1))}
                disabled={fontSize <= FONT_MIN}
                aria-label="Decrease font size"
                className="rounded px-1.5 py-0.5 text-xs text-[#CDD6F4]/30 transition-colors hover:bg-white/5 hover:text-[#CDD6F4]/70 disabled:opacity-25"
                style={DM_MONO}
              >
                A-
              </button>
              <span className="min-w-[28px] text-center text-[10px] text-[#CDD6F4]/25" style={DM_MONO}>
                {fontSize}
              </span>
              <button
                type="button"
                onClick={() => onFontSizeChange(Math.min(FONT_MAX, fontSize + 1))}
                disabled={fontSize >= FONT_MAX}
                aria-label="Increase font size"
                className="rounded px-1.5 py-0.5 text-[0.9375rem] text-[#CDD6F4]/30 transition-colors hover:bg-white/5 hover:text-[#CDD6F4]/70 disabled:opacity-25"
                style={DM_MONO}
              >
                A+
              </button>
            </div>

            <span className="h-4 w-px bg-[#383850]" aria-hidden="true" />

            {/* Reset */}
            {onResetCode && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setResetConfirmOpen(true)}
                    aria-label="Reset to template code"
                    className="flex h-6 w-6 items-center justify-center rounded text-[#CDD6F4]/25 transition-colors hover:text-[#CDD6F4]/65"
                  >
                    <RotateCcw size={13} aria-hidden="true" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-lg border border-[#383850] bg-[#1E1E2E] px-2.5 py-1.5 shadow-xl"
                    sideOffset={6}
                  >
                    <span className="text-xs text-[#CDD6F4]/60" style={DM_MONO}>Reset to template</span>
                    <Tooltip.Arrow className="fill-[#383850]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}

            {/* Guide */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={() => setGuideOpen(true)}
                  aria-label="Open assessment guide"
                  className="flex h-6 w-6 items-center justify-center rounded text-[#CDD6F4]/25 transition-colors hover:text-[#CDD6F4]/65"
                >
                  <HelpCircle size={13} aria-hidden="true" />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="rounded-lg border border-[#383850] bg-[#1E1E2E] px-2.5 py-1.5 shadow-xl"
                  sideOffset={6}
                  side="bottom"
                  align="end"
                >
                  <span className="text-xs text-[#CDD6F4]/60" style={DM_MONO}>I/O guide & shortcuts</span>
                  <Tooltip.Arrow className="fill-[#383850]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <span className="h-4 w-px bg-[#383850]" aria-hidden="true" />

            {/* Run Tests */}
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning}
              aria-label={isRunning ? 'Running tests…' : 'Run tests (⌘ Enter)'}
              className={cn(
                'flex items-center rounded-lg px-3.5 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:opacity-50',
                passFlash ? 'bg-green-600' : 'bg-brand-orange hover:bg-brand-orange-light',
              )}
              style={DM_SANS}
            >
              {isRunning ? (
                <>
                  <Loader2 size={12} className="mr-1.5 animate-spin" aria-hidden="true" />
                  Running…
                </>
              ) : (
                <>
                  <PlayCircle size={12} className="mr-1.5" aria-hidden="true" />
                  Run Tests
                </>
              )}
            </button>
          </div>
        </div>
      </Tooltip.Provider>

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

      <IdeGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </>
  )
}
