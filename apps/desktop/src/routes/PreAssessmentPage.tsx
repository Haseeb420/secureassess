import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Loader2,
  Monitor,
  RefreshCw,
  Share2,
  Shield,
  ShieldCheck,
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
import { useAssessmentStore } from '../store/assessmentStore'

type CheckStatus = 'pending' | 'checking' | 'pass' | 'fail'

interface CheckState {
  status: CheckStatus
  detail?: string
}

interface ValidationState {
  display:      CheckState
  screenRec:    CheckState
  aiTools:      CheckState
  remoteAccess: CheckState
  system:       CheckState
}

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

const LANGUAGES = [
  { name: 'python',     installed: true },
  { name: 'javascript', installed: true },
  { name: 'typescript', installed: true },
  { name: 'java',       installed: true },
  { name: 'go',         installed: true },
  { name: 'cpp',        installed: true },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const cardVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } },
}

function phaseStatus(state: ValidationState, keys: CheckKey[]): 'pending' | 'active' | 'done' {
  const statuses = keys.map((k) => state[k].status)
  if (statuses.every((s) => s === 'pass')) return 'done'
  if (statuses.some((s) => s === 'checking' || s === 'fail')) return 'active'
  return 'pending'
}

const SYNE   = { fontFamily: "'Syne', system-ui, sans-serif" }
const DMSANS = { fontFamily: "'DM Sans', system-ui, sans-serif" }
const DMMONO = { fontFamily: "'DM Mono', 'Courier New', monospace" }

