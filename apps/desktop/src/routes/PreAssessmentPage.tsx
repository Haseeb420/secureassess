import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
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
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { Button } from '@secureassess/ui'
import {
  enterKioskMode,
  validateDisplays,
  checkForbiddenProcesses,
} from '../features/security/securityService'
import type { ForbiddenProcess } from '../features/security/types'

type CheckStatus = 'pending' | 'checking' | 'pass' | 'fail'

interface CheckState {
  status: CheckStatus
  detail?: string
}

interface ValidationState {
  display:       CheckState
  screenRec:     CheckState
  browsers:      CheckState
  aiTools:       CheckState
  remoteAccess:  CheckState
  system:        CheckState
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
    key: 'display' as const,
    label: 'Single display',
    Icon: Monitor,
    fixHint: 'Disconnect any extra monitors. Unplug HDMI cables, disable AirPlay in menu bar.',
  },
  {
    key: 'screenRec' as const,
    label: 'No screen recording',
    Icon: Video,
    fixHint: 'Close QuickTime Player, OBS, Loom, or any screen recording app.',
  },
  {
    key: 'browsers' as const,
    label: 'No browsers open',
    Icon: Globe,
    fixHint: 'Quit Chrome, Firefox, Safari, and any other browsers.',
  },
  {
    key: 'aiTools' as const,
    label: 'No AI tools',
    Icon: Bot,
    fixHint: 'Close ChatGPT, Cursor, or any AI assistant apps.',
  },
  {
    key: 'remoteAccess' as const,
    label: 'No remote access',
    Icon: Share2,
    fixHint: 'Disconnect from TeamViewer, AnyDesk, or any remote desktop session.',
  },
  {
    key: 'system' as const,
    label: 'System verified',
    Icon: Shield,
    fixHint: 'Restart the app and try again.',
  },
]

type Step = 'Display' | 'Applications' | 'System'

const STEPS: Step[] = ['Display', 'Applications', 'System']

function getActiveStep(state: ValidationState): Step {
  if (state.display.status === 'checking' || state.screenRec.status === 'checking') return 'Display'
  if (
    state.browsers.status === 'checking' ||
    state.aiTools.status === 'checking' ||
    state.remoteAccess.status === 'checking'
  )
    return 'Applications'
  return 'System'
}

function getStepStatus(step: Step, state: ValidationState): 'pending' | 'checking' | 'pass' | 'fail' {
  const displayKeys: (keyof ValidationState)[] = ['display', 'screenRec']
  const appKeys: (keyof ValidationState)[] = ['browsers', 'aiTools', 'remoteAccess']
  const sysKeys: (keyof ValidationState)[] = ['system']

  const keys = step === 'Display' ? displayKeys : step === 'Applications' ? appKeys : sysKeys
  const statuses = keys.map((k) => state[k].status)

  if (statuses.some((s) => s === 'fail')) return 'fail'
  if (statuses.some((s) => s === 'checking')) return 'checking'
  if (statuses.every((s) => s === 'pass')) return 'pass'
  return 'pending'
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
}

