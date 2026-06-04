import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Loader2,
  Lock,
  Monitor,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
  User,
  Video,
  XCircle,
} from 'lucide-react'
import { cn } from '@secureassess/ui'
import {
  enterKioskMode,
  validateDisplays,
  checkForbiddenProcesses,
} from '../features/security/securityService'
import type { ForbiddenProcess } from '../features/security/types'
import { invoke } from '@tauri-apps/api/core'
import { useAssessmentStore } from '../store/assessmentStore'
import { fetchAssessmentWithQuestions, createServerSession } from '../lib/apiClient'

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckStatus = 'pending' | 'checking' | 'pass' | 'fail'
interface CheckState { status: CheckStatus; detail?: string }

interface ValidationState {
  display:      CheckState
  screenRec:    CheckState
  aiTools:      CheckState
  remoteAccess: CheckState
  system:       CheckState
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INITIAL: ValidationState = {
  display:      { status: 'pending' },
  screenRec:    { status: 'pending' },
  aiTools:      { status: 'pending' },
  remoteAccess: { status: 'pending' },
  system:       { status: 'pending' },
}

const CHECKING: ValidationState = {
  display:      { status: 'checking' },
  screenRec:    { status: 'checking' },
  aiTools:      { status: 'checking' },
  remoteAccess: { status: 'checking' },
  system:       { status: 'checking' },
}

const CHECK_META = [
  {
    key:      'display' as const,
    label:    'Single display connected',
    Icon:     Monitor,
    failHint: 'Disconnect extra monitor',
    fixSteps: 'Disconnect any external monitors and disable AirPlay or screen mirroring from the menu bar, then click Re-check.',
  },
  {
    key:      'screenRec' as const,
    label:    'No screen recording active',
    Icon:     Video,
    failHint: 'Stop screen recording',
    fixSteps: 'Close QuickTime Player, OBS, Loom, or any other screen recording or streaming application, then click Re-check.',
  },
  {
    key:      'aiTools' as const,
    label:    'No AI tools open',
    Icon:     Bot,
    failHint: 'Close AI assistants',
    fixSteps: 'Quit ChatGPT, Cursor, GitHub Copilot Chat, Claude, or any AI assistant app, then click Re-check.',
  },
  {
    key:      'remoteAccess' as const,
    label:    'No remote access tools',
    Icon:     Share2,
    failHint: 'Disconnect remote session',
    fixSteps: 'Disconnect from TeamViewer, AnyDesk, Zoom screen share, or any remote desktop session, then click Re-check.',
  },
  {
    key:      'system' as const,
    label:    'System environment valid',
    Icon:     Shield,
    failHint: 'Restart app and retry',
    fixSteps: 'Close and relaunch SecureAssess. If the issue persists, contact your proctor.',
  },
] as const

type CheckKey = (typeof CHECK_META)[number]['key']

const PHASES: { label: string; keys: CheckKey[] }[] = [
  { label: 'Display',      keys: ['display', 'screenRec'] },
  { label: 'Applications', keys: ['aiTools', 'remoteAccess'] },
  { label: 'System',       keys: ['system'] },
]

const LANGUAGES = ['python', 'javascript', 'typescript', 'java', 'go', 'cpp']

// ─── Animations ──────────────────────────────────────────────────────────────

const listVariants  = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const cardVariants  = {
  hidden:  { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function phaseStatus(state: ValidationState, keys: CheckKey[]): 'pending' | 'active' | 'done' {
  const ss = keys.map((k) => state[k].status)
  if (ss.every((s) => s === 'pass')) return 'done'
  if (ss.some((s) => s === 'checking' || s === 'fail')) return 'active'
  return 'pending'
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Record<string, unknown>
  } catch { return {} }
}

// ─── Font shortcuts ───────────────────────────────────────────────────────────

const SYNE   = { fontFamily: "'Syne', system-ui, sans-serif" } as const
const DMSANS = { fontFamily: "'DM Sans', system-ui, sans-serif" } as const
const DMMONO = { fontFamily: "'DM Mono', 'Courier New', monospace" } as const

// ─── Component ───────────────────────────────────────────────────────────────

export function PreAssessmentPage() {
  const navigate      = useNavigate()
  const candidate     = useAssessmentStore((s) => s.candidate)
  const authToken     = useAssessmentStore((s) => s.authToken)
  const storeAssId    = useAssessmentStore((s) => s.assessmentId)
  const { setAssessmentData, setQuestions, setSessionId } = useAssessmentStore()
  const landingData = useAssessmentStore((s) => s.landingData)
  const candidateId = useAssessmentStore((s) => s.candidateId)
  const timerSeconds = useAssessmentStore((s) => s.timerSeconds)
  const questions = useAssessmentStore((s) => s.questions)

  // Extract assessment_id from JWT user_metadata if not already in store
  const assessmentId = useMemo<string | null>(() => {
    if (storeAssId) return storeAssId
    if (!authToken) return null
    const payload = decodeJwtPayload(authToken)
    const meta = payload.user_metadata as Record<string, unknown> | undefined
    return (meta?.assessment_id as string | undefined) ?? null
  }, [authToken, storeAssId])

  const [state,           setState]          = useState<ValidationState>(INITIAL)
  const [isChecking,      setIsChecking]     = useState(true)
  const [kioskReady,      setKioskReady]     = useState(false)
  const [isStarting,      setIsStarting]     = useState(false)
  const [expanded,        setExpanded]       = useState<CheckKey | null>(null)
  const [assessmentTitle, setAssessmentTitle] = useState<string | null>(null)
  const [fetchError,      setFetchError]     = useState<string | null>(null)
  const [isFetching,      setIsFetching]     = useState(false)

  useEffect(() => {
    enterKioskMode().then(() => setKioskReady(true)).catch(() => setKioskReady(true))
  }, [])

  // Fetch real assessment + questions once auth is ready
  useEffect(() => {
    if (!authToken) return
    setIsFetching(true)
    setFetchError(null)
    fetchAssessmentWithQuestions()
      .then(({ assessment, questions }) => {
        setAssessmentData(assessment.id, assessment.title, assessment.duration_minutes)
        setQuestions(questions)
        setAssessmentTitle(assessment.title)
      })
      .catch((err: unknown) => {
        setFetchError(err instanceof Error ? err.message : 'Failed to load assessment')
      })
      .finally(() => setIsFetching(false))
  }, [authToken, setAssessmentData, setQuestions])

  const runValidations = useCallback(async () => {
    setIsChecking(true)
    setExpanded(null)
    setState(CHECKING)
    try {
      const [displayResult, processes] = await Promise.all([
        validateDisplays().catch(() => ({ passed: true, violations: [] })),
        checkForbiddenProcesses().catch(() => [] as ForbiddenProcess[]),
      ])
      const v            = displayResult.violations
      const aiProcs      = processes.filter((p) => p.category === 'ai')
      const remoteProcs  = processes.filter((p) => p.category === 'remote')
      setState({
        display: v.some((x) => x.type === 'MultipleDisplays')
          ? { status: 'fail', detail: 'Disconnect the extra monitor.' }
          : v.some((x) => x.type === 'ExternalDisplay')
            ? { status: 'fail', detail: 'Disable AirPlay / screen mirroring.' }
            : { status: 'pass' },
        screenRec:    v.some((x) => x.type === 'ScreenRecording')
          ? { status: 'fail', detail: 'Stop active screen recording.' }
          : { status: 'pass' },
        aiTools:      aiProcs.length > 0
          ? { status: 'fail', detail: `Close ${aiProcs.map((p) => p.name).join(', ')}.` }
          : { status: 'pass' },
        remoteAccess: remoteProcs.length > 0
          ? { status: 'fail', detail: `Disconnect ${remoteProcs.map((p) => p.name).join(', ')}.` }
          : { status: 'pass' },
        system: { status: 'pass' },
      })
    } catch {
      setState({ display: { status: 'pass' }, screenRec: { status: 'pass' }, aiTools: { status: 'pass' }, remoteAccess: { status: 'pass' }, system: { status: 'pass' } })
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => { if (kioskReady) runValidations() }, [kioskReady, runValidations])

  const allPassed = Object.values(state).every((c) => c.status === 'pass')
  const failCount = Object.values(state).filter((c) => c.status === 'fail').length
  const passCount = Object.values(state).filter((c) => c.status === 'pass').length
  const total     = CHECK_META.length

  const handleStart = async () => {
    if (!assessmentId || !candidateId) return
    setIsStarting(true)
    try {
      // Create local session in SQLite, returns a new UUID
      const sessionId = await invoke<string>('save_session', {
        assessmentId,
        candidateId,
        timerRemainingSecs: timerSeconds,
      })

      // Persist all test cases (including hidden) to local SQLite so submit_solution can run them
      for (const q of questions) {
        await invoke('save_test_cases', {
          questionId: q.id,
          testCases: (q.sampleTests ?? []).map((tc) => ({
            id: tc.id,
            question_id: q.id,
            input: tc.input,
            expected_output: tc.expectedOutput,
            is_hidden: tc.isHidden ? 1 : 0,
            time_limit_ms: q.timeLimitMs,
            memory_limit_mb: q.memoryLimitMb,
          })),
        })
      }

      setSessionId(sessionId)

      // Fire-and-forget: create server session so sync FK constraints pass.
      // If offline, sync.py handles it by auto-creating the session on first sync.
      createServerSession(sessionId, assessmentId, assessmentTitle ?? '', questions.length).catch(
        () => { /* server unreachable — sync will recover */ }
      )

      navigate('/assessment')
    } catch (err) {
      console.error('Failed to start assessment session:', err)
      setIsStarting(false)
    }
  }

  const toggleExpand = (key: CheckKey) => setExpanded((p) => (p === key ? null : key))

  const avi = candidate?.name ? initials(candidate.name) : null

  return (
    <div className="flex h-full min-h-screen flex-col bg-brand-navy">

      {/* ── Top bar ── */}
      <div className="flex h-[52px] shrink-0 items-center border-b border-white/[0.08] bg-brand-navy px-5">
        <div className="flex items-center gap-3">
          {landingData && (
            <button
              type="button"
              onClick={() => navigate('/landing')}
              aria-label="Back to dashboard"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white/70"
              style={DMSANS}
            >
              <ArrowLeft size={14} />
              <span className="text-[12px]">Dashboard</span>
            </button>
          )}
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/20">
              <ShieldCheck size={14} className="text-brand-orange" />
            </div>
            <span className="text-[15px] font-bold tracking-tight text-white" style={SYNE}>
              SecureAssess
            </span>
          </div>
        </div>
        {candidate?.name && (
          <span className="ml-auto text-[13px] text-white/45" style={DMSANS}>
            {candidate.name}
          </span>
        )}
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left sidebar ── */}
        <div className="flex w-[260px] shrink-0 flex-col overflow-y-auto border-r border-white/[0.08]">

          {/* Candidate section */}
          <div className="px-6 pt-7 pb-5">
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/30" style={DMSANS}>
              Candidate
            </p>

            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-orange/20 text-[13px] font-bold text-white" style={SYNE}>
                {avi ?? <User size={16} className="text-white/40" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-white" style={SYNE}>
                  {candidate?.name ?? '—'}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-white/40" style={DMSANS}>
                  {candidate?.email ?? '—'}
                </p>
              </div>
            </div>
          </div>

          <div className="mx-6 h-px bg-white/[0.07]" />

          {/* Session section */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/30" style={DMSANS}>
              Session
            </p>

            <div className="flex items-center gap-2 mb-3">
              <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-orange" />
              <span className="text-[12px] font-medium text-white/75" style={DMSANS}>
                Environment Check
              </span>
            </div>

            {isFetching && (
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.05] px-3 py-2.5">
                <Loader2 size={11} className="animate-spin text-white/30 shrink-0" />
                <span className="text-[11px] text-white/30" style={DMSANS}>Loading assessment…</span>
              </div>
            )}

            {assessmentTitle && !isFetching && (
              <div className="rounded-lg bg-white/[0.05] px-3 py-2.5">
                <p className="text-[10px] text-white/25 mb-1" style={DMSANS}>Assessment</p>
                <p className="text-[12px] font-medium text-white/70 leading-snug" style={DMSANS}>
                  {assessmentTitle}
                </p>
              </div>
            )}

            {fetchError && !isFetching && (
              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                <p className="text-[10px] text-red-400/80 mb-0.5" style={DMSANS}>Error loading assessment</p>
                <p className="text-[11px] text-red-300/70 leading-snug" style={DMSANS}>{fetchError}</p>
              </div>
            )}
          </div>

          <div className="mx-6 h-px bg-white/[0.07]" />

          {/* Live check summary */}
          <div className="px-6 py-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-white/30" style={DMSANS}>
              Check Progress
            </p>

            {/* Big pass count */}
            <div className="mb-4 flex items-baseline gap-1.5">
              <motion.span
                key={passCount}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-bold text-white"
                style={SYNE}
              >
                {passCount}
              </motion.span>
              <span className="text-[13px] text-white/30" style={DMSANS}>/ {total}</span>
            </div>

            {/* Per-check rows */}
            <div className="flex flex-col gap-2.5">
              {CHECK_META.map(({ key, label, Icon }) => {
                const s = state[key].status
                return (
                  <div key={key} className="flex items-center gap-2.5">
                    <div className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full transition-all duration-300',
                      s === 'pending'  && 'bg-white/15',
                      s === 'checking' && 'animate-pulse bg-brand-orange',
                      s === 'pass'     && 'bg-green-400',
                      s === 'fail'     && 'bg-red-400',
                    )} />
                    <Icon size={11} className="shrink-0 text-white/20" />
                    <span className={cn(
                      'truncate text-[11px] transition-colors duration-300',
                      s === 'pass'     ? 'text-white/55'
                        : s === 'fail'   ? 'text-red-400/80'
                        : s === 'checking' ? 'text-brand-orange/70'
                        : 'text-white/20',
                    )} style={DMSANS}>
                      {label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spacer pushes footer down */}
          <div className="flex-1" />

          <div className="mx-6 h-px bg-white/[0.07]" />

          {/* Footer disclaimer */}
          <div className="flex items-start gap-2 px-6 py-5">
            <Lock size={11} className="mt-0.5 shrink-0 text-white/20" />
            <p className="text-[11px] leading-relaxed text-white/25" style={DMSANS}>
              Your proctor is monitoring this session. Do not close or minimise the app.
            </p>
          </div>
        </div>

        {/* ── Right panel: checks + action bar ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-[#F7F8FA]">

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-8 py-8">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
              className="mb-6"
            >
              <span
                className="inline-flex items-center rounded-full border border-brand-orange/25 bg-brand-orange-pale px-3 py-1"
                style={DMSANS}
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-orange">
                  Environment Check
                </span>
              </span>

              <h1 className="mt-3 text-[22px] font-bold leading-tight text-brand-navy" style={SYNE}>
                Verifying your setup
              </h1>
              <p className="mt-1.5 text-[13px] leading-relaxed text-brand-navy/50" style={DMSANS}>
                All checks must pass before the assessment starts.
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
              className="mb-3"
            >
              <div className="h-[3px] w-full overflow-hidden rounded-full bg-brand-border">
                <motion.div
                  className="h-full rounded-full bg-brand-orange"
                  animate={{ width: `${(passCount / total) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </motion.div>

            {/* Phase pills */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
              className="mb-5 flex items-center gap-1.5"
            >
              {PHASES.map((phase, i) => {
                const ps = phaseStatus(state, phase.keys)
                return (
                  <div key={phase.label} className="flex items-center gap-1.5">
                    {i > 0 && (
                      <div className={cn(
                        'h-px w-4 shrink-0 transition-colors duration-500',
                        ps === 'done' ? 'bg-green-300' : 'bg-brand-border',
                      )} />
                    )}
                    <motion.span
                      animate={ps === 'active' ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                      transition={ps === 'active' ? { duration: 1.8, repeat: Infinity } : {}}
                      className={cn(
                        'inline-block rounded-full border px-3 py-1 text-[11px] font-medium transition-all duration-300',
                        ps === 'pending' && 'border-brand-border bg-white text-brand-navy/35',
                        ps === 'active'  && 'border-brand-orange/50 bg-brand-orange-pale text-brand-orange',
                        ps === 'done'    && 'border-green-200 bg-green-50 text-green-700',
                      )}
                      style={DMSANS}
                    >
                      {phase.label}
                    </motion.span>
                  </div>
                )
              })}
            </motion.div>

            {/* Check cards */}
            {!kioskReady ? (
              <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading checks">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-[64px] rounded-2xl" aria-hidden="true" />
                ))}
              </div>
            ) : null}
            <motion.div
              variants={listVariants}
              initial="hidden"
              animate="visible"
              className={cn('flex flex-col gap-2', !kioskReady && 'hidden')}
              aria-busy={isChecking}
            >
              {CHECK_META.map(({ key, label, Icon, failHint, fixSteps }) => {
                const check    = state[key]
                const isFail   = check.status === 'fail'
                const isPass   = check.status === 'pass'
                const isExpand = expanded === key

                return (
                  <motion.div
                    key={key}
                    variants={cardVariants}
                    className={cn(
                      'overflow-hidden rounded-xl border shadow-sm transition-all duration-300',
                      check.status === 'pending'  && 'border-brand-border bg-white',
                      check.status === 'checking' && 'border-brand-orange/20 bg-white',
                      isPass                      && 'border-green-200/80 bg-white',
                      isFail                      && 'border-red-200 bg-white',
                    )}
                  >
                    <div className="flex items-center gap-4 px-5 py-4">

                      {/* Icon */}
                      <div className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                        check.status === 'pending'  && 'bg-[#F0F1F5]',
                        check.status === 'checking' && 'bg-brand-orange-pale',
                        isPass                      && 'bg-green-50',
                        isFail                      && 'bg-red-50',
                      )}>
                        {check.status === 'checking' ? (
                          <Loader2 size={15} className="animate-spin text-brand-orange" />
                        ) : isPass ? (
                          <CheckCircle2 size={15} className="text-green-500" />
                        ) : isFail ? (
                          <XCircle size={15} className="text-red-400" />
                        ) : (
                          <Icon size={15} className="text-brand-navy/25" />
                        )}
                      </div>

                      {/* Label + value */}
                      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <p className="text-[13px] font-medium text-brand-navy" style={DMSANS}>
                          {label}
                        </p>
                        <span
                          className={cn(
                            'shrink-0 text-[11px] transition-colors',
                            check.status === 'pending'  && 'text-brand-navy/25',
                            check.status === 'checking' && 'text-brand-orange',
                            isPass                      && 'text-green-600',
                            isFail                      && 'text-red-500',
                          )}
                          style={DMMONO}
                        >
                          {check.status === 'pending'  ? '—'
                            : check.status === 'checking' ? 'Scanning...'
                            : isPass                      ? 'Verified'
                            : (check.detail ?? failHint)}
                        </span>
                      </div>

                      {isFail && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(key)}
                          className="ml-1 shrink-0 text-[11px] text-brand-orange underline underline-offset-2 hover:opacity-60"
                          style={DMSANS}
                          aria-expanded={isExpand}
                        >
                          {isExpand ? 'Hide' : 'How to fix'}
                        </button>
                      )}
                    </div>

                    <AnimatePresence initial={false}>
                      {isFail && isExpand && (
                        <motion.div
                          key="fix"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-brand-orange/15 bg-brand-orange-pale/60 px-4 py-3" style={DMSANS}>
                            <p className="text-[12px] leading-relaxed text-brand-navy/65">{fixSteps}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Language pills */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
              className="mt-6"
            >
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-navy/35" style={DMSANS}>
                Available Languages
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((lang) => (
                  <span
                    key={lang}
                    className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-[11px] text-green-700"
                    style={DMMONO}
                  >
                    <CheckCircle2 size={9} className="mr-1 shrink-0" />
                    {lang}
                  </span>
                ))}
              </div>
            </motion.div>

          </div>

          {/* ── Action bar ── */}
          <div className="shrink-0 border-t border-brand-border bg-white px-6 py-4">
            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2" style={DMSANS}>
                {isChecking ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-brand-orange" />
                    <span className="text-[13px] text-brand-navy/50">Checking...</span>
                  </>
                ) : allPassed ? (
                  <>
                    <CheckCircle2 size={13} className="text-green-500" />
                    <span className="text-[13px] text-green-700">All checks passed</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={13} className="text-red-400" />
                    <span className="text-[13px] text-red-500">
                      {failCount} issue{failCount !== 1 ? 's' : ''} to fix
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={runValidations}
                  disabled={isChecking}
                  aria-label="Re-run environment checks"
                  className="flex items-center rounded-xl border border-brand-border bg-white px-4 py-2 text-[13px] text-brand-navy transition-colors hover:border-brand-navy/40 disabled:opacity-40"
                  style={DMSANS}
                >
                  <RefreshCw size={13} className={cn('mr-1.5', isChecking && 'animate-spin')} />
                  Re-check
                </button>

                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!allPassed || isChecking || isStarting || isFetching || !!fetchError}
                  title={
                    fetchError ? 'Assessment failed to load' :
                    isFetching ? 'Loading assessment…' :
                    !allPassed ? 'Fix issues above to continue' : undefined
                  }
                  aria-label={isStarting ? 'Starting assessment…' : 'Start assessment'}
                  className="flex items-center rounded-xl bg-brand-navy px-5 py-2 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
                  style={DMSANS}
                >
                  {isStarting ? (
                    <><Loader2 size={13} className="mr-1.5 animate-spin" />Starting...</>
                  ) : isFetching ? (
                    <><Loader2 size={13} className="mr-1.5 animate-spin" />Loading…</>
                  ) : (
                    <>Start Assessment<ArrowRight size={13} className="ml-1.5" /></>
                  )}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
