import { useEffect } from 'react'
import { LogOut } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useSyncStatus } from '../features/sync/useSyncStatus'
import { useTimerPersistence } from '../features/persistence/useTimerPersistence'

const SYNE:    React.CSSProperties = { fontFamily: "'Syne', sans-serif" }
const DM_SANS: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" }
const DM_MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }

const LANGUAGE_LABELS: Record<string, string> = {
  python:     'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  cpp:        'C++',
  java:       'Java',
  go:         'Go',
  rust:       'Rust',
  c:          'C',
  csharp:     'C#',
  ruby:       'Ruby',
  kotlin:     'Kotlin',
  swift:      'Swift',
}

const LANGUAGE_COLORS: Record<string, string> = {
  python:     '#3572A5',
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  cpp:        '#f34b7d',
  java:       '#b07219',
  go:         '#00ADD8',
  rust:       '#dea584',
  c:          '#555555',
  csharp:     '#178600',
  ruby:       '#701516',
  kotlin:     '#A97BFF',
  swift:      '#F05138',
}

const RING_R = 13
const RING_C = 2 * Math.PI * RING_R

function formatTime(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${String(h)}:${String(m).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  }
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function timerStroke(seconds: number): string {
  if (seconds < 60)  return '#f87171'
  if (seconds < 300) return '#DE5E1F'
  if (seconds < 600) return '#fcd34d'
  return '#ffffff'
}

function timerNumClass(seconds: number): string {
  if (seconds < 60)  return 'text-red-400'
  if (seconds < 300) return 'text-brand-orange'
  if (seconds < 600) return 'text-amber-300'
  return 'text-white'
}

function WamoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-label="SecureAssess">
      <path
        d="M2 4.5 L5.5 13.5 L9 7 L12.5 13.5 L16 4.5"
        stroke="white"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface TopBarProps {
  candidateName: string
  assessmentTitle?: string
  questionIndex: number
  totalQuestions: number
  timerSeconds: number
  timerTotalSeconds?: number
  sessionId: string | null
  onSubmit: () => void
  onExitClick?: () => void
  isExitLocked?: boolean
  isExitDialogOpen?: boolean
  mockMode?: boolean
  currentLanguage?: string
  questionType?: 'coding' | 'mcq' | 'text'
  // Legacy props kept for call-site compatibility
  onPrevQuestion?: () => void
  onNextQuestion?: () => void
  isSubmitting?: boolean
  sequentialMode?: boolean
  progressItems?: unknown[]
  hideSubmitButton?: boolean
}

export function TopBar({
  candidateName,
  assessmentTitle = 'Assessment',
  questionIndex,
  totalQuestions,
  timerSeconds,
  timerTotalSeconds = 3600,
  sessionId,
  onSubmit,
  onExitClick,
  isExitLocked = false,
  isExitDialogOpen: _isExitDialogOpen,
  mockMode = false,
  currentLanguage,
  questionType,
}: TopBarProps) {
  const { isOnline, pendingCount } = useSyncStatus()
  const isExpired = timerSeconds === 0

  useTimerPersistence({ sessionId, timerSeconds })

  useEffect(() => {
    if (isExpired) onSubmit()
  }, [isExpired, onSubmit])

  const ratio = timerTotalSeconds > 0 ? timerSeconds / timerTotalSeconds : 1
  const dashOffset = RING_C * (1 - ratio)
  const ringColor = timerStroke(timerSeconds)
  const initial = candidateName.trim().charAt(0).toUpperCase() || '?'

  let syncDot: string
  let syncText: string
  let syncTextClass: string
  if (!isOnline) {
    syncDot = 'bg-red-400'
    syncText = 'offline'
    syncTextClass = 'text-red-400/80'
  } else if (pendingCount > 0) {
    syncDot = 'bg-brand-orange animate-pulse'
    syncText = 'saving'
    syncTextClass = 'text-white/40'
  } else {
    syncDot = 'bg-green-400'
    syncText = 'saved'
    syncTextClass = 'text-white/40'
  }

  const showLanguage = questionType === 'coding' && currentLanguage
  const langLabel = currentLanguage ? (LANGUAGE_LABELS[currentLanguage] ?? currentLanguage) : null
  const langColor = currentLanguage ? (LANGUAGE_COLORS[currentLanguage] ?? '#888888') : null

  return (
    <Tooltip.Provider delayDuration={400}>
      <div
        className="flex h-[52px] shrink-0 items-center border-b border-white/8 bg-brand-navy px-5"
        role="banner"
      >
        {/* ── Left: logo + title ────────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <WamoMark />
          <span className="h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />
          <span
            className="truncate text-sm font-semibold text-white/80"
            style={SYNE}
            title={assessmentTitle}
          >
            {assessmentTitle}
          </span>
        </div>

        {/* ── Center: Q counter + language ──────────────────────────── */}
        <div className="flex items-center gap-3 px-6">
          <div className="flex items-center gap-1.5" style={DM_SANS}>
            <span className="text-[11px] font-semibold text-white/50">Q</span>
            <span className="text-sm font-bold text-white/80">{questionIndex}</span>
            <span className="text-[11px] text-white/30">of {totalQuestions}</span>
          </div>

          {showLanguage && (
            <>
              <span className="h-3 w-px bg-white/15" aria-hidden="true" />
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: langColor ?? undefined }}
                  aria-hidden="true"
                />
                <span
                  className="text-[11px] font-medium text-white/50"
                  style={DM_MONO}
                  aria-label={`Language: ${langLabel}`}
                >
                  {langLabel}
                </span>
              </div>
            </>
          )}

          {mockMode && (
            <>
              <span className="h-3 w-px bg-white/15" aria-hidden="true" />
              <span
                className="rounded-full border border-amber-400/40 bg-amber-400/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-300"
                style={DM_MONO}
              >
                Practice
              </span>
            </>
          )}
        </div>

        {/* ── Right: sync + timer + exit ────────────────────────────── */}
        <div className="flex flex-1 items-center justify-end gap-4">
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5" aria-label={`Sync: ${syncText}`}>
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${syncDot}`} aria-hidden="true" />
            <span className={`text-[10px] ${syncTextClass}`} style={DM_MONO}>
              {syncText}
            </span>
          </div>

          <span className="h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />

          {/* Timer */}
          {mockMode ? (
            <span
              className="text-[11px] font-medium text-amber-300/70"
              style={DM_MONO}
            >
              Practice Round
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative flex items-center justify-center">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  className="-rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx="16" cy="16" r={RING_R}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth="2.5"
                  />
                  <circle
                    cx="16" cy="16" r={RING_R}
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="2.5"
                    strokeDasharray={RING_C}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                  />
                </svg>
                <span
                  className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${timerNumClass(timerSeconds)}`}
                  style={{ ...SYNE, letterSpacing: '-0.01em' }}
                  aria-label={`Time remaining: ${formatTime(timerSeconds)}`}
                  aria-live="off"
                >
                  {formatTime(timerSeconds)}
                </span>
              </div>
              <span
                className="text-[9px] uppercase tracking-widest text-white/20"
                style={DM_MONO}
              >
                left
              </span>
            </div>
          )}

          <span className="h-4 w-px shrink-0 bg-white/15" aria-hidden="true" />

          {/* Candidate avatar */}
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <div
                className="flex h-7 w-7 shrink-0 cursor-default items-center justify-center rounded-full bg-brand-orange"
                aria-label={`Candidate: ${candidateName}`}
              >
                <span className="text-xs font-bold leading-none text-white" style={SYNE}>
                  {initial}
                </span>
              </div>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content
                side="bottom"
                sideOffset={6}
                className="rounded-lg bg-[#252535] px-2.5 py-1.5 text-xs text-white/70 shadow-lg"
                style={DM_SANS}
              >
                {candidateName}
                <Tooltip.Arrow className="fill-[#252535]" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>

          {/* Exit Assessment button */}
          {onExitClick && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  type="button"
                  onClick={onExitClick}
                  disabled={isExitLocked}
                  aria-label="Exit assessment"
                  className={[
                    'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                    isExitLocked
                      ? 'cursor-not-allowed border-white/5 text-white/15'
                      : 'border-red-400/20 text-red-400/50 hover:border-red-400/40 hover:bg-red-400/6 hover:text-red-400/80',
                  ].join(' ')}
                  style={DM_SANS}
                >
                  <LogOut size={12} aria-hidden="true" />
                  Exit
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  side="bottom"
                  sideOffset={6}
                  className="rounded-lg bg-[#252535] px-2.5 py-1.5 text-xs text-white/70 shadow-lg"
                  style={DM_SANS}
                >
                  {isExitLocked ? 'Cannot exit while code is running' : 'Exit assessment'}
                  <Tooltip.Arrow className="fill-[#252535]" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )}
        </div>
      </div>
    </Tooltip.Provider>
  )
}