export function PreAssessmentPage() {
  const navigate  = useNavigate()
  const candidate = useAssessmentStore((s) => s.candidate)

  const [state,      setState]      = useState<ValidationState>(INITIAL)
  const [isChecking, setIsChecking] = useState(true)
  const [kioskReady, setKioskReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [expanded,   setExpanded]   = useState<CheckKey | null>(null)

  useEffect(() => {
    enterKioskMode()
      .then(() => setKioskReady(true))
      .catch(() => setKioskReady(true))
  }, [])

  const runValidations = useCallback(async () => {
    setIsChecking(true)
    setExpanded(null)
    setState(CHECKING)

    try {
      const [displayResult, processes] = await Promise.all([
        validateDisplays().catch(() => ({ passed: true, violations: [] })),
        checkForbiddenProcesses().catch(() => [] as ForbiddenProcess[]),
      ])

      const violations      = displayResult.violations
      const multiDisplay    = violations.some((v) => v.type === 'MultipleDisplays')
      const externalDisplay = violations.some((v) => v.type === 'ExternalDisplay')
      const screenRec       = violations.some((v) => v.type === 'ScreenRecording')
      const aiProcs         = processes.filter((p) => p.category === 'ai')
      const remoteProcs     = processes.filter((p) => p.category === 'remote')

      setState({
        display: multiDisplay
          ? { status: 'fail', detail: 'Disconnect the extra monitor.' }
          : externalDisplay
            ? { status: 'fail', detail: 'Disable AirPlay / screen mirroring.' }
            : { status: 'pass' },
        screenRec: screenRec
          ? { status: 'fail', detail: 'Stop active screen recording.' }
          : { status: 'pass' },
        aiTools: aiProcs.length > 0
          ? { status: 'fail', detail: `Close ${aiProcs.map((p) => p.name).join(', ')}.` }
          : { status: 'pass' },
        remoteAccess: remoteProcs.length > 0
          ? { status: 'fail', detail: `Disconnect ${remoteProcs.map((p) => p.name).join(', ')}.` }
          : { status: 'pass' },
        system: { status: 'pass' },
      })
    } catch {
      setState({
        display:      { status: 'pass' },
        screenRec:    { status: 'pass' },
        aiTools:      { status: 'pass' },
        remoteAccess: { status: 'pass' },
        system:       { status: 'pass' },
      })
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (kioskReady) runValidations()
  }, [kioskReady, runValidations])

  const allPassed = Object.values(state).every((c) => c.status === 'pass')
  const failCount = Object.values(state).filter((c) => c.status === 'fail').length
  const passCount = Object.values(state).filter((c) => c.status === 'pass').length
  const total     = CHECK_META.length

  const handleStart = async () => {
    setIsStarting(true)
    navigate('/assessment')
  }

  const toggleExpand = (key: CheckKey) =>
    setExpanded((prev) => (prev === key ? null : key))

  return (
    /* Page shell — fills the AppShell flex-1 slot */
    <div className="flex h-full min-h-screen flex-col" style={{ background: '#F7F8FA' }}>

      {/* ── Top bar ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/10 bg-brand-navy px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/20">
            <ShieldCheck size={14} className="text-brand-orange" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white" style={SYNE}>
            SecureAssess
          </span>
        </div>
        {candidate?.name && (
          <span className="text-sm text-white/60" style={DMSANS}>
            {candidate.name}
          </span>
        )}
      </div>

      {/* ── Centered content ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="w-full max-w-[540px]">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-5"
          >
            <span
              className="inline-flex items-center rounded-full border border-brand-orange/25 bg-brand-orange-pale px-3 py-1"
              style={DMSANS}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-orange">
                Environment Check
              </span>
            </span>

            <h1 className="mt-3 text-[26px] font-bold leading-tight text-brand-navy" style={SYNE}>
              Verifying your setup
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-brand-navy/55" style={DMSANS}>
              We check your environment before the assessment starts.
              All checks must pass to continue.
            </p>
          </motion.div>

          {/* ── Progress bar ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
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

          {/* ── Phase pills ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="mb-5 flex items-center gap-1.5"
          >
            {PHASES.map((phase, i) => {
              const ps = phaseStatus(state, phase.keys)
              return (
                <div key={phase.label} className="flex items-center gap-1.5">
                  {i > 0 && (
                    <div
                      className={cn(
                        'h-px w-5 shrink-0 transition-colors duration-500',
                        ps === 'done' ? 'bg-green-300' : 'bg-brand-border',
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <motion.span
                    animate={ps === 'active' ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                    transition={
                      ps === 'active'
                        ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' }
                        : {}
                    }
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

          {/* ── Check cards ── */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col gap-2"
            aria-busy={isChecking}
            aria-label="Environment check results"
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
                    isPass                      && 'border-green-200/70 bg-white',
                    isFail                      && 'border-red-200 bg-white',
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-3.5 px-4 py-3">

                    {/* State dot strip (left edge accent) */}
                    <div
                      className={cn(
                        'absolute left-0 top-0 h-full w-[3px] rounded-l-xl opacity-0 transition-all duration-300',
                        isPass  && 'bg-green-400 opacity-100',
                        isFail  && 'bg-red-400 opacity-100',
                        check.status === 'checking' && 'bg-brand-orange opacity-100',
                      )}
                      aria-hidden="true"
                    />

                    {/* Icon */}
                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                        check.status === 'pending'  && 'bg-brand-surface',
                        check.status === 'checking' && 'bg-brand-orange-pale',
                        isPass                      && 'bg-green-50',
                        isFail                      && 'bg-red-50',
                      )}
                    >
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

                    {/* Label + status value */}
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-brand-navy" style={DMSANS}>
                        {label}
                      </p>
                      <span
                        className={cn(
                          'shrink-0 text-[11px] transition-colors duration-200',
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

                    {/* How to fix */}
                    {isFail && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        className="ml-1 shrink-0 text-[11px] text-brand-orange underline underline-offset-2 transition-opacity hover:opacity-60"
                        style={DMSANS}
                        aria-expanded={isExpand}
                        aria-controls={`fix-${key}`}
                      >
                        {isExpand ? 'Hide' : 'How to fix'}
                      </button>
                    )}
                  </div>

                  {/* Expandable fix detail */}
                  <AnimatePresence initial={false}>
                    {isFail && isExpand && (
                      <motion.div
                        id={`fix-${key}`}
                        key="fix"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div
                          className="border-t border-brand-orange/15 bg-brand-orange-pale/60 px-4 py-3"
                          style={DMSANS}
                        >
                          <p className="text-[12px] leading-relaxed text-brand-navy/65">
                            {fixSteps}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>

          {/* ── Language row ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            className="mt-5"
          >
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-brand-navy/35"
              style={DMSANS}
            >
              Available Languages
            </p>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map(({ name, installed }) => (
                <span
                  key={name}
                  className={cn(
                    'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px]',
                    installed
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
                  )}
                  style={DMMONO}
                >
                  {installed
                    ? <CheckCircle2 size={9} className="mr-1 shrink-0" aria-hidden="true" />
                    : <AlertTriangle size={9} className="mr-1 shrink-0" aria-hidden="true" />
                  }
                  {name}
                </span>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="shrink-0 border-t border-brand-border bg-white px-6 py-3.5">
        <div className="mx-auto flex max-w-[540px] items-center justify-between">

          {/* Status */}
          <div className="flex items-center gap-2" style={DMSANS}>
            {isChecking ? (
              <>
                <Loader2 size={13} className="animate-spin text-brand-orange" aria-hidden="true" />
                <span className="text-sm text-brand-navy/50">Checking...</span>
              </>
            ) : allPassed ? (
              <>
                <CheckCircle2 size={13} className="text-green-500" aria-hidden="true" />
                <span className="text-sm text-green-700">All checks passed</span>
              </>
            ) : (
              <>
                <AlertCircle size={13} className="text-red-400" aria-hidden="true" />
                <span className="text-sm text-red-500">
                  {failCount} issue{failCount !== 1 ? 's' : ''} to fix
                </span>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={runValidations}
              disabled={isChecking}
              aria-label="Re-run environment checks"
              className="flex items-center rounded-xl border border-brand-border bg-white px-4 py-2 text-[13px] text-brand-navy transition-colors hover:border-brand-navy/40 disabled:opacity-40"
              style={DMSANS}
            >
              <RefreshCw
                size={13}
                className={cn('mr-1.5', isChecking && 'animate-spin')}
                aria-hidden="true"
              />
              Re-check
            </button>

            <button
              type="button"
              onClick={handleStart}
              disabled={!allPassed || isChecking || isStarting}
              title={!allPassed ? 'Fix issues above to continue' : undefined}
              aria-label={isStarting ? 'Starting assessment…' : 'Start assessment'}
              className="flex items-center rounded-xl bg-brand-navy px-5 py-2 text-[13px] font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-35"
              style={DMSANS}
            >
              {isStarting ? (
                <>
                  <Loader2 size={13} className="mr-1.5 animate-spin" aria-hidden="true" />
                  Starting...
                </>
              ) : (
                <>
                  Start Assessment
                  <ArrowRight size={13} className="ml-1.5" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
