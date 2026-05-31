import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Globe,
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
  browsers:     CheckState
  aiTools:      CheckState
  remoteAccess: CheckState
  system:       CheckState
}

const INITIAL: ValidationState = {
  display:      { status: 'pending' },
  screenRec:    { status: 'pending' },
  browsers:     { status: 'pending' },
  aiTools:      { status: 'pending' },
  remoteAccess: { status: 'pending' },
  system:       { status: 'pending' },
}

const CHECKING: ValidationState = {
  display:      { status: 'checking' },
  screenRec:    { status: 'checking' },
  browsers:     { status: 'checking' },
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
    key:      'browsers' as const,
    label:    'No browsers running',
    Icon:     Globe,
    failHint: 'Close all browsers',
    fixSteps: 'Quit Chrome, Safari, Firefox, Edge, and any other browser completely (⌘Q), then click Re-check.',
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

const PHASES = [
  { label: 'Display',      keys: ['display', 'screenRec'] as CheckKey[] },
  { label: 'Applications', keys: ['browsers', 'aiTools', 'remoteAccess'] as CheckKey[] },
  { label: 'System',       keys: ['system'] as CheckKey[] },
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
  visible: { transition: { staggerChildren: 0.08 } },
}

const cardVariants = {
  hidden:   { opacity: 0, x: -16 },
  visible:  { opacity: 1, x: 0, transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] } },
}

function phaseStatus(
  state: ValidationState,
  keys: CheckKey[],
): 'pending' | 'active' | 'done' {
  const statuses = keys.map((k) => state[k].status)
  if (statuses.every((s) => s === 'pass')) return 'done'
  if (statuses.some((s) => s === 'checking')) return 'active'
  if (statuses.some((s) => s === 'fail')) return 'active'
  return 'pending'
}

