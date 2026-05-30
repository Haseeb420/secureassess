import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  Bot,
  CheckCircle,
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
import { Button, cn } from '@secureassess/ui'
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
      className="flex min-h-screen flex-col bg-brand-surface"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="flex h-12 shrink-0 items-center border-b border-brand-border bg-white px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-orange/10">
            <ShieldCheck size={13} className="text-brand-orange" aria-hidden="true" />
          </div>
          <span className="text-xs font-semibold text-brand-navy">SecureAssess</span>
        </div>
      </div>

      {/* Centered content */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[460px]">

          {/* Page title above card */}
          <div className="mb-4 px-1">
            <h1 className="text-lg font-semibold text-brand-navy">Environment check</h1>
            <p className="mt-0.5 text-sm text-brand-navy/50">
              Verify your setup before you begin. Takes a few seconds.
            </p>
          </div>

          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm">

            {/* Step progress bars */}
            <div
              className="border-b border-brand-border px-5 pt-4 pb-4"
              role="list"
              aria-label="Validation steps"
            >
              <div className="flex gap-1.5" aria-hidden="true">
                {STEPS.map((step) => {
                  const stepStatus = getStepStatus(step, state)
                  const isActive = getActiveStep(state) === step && isChecking
                  return (
                    <div
                      key={step}
                      className={cn(
                        'h-[3px] flex-1 rounded-full transition-all duration-500',
                        stepStatus === 'pass'
                          ? 'bg-green-500'
                          : stepStatus === 'fail'
                            ? 'bg-red-500'
                            : isActive
                              ? 'bg-brand-orange'
                              : 'bg-brand-border',
                      )}
                    />
                  )
                })}
              </div>
              <div className="mt-2 flex" role="listitem">
                {STEPS.map((step) => {
                  const stepStatus = getStepStatus(step, state)
                  const isActive = getActiveStep(state) === step && isChecking
                  return (
                    <span
                      key={step}
                      className={cn(
                        'flex-1 text-[11px] font-medium transition-colors',
                        stepStatus === 'pass'
                          ? 'text-green-600'
                          : stepStatus === 'fail'
                            ? 'text-red-600'
                            : isActive
                              ? 'text-brand-orange'
                              : 'text-brand-navy/35',
                      )}
                    >
                      {step}
                    </span>
                  )
                })}
              </div>
            </div>

            {/* Check rows */}
            <motion.div
              className="divide-y divide-brand-border/50"
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
                    className={cn(
                      'flex items-center gap-3.5 px-5 py-3 transition-colors',
                      check.status === 'fail' && 'bg-red-50/50',
                    )}
                  >
                    {/* Status icon */}
                    <div
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                        check.status === 'checking'
                          ? 'bg-brand-orange/10'
                          : check.status === 'pass'
                            ? 'bg-green-100'
                            : check.status === 'fail'
                              ? 'bg-red-100'
                              : 'bg-brand-surface',
                      )}
                    >
                      {check.status === 'checking' ? (
                        <Loader2 size={14} className="animate-spin text-brand-orange" aria-label="Checking" />
                      ) : check.status === 'pass' ? (
                        <CheckCircle2 size={14} className="text-green-600" aria-label="Passed" />
                      ) : check.status === 'fail' ? (
                        <XCircle size={14} className="text-red-500" aria-label="Failed" />
                      ) : (
                        <Icon size={14} className="text-brand-navy/20" aria-hidden="true" />
                      )}
                    </div>

                    {/* Label + detail */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-[13px] font-medium leading-snug',
                        check.status === 'fail' ? 'text-red-700' : 'text-brand-navy',
                      )}>
                        {label}
                      </p>
                      <AnimatePresence mode="wait">
                        {check.status === 'fail' ? (
                          <motion.div
                            key="fail"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <p className="text-[11px] text-brand-navy/45 leading-snug">
                              {check.detail ?? fixHint}
                            </p>
                            <p
                              role="alert"
                              className="mt-0.5 text-[11px] font-semibold text-brand-orange"
                            >
                              Fix: {fixHint}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.p
                            key="status"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="text-[11px] text-brand-navy/45 leading-snug"
                          >
                            {check.status === 'pending'
                              ? 'Waiting…'
                              : check.status === 'checking'
                                ? 'Checking…'
                                : 'No issues found'}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Right: pass dot or fail badge */}
                    {check.status === 'pass' && (
                      <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-green-400" aria-hidden="true" />
                    )}
                    {check.status === 'fail' && (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                        Action needed
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Card footer */}
            <div className="flex items-center justify-between border-t border-brand-border bg-brand-surface/40 px-5 py-3">
              <div className="flex items-center gap-1.5">
                {allPassed && !isChecking ? (
                  <>
                    <CheckCircle size={13} className="text-green-500" aria-hidden="true" />
                    <span className="text-xs font-medium text-green-700">All checks passed</span>
                  </>
                ) : !isChecking && failCount > 0 ? (
                  <>
                    <AlertCircle size={13} className="text-red-500" aria-hidden="true" />
                    <span className="text-xs font-medium text-red-600">
                      {failCount} issue{failCount !== 1 ? 's' : ''} found
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-brand-navy/40">Checking environment…</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={runValidations}
                  disabled={isChecking}
                  className="gap-1.5 py-1.5 text-xs"
                  aria-label="Re-run environment checks"
                >
                  <RefreshCw
                    size={11}
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
                  className="py-1.5 text-xs"
                  title={!allPassed ? 'Fix the issues above to continue' : undefined}
                >
                  {isStarting ? 'Starting…' : 'Start Assessment →'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
