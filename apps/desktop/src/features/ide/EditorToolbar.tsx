import { useState, useEffect, useRef } from 'react'
import * as Select from '@radix-ui/react-select'
import * as Tooltip from '@radix-ui/react-tooltip'
import { ChevronDown, Loader2, PlayCircle, RotateCcw } from 'lucide-react'
import { cn, ConfirmDialog } from '@secureassess/ui'
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

const LANGUAGES = [
  { value: 'python',     label: 'Python',     color: '#3572A5' },
  { value: 'javascript', label: 'JavaScript', color: '#F7DF1E' },
  { value: 'typescript', label: 'TypeScript', color: '#3178C6' },
  { value: 'cpp',        label: 'C++',        color: '#f34b7d' },
  { value: 'java',       label: 'Java',       color: '#b07219' },
  { value: 'go',         label: 'Go',         color: '#00ADD8' },
] as const

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

  const currentLang = LANGUAGES.find((l) => l.value === language)

  return (
    <>
      <Tooltip.Provider delayDuration={400}>
        <div className="flex h-[38px] shrink-0 items-center gap-2 border-b border-[#383850] bg-[#262637] px-3">

          {/* Language selector */}
          <Select.Root value={language} onValueChange={(v) => onLanguageChange(v as Language)}>
            <Select.Trigger
              aria-label="Programming language"
              className="flex items-center gap-2 rounded-lg border border-[#383850] bg-transparent px-3 py-1 font-dm-mono text-xs text-[#CDD6F4]/60 outline-none transition-colors hover:border-[#CDD6F4]/20 hover:text-[#CDD6F4]"
            >
              {currentLang && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: currentLang.color }}
                  aria-hidden="true"
                />
              )}
              <Select.Value />
              <ChevronDown size={12} className="ml-1 text-[#CDD6F4]/30" aria-hidden="true" />
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className="z-50 overflow-hidden rounded-xl border border-[#383850] bg-[#1E1E2E] p-1 shadow-2xl"
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport>
                  {LANGUAGES.map((lang) => (
                    <Select.Item
                      key={lang.value}
                      value={lang.value}
                      className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 font-dm-mono text-xs text-[#CDD6F4]/60 outline-none transition-colors hover:bg-white/5 hover:text-[#CDD6F4] data-[highlighted]:bg-white/5 data-[highlighted]:text-[#CDD6F4] data-[state=checked]:text-brand-orange"
                    >
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: lang.color }}
                        aria-hidden="true"
                      />
                      <Select.ItemText>{lang.label}</Select.ItemText>
                    </Select.Item>
                  ))}
                </Select.Viewport>
              </Select.Content>
            </Select.Portal>
          </Select.Root>

          {/* Thin divider */}
          <span className="mx-1 h-4 w-px bg-[#383850]" aria-hidden="true" />

          {/* Font size controls */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.max(FONT_MIN, fontSize - 1))}
              disabled={fontSize <= FONT_MIN}
              aria-label="Decrease font size"
              className="rounded px-2 py-0.5 font-dm-mono text-xs text-[#CDD6F4]/35 transition-colors hover:bg-white/5 hover:text-[#CDD6F4]/70 disabled:opacity-30"
            >
              A-
            </button>
            <button
              type="button"
              onClick={() => onFontSizeChange(Math.min(FONT_MAX, fontSize + 1))}
              disabled={fontSize >= FONT_MAX}
              aria-label="Increase font size"
              className="rounded px-2 py-0.5 font-dm-mono text-[0.9375rem] text-[#CDD6F4]/35 transition-colors hover:bg-white/5 hover:text-[#CDD6F4]/70 disabled:opacity-30"
            >
              A+
            </button>
          </div>

          {/* Right group */}
          <div className="ml-auto flex items-center gap-2">

            {/* Reset */}
            {onResetCode && (
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <button
                    type="button"
                    onClick={() => setResetConfirmOpen(true)}
                    aria-label="Reset to template code"
                    className="flex h-6 w-6 items-center justify-center rounded text-[#CDD6F4]/30 transition-colors hover:text-[#CDD6F4]/70"
                  >
                    <RotateCcw size={14} aria-hidden="true" />
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="rounded-lg border border-[#383850] bg-[#1E1E2E] px-2.5 py-1.5 shadow-xl"
                    sideOffset={6}
                  >
                    <span className="font-dm-mono text-xs text-[#CDD6F4]/60">
                      Reset to template code
                    </span>
                    <Tooltip.Arrow className="fill-[#383850]" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            )}

            {/* Help / shortcuts */}
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  aria-label="Keyboard shortcuts"
                  className="flex h-6 w-6 items-center justify-center rounded font-dm-mono text-xs text-[#CDD6F4]/30 transition-colors hover:text-[#CDD6F4]/70"
                >
                  ?
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="rounded-xl border border-[#383850] bg-[#1E1E2E] p-3 shadow-xl"
                  sideOffset={6}
                  side="bottom"
                  align="end"
                >
                  <div className="space-y-1.5 font-dm-mono text-xs leading-6 text-[#CDD6F4]/60">
                    <div className="flex items-center justify-between gap-6">
                      <span>Run tests</span>
                      <div className="flex items-center gap-1">
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">⌘</kbd>
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">↵</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span>Submit</span>
                      <div className="flex items-center gap-1">
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">⌘</kbd>
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">⇧</kbd>
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">↵</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-6">
                      <span>Save</span>
                      <div className="flex items-center gap-1">
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">⌘</kbd>
                        <kbd className="rounded bg-[#383850] px-1.5 py-0.5 text-[10px] text-[#CDD6F4]">S</kbd>
                      </div>
                    </div>
                  </div>
                  <Tooltip.Arrow className="fill-[#383850]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>

            <span className="h-4 w-px bg-[#383850]" aria-hidden="true" />

            {/* Run Tests button */}
            <button
              type="button"
              onClick={onRun}
              disabled={isRunning}
              aria-label={isRunning ? 'Running tests…' : 'Run tests (⌘ Enter)'}
              className={cn(
                'flex items-center rounded-lg px-4 py-1.5 font-dm-sans text-sm font-medium text-white transition-colors disabled:opacity-50',
                passFlash ? 'bg-green-600' : 'bg-brand-orange hover:bg-brand-orange-light',
              )}
            >
              {isRunning ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" />
                  Running...
                </>
              ) : (
                <>
                  <PlayCircle size={14} className="mr-2" aria-hidden="true" />
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
    </>
  )
}