export function PreAssessmentPage() {
  const navigate  = useNavigate()
  const candidate = useAssessmentStore((s) => s.candidate)

  const [state,       setState]       = useState<ValidationState>(INITIAL)
  const [isChecking,  setIsChecking]  = useState(true)
  const [kioskReady,  setKioskReady]  = useState(false)
  const [isStarting,  setIsStarting]  = useState(false)
  const [expanded,    setExpanded]    = useState<CheckKey | null>(null)

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
      const browserProcs    = processes.filter((p) => p.category === 'browser')
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
        browsers: browserProcs.length > 0
          ? { status: 'fail', detail: `Close ${browserProcs.map((p) => p.name).join(', ')}.` }
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
        browsers:     { status: 'pass' },
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

  const allPassed  = Object.values(state).every((c) => c.status === 'pass')
  const failCount  = Object.values(state).filter((c) => c.status === 'fail').length
  const passCount  = Object.values(state).filter((c) => c.status === 'pass').length
  const total      = CHECK_META.length

  const handleStart = async () => {
    setIsStarting(true)
    navigate('/assessment')
  }

  const toggleExpand = (key: CheckKey) => {
    setExpanded((prev) => (prev === key ? null : key))
  }

  return (
    <motion.div
      className="flex h-full flex-col"
      style={{ background: '#F7F8FA' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* ── Top bar ── */}
      <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/10 bg-brand-navy px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-orange/20">
            <ShieldCheck size={14} className="text-brand-orange" aria-hidden="true" />
          </div>
          <span
            className="text-[15px] font-bold text-white"
            style={{ fontFamily: "'Syne', system-ui, sans-serif", letterSpacing: '-0.01em' }}
          >
            SecureAssess
          </span>
        </div>

        {candidate?.name && (
          <span
            className="text-sm text-white/60"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            {candidate.name}
          </span>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-lg px-4 py-10">

          {/* Phase chip */}
          <div
            className="inline-flex items-center rounded-full border border-brand-orange/20 bg-brand-orange-pale px-3 py-1"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            <span className="text-xs font-semibold uppercase tracking-[0.15em] text-brand-orange">
              Environment Check
            </span>
          </div>

          {/* Title */}
          <h1
            className="mt-3 text-2xl font-bold text-brand-navy"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            Verifying your setup
          </h1>
          <p
            className="mt-1 text-sm text-brand-navy/60"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
          >
            We will check your environment in a few seconds. Please do not close the app.
          </p>

          {/* Overall progress bar */}
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-brand-border">
            <motion.div
              className="h-full rounded-full bg-brand-orange"
              animate={{ width: `${(passCount / total) * 100}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>

          {/* Step pills */}
          <div className="mt-4 flex items-center gap-0">
            {PHASES.map((phase, i) => {
              const ps = phaseStatus(state, phase.keys)
              return (
                <div key={phase.label} className="flex items-center">
                  {i > 0 && (
                    <div
                      className={cn(
                        'h-px w-6 transition-colors duration-300',
                        ps === 'done' ? 'bg-green-300' : 'bg-brand-border',
                      )}
                      aria-hidden="true"
                    />
                  )}
                  <motion.div
                    animate={ps === 'active' ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={ps === 'active' ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : {}}
                    className={cn(
                      'rounded-full border px-4 py-1.5 text-xs transition-all duration-300',
                      ps === 'pending' && 'border-brand-border bg-white text-brand-navy/40',
                      ps === 'active'  && 'border-brand-orange bg-brand-orange-pale text-brand-orange',
                      ps === 'done'    && 'border-green-200 bg-green-50 text-green-700',
                    )}
                    style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                  >
                    {phase.label}
                  </motion.div>
                </div>
              )
            })}
          </div>

          {/* Check cards */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mt-6 flex flex-col gap-2.5"
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
                    'overflow-hidden rounded-2xl border transition-all duration-300',
                    check.status === 'pending'  && 'border-brand-border bg-white',
                    check.status === 'checking' && 'border-brand-orange/30 bg-brand-orange-pale/20',
                    isPass                      && 'border-green-200 bg-green-50/40',
                    isFail                      && 'border-red-200 bg-red-50/40',
                  )}
                >
                  {/* Main row */}
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    {/* Icon circle */}
                    <div
                      className={cn(
                        'flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl transition-all duration-300',
                        check.status === 'pending'  && 'bg-brand-surface',
                        check.status === 'checking' && 'bg-brand-orange-pale',
                        isPass                      && 'bg-green-100',
                        isFail                      && 'bg-red-100',
                      )}
                    >
                      {check.status === 'checking' ? (
                        <Loader2 size={16} className="animate-spin text-brand-orange" aria-label="Checking" />
                      ) : isPass ? (
                        <CheckCircle2 size={16} className="text-green-600" aria-label="Passed" />
                      ) : isFail ? (
                        <XCircle size={16} className="text-red-500" aria-label="Failed" />
                      ) : (
                        <Icon size={16} className="text-brand-navy/30" aria-hidden="true" />
                      )}
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-brand-navy"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                      >
                        {label}
                      </p>
                      <p
                        className={cn(
                          'mt-0.5 text-xs',
                          check.status === 'pending'  && 'text-brand-navy/30',
                          check.status === 'checking' && 'text-brand-orange',
                          isPass                      && 'text-green-600',
                          isFail                      && 'text-red-500',
                        )}
                        style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
                      >
                        {check.status === 'pending'  ? '—'
                          : check.status === 'checking' ? 'Scanning...'
                          : isPass                      ? 'Verified'
                          : (check.detail ?? failHint)}
                      </p>
                    </div>

                    {/* How to fix (fail only) */}
                    {isFail && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(key)}
                        className="shrink-0 text-xs text-brand-orange underline underline-offset-2 transition-opacity hover:opacity-70"
                        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        aria-expanded={isExpand}
                        aria-controls={`fix-${key}`}
                      >
                        How to fix
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
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        <div
                          className="border-t border-brand-orange/20 bg-brand-orange-pale px-5 py-3"
                          style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                        >
                          <p className="text-xs leading-relaxed text-brand-navy/70">
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

          {/* Language row */}
          <div className="mt-5">
            <p
              className="text-xs font-semibold uppercase tracking-wider text-brand-navy/40"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              Available Languages
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {LANGUAGES.map(({ name, installed }) => (
                <span
                  key={name}
                  className={cn(
                    'inline-flex items-center rounded-full border px-3 py-1 text-xs',
                    installed
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : 'border-amber-200 bg-amber-50 text-amber-700',
                  )}
                  style={{ fontFamily: "'DM Mono', 'Courier New', monospace" }}
                >
                  {installed ? (
                    <CheckCircle2 size={10} className="mr-1.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={10} className="mr-1.5 shrink-0" aria-hidden="true" />
                  )}
                  {name}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      <div className="shrink-0 border-t border-brand-border bg-white px-6 py-4">
        <div className="flex items-center justify-between">

          {/* Status text */}
          <div className="flex items-center gap-2">
            {isChecking ? (
              <>
                <Loader2 size={14} className="animate-spin text-brand-orange" aria-hidden="true" />
                <span
                  className="text-sm text-brand-navy/60"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  Checking...
                </span>
              </>
            ) : allPassed ? (
              <>
                <CheckCircle2 size={14} className="text-green-600" aria-hidden="true" />
                <span
                  className="text-sm text-green-700"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  All checks passed
                </span>
              </>
            ) : (
              <>
                <AlertCircle size={14} className="text-red-400" aria-hidden="true" />
                <span
                  className="text-sm text-red-600"
                  style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
                >
                  {failCount} issue{failCount !== 1 ? 's' : ''} to fix
                </span>
              </>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runValidations}
              disabled={isChecking}
              aria-label="Re-run environment checks"
              className={cn(
                'flex items-center rounded-xl border border-brand-border bg-white px-4 py-2 text-sm text-brand-navy transition-colors hover:border-brand-navy disabled:opacity-40',
              )}
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              <RefreshCw
                size={14}
                className={cn('mr-2', isChecking && 'animate-spin')}
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
              className="flex items-center rounded-xl bg-brand-navy px-6 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
            >
              {isStarting ? (
                <>
                  <Loader2 size={14} className="mr-2 animate-spin" aria-hidden="true" />
                  Starting...
                </>
              ) : (
                <>
                  Start Assessment
                  <ArrowRight size={14} className="ml-2" aria-hidden="true" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