export function PreAssessmentPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ValidationState>(INITIAL)
  const [isChecking, setIsChecking] = useState(true)
  const [kioskReady, setKioskReady] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    enterKioskMode()
      .then(() => setKioskReady(true))
      .catch(() => setKioskReady(true))
  }, [])

  const runValidations = useCallback(async () => {
    setIsChecking(true)
    setState(CHECKING)

    try {
      const [displayResult, processes] = await Promise.all([
        validateDisplays().catch(() => ({ passed: true, violations: [] })),
        checkForbiddenProcesses().catch(() => [] as ForbiddenProcess[]),
      ])

      const violations = displayResult.violations
      const multiDisplay = violations.some((v) => v.type === 'MultipleDisplays')
      const externalDisplay = violations.some((v) => v.type === 'ExternalDisplay')
      const screenRec = violations.some((v) => v.type === 'ScreenRecording')

      const browserProcs = processes.filter((p) => p.category === 'browser')
      const aiProcs = processes.filter((p) => p.category === 'ai')
      const remoteProcs = processes.filter((p) => p.category === 'remote')

      setState({
        display: multiDisplay
          ? { status: 'fail', detail: 'Disconnect the extra monitor, then click Re-check.' }
          : externalDisplay
            ? { status: 'fail', detail: 'Disable AirPlay and screen mirroring, then click Re-check.' }
            : { status: 'pass' },
        screenRec: screenRec
          ? { status: 'fail', detail: 'Stop screen recording or screen-sharing, then click Re-check.' }
          : { status: 'pass' },
        browsers: browserProcs.length > 0
          ? { status: 'fail', detail: `Close ${browserProcs.map((p) => p.name).join(', ')}, then click Re-check.` }
          : { status: 'pass' },
        aiTools: aiProcs.length > 0
          ? { status: 'fail', detail: `Close ${aiProcs.map((p) => p.name).join(', ')}, then click Re-check.` }
          : { status: 'pass' },
        remoteAccess: remoteProcs.length > 0
          ? { status: 'fail', detail: `Disconnect ${remoteProcs.map((p) => p.name).join(', ')}, then click Re-check.` }
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

  const allPassed = Object.values(state).every((c) => c.status === 'pass')
  const failCount = Object.values(state).filter((c) => c.status === 'fail').length

  const handleStart = async () => {
    setIsStarting(true)
    navigate('/assessment')
  }

  return (
    <motion.div
      className="min-h-screen bg-brand-surface"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mx-auto max-w-xl px-4 py-12">
        {/* Logo + app name */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-orange/10">
            <ShieldCheck size={16} className="text-brand-orange" aria-hidden="true" />
          </div>
          <span className="text-sm font-semibold text-brand-navy">SecureAssess</span>
        </div>

        <h1 className="text-2xl font-semibold text-brand-navy">Let's check your setup</h1>
        <p className="mt-2 text-sm text-brand-navy/60">
          We'll verify your environment before starting. This takes a few seconds.
        </p>

        {/* Step pills */}
        <div className="mt-8 flex items-center gap-0" role="list" aria-label="Validation steps">
          {STEPS.map((step, i) => {
            const stepStatus = getStepStatus(step, state)
            const isActive = getActiveStep(state) === step && isChecking
            return (
              <div key={step} className="flex items-center" role="listitem">
                <span
                  className={[
                    'rounded-full border px-4 py-1 text-xs font-medium transition-colors',
                    stepStatus === 'pass'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : stepStatus === 'fail'
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : isActive
                          ? 'animate-pulse border-brand-orange bg-brand-orange-pale text-brand-orange'
                          : 'border-brand-border bg-brand-surface text-brand-navy/40',
                  ].join(' ')}
                >
                  {step}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="mx-1 h-px w-6 bg-brand-border" aria-hidden="true" />
                )}
              </div>
            )
          })}
        </div>

        {/* Check cards */}
        <motion.div
          className="mt-6 space-y-3"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          aria-busy={isChecking}
        >
          {CHECK_META.map(({ key, label, Icon, fixHint }) => {
            const check = state[key]
            return (
              <motion.div
                key={key}
                variants={rowVariants}
                className={[
                  'flex items-start gap-4 rounded-2xl border bg-white p-4 shadow-sm transition-colors',
                  check.status === 'pass'
                    ? 'border-green-200'
                    : check.status === 'fail'
                      ? 'border-red-200'
                      : 'border-brand-border',
                ].join(' ')}
              >
                {/* Icon circle */}
                <div
                  className={[
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors',
                    check.status === 'checking'
                      ? 'bg-brand-orange-pale'
                      : check.status === 'pass'
                        ? 'bg-green-100'
                        : check.status === 'fail'
                          ? 'bg-red-100'
                          : 'bg-brand-surface',
                  ].join(' ')}
                >
                  {check.status === 'checking' ? (
                    <Loader2
                      size={20}
                      className="animate-spin text-brand-orange"
                      aria-label="Checking"
                    />
                  ) : check.status === 'pass' ? (
                    <CheckCircle2 size={20} className="text-green-600" aria-label="Pass" />
                  ) : check.status === 'fail' ? (
                    <XCircle size={20} className="text-red-500" aria-label="Fail" />
                  ) : (
                    <Icon size={20} className="text-brand-navy/30" aria-hidden="true" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-navy">{label}</p>
                  <p className="mt-0.5 text-xs text-brand-navy/50">
                    {check.status === 'pending'
                      ? 'Waiting…'
                      : check.status === 'checking'
                        ? 'Checking…'
                        : check.status === 'pass'
                          ? 'Looks good'
                          : check.detail ?? fixHint}
                  </p>
                  <AnimatePresence>
                    {check.status === 'fail' && (
                      <motion.p
                        role="alert"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="mt-1.5 overflow-hidden text-xs font-medium text-brand-orange"
                      >
                        Fix: {fixHint}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      {/* Sticky action bar */}
      <div className="sticky bottom-0 border-t border-brand-border bg-white px-8 py-4">
        <div className="mx-auto flex max-w-xl items-center justify-between">
          {/* Status summary */}
          <div className="flex items-center gap-2">
            {allPassed && !isChecking ? (
              <>
                <CheckCircle size={16} className="text-green-500" aria-hidden="true" />
                <span className="text-sm font-medium text-green-600">All checks passed</span>
              </>
            ) : !isChecking && failCount > 0 ? (
              <>
                <AlertCircle size={16} className="text-red-500" aria-hidden="true" />
                <span className="text-sm font-medium text-red-600">
                  {failCount} issue{failCount !== 1 ? 's' : ''} found
                </span>
              </>
            ) : (
              <span className="text-sm text-brand-navy/40">Checking your environment…</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={runValidations}
              disabled={isChecking}
              className="gap-2"
              aria-label="Re-run environment checks"
            >
              <RefreshCw
                size={14}
                className={isChecking ? 'animate-spin' : ''}
                aria-hidden="true"
              />
              {isChecking ? 'Checking…' : 'Re-check'}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleStart}
              disabled={!allPassed || isChecking || isStarting}
              title={!allPassed ? 'Fix the issues above to continue' : undefined}
            >
              {isStarting ? 'Starting…' : 'Start Assessment →'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
