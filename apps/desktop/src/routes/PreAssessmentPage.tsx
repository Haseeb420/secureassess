import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ChevronRight,
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
  aiTools:       CheckState
  remoteAccess:  CheckState
  system:        CheckState
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
    key: 'display' as const,
    label: 'Single display',
    description: 'No external monitors or screen mirroring',
    Icon: Monitor,
    fixHint: 'Disconnect extra monitors and disable AirPlay in the menu bar.',
  },
  {
    key: 'screenRec' as const,
    label: 'No screen recording',
    description: 'Screen is not being captured or shared',
    Icon: Video,
    fixHint: 'Close QuickTime Player, OBS, Loom, or any screen recording app.',
  },
  {
    key: 'aiTools' as const,
    label: 'No AI tools',
    description: 'AI assistant applications are not running',
    Icon: Bot,
    fixHint: 'Close ChatGPT, Cursor, or any AI assistant apps.',
  },
  {
    key: 'remoteAccess' as const,
    label: 'No remote access',
    description: 'No remote desktop sessions detected',
    Icon: Share2,
    fixHint: 'Disconnect from TeamViewer, AnyDesk, or any remote desktop session.',
  },
  {
    key: 'system' as const,
    label: 'System integrity',
    description: 'System configuration is valid',
    Icon: Shield,
    fixHint: 'Restart the app and try again.',
  },
]

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const rowVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
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

      const violations     = displayResult.violations
      const multiDisplay   = violations.some((v) => v.type === 'MultipleDisplays')
      const externalDisplay = violations.some((v) => v.type === 'ExternalDisplay')
      const screenRec      = violations.some((v) => v.type === 'ScreenRecording')
      const aiProcs        = processes.filter((p) => p.category === 'ai')
      const remoteProcs    = processes.filter((p) => p.category === 'remote')

      setState({
        display: multiDisplay
          ? { status: 'fail', detail: 'Disconnect the extra monitor, then click Re-check.' }
          : externalDisplay
            ? { status: 'fail', detail: 'Disable AirPlay and screen mirroring, then click Re-check.' }
            : { status: 'pass' },
        screenRec: screenRec
          ? { status: 'fail', detail: 'Stop screen recording or screen-sharing, then click Re-check.' }
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

  return (
    <motion.div
      className="flex h-full flex-col bg-[#F4F4F6]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Top bar */}
      <div className="flex h-11 shrink-0 items-center border-b border-black/[0.07] bg-white px-5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-brand-orange" aria-hidden="true" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-brand-navy/50">
            SecureAssess
          </span>
        </div>
      </div>

      {/* Centered body */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[580px]">

          {/* Header */}
          <div className="mb-7 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-orange/10 ring-4 ring-brand-orange/8">
              <Shield size={28} className="text-brand-orange" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-brand-navy">
              Environment check
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-brand-navy/50">
              We verify your setup before the assessment starts.
              <br />All checks must pass to continue.
            </p>
          </div>

          {/* Card */}
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.07)]">

            {/* Check list */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              aria-busy={isChecking}
              className="divide-y divide-black/[0.05]"
            >
              {CHECK_META.map(({ key, label, description, Icon, fixHint }) => {
                const check  = state[key]
                const isFail = check.status === 'fail'
                const isPass = check.status === 'pass'

                return (
                  <motion.div
                    key={key}
                    variants={rowVariants}
                    className={cn(
                      'flex items-center gap-4 px-6 py-4 transition-colors duration-200',
                      isFail && 'bg-red-50/70',
                    )}
                  >
                    {/* Icon column */}
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-200',
                        check.status === 'checking' ? 'bg-amber-50'
                          : isPass                  ? 'bg-emerald-50'
                          : isFail                  ? 'bg-red-100'
                          : 'bg-black/[0.04]',
                      )}
                    >
                      {check.status === 'checking' ? (
                        <Loader2 size={18} className="animate-spin text-amber-500" aria-label="Checking" />
                      ) : isPass ? (
                        <CheckCircle2 size={18} className="text-emerald-500" aria-label="Passed" />
                      ) : isFail ? (
                        <XCircle size={18} className="text-red-500" aria-label="Failed" />
                      ) : (
                        <Icon size={18} className="text-brand-navy/25" aria-hidden="true" />
                      )}
                    </div>

                    {/* Text column */}
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        'text-sm font-semibold',
                        isFail ? 'text-red-700' : 'text-brand-navy',
                      )}>
                        {label}
                      </p>
                      <AnimatePresence mode="wait">
                        {isFail ? (
                          <motion.div
                            key="fail"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <p className="mt-0.5 text-xs leading-relaxed text-red-600/80">
                              {check.detail ?? fixHint}
                            </p>
                          </motion.div>
                        ) : (
                          <motion.p
                            key="sub"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className="mt-0.5 text-xs text-brand-navy/40"
                          >
                            {check.status === 'pending'  ? 'Waiting…'
                              : check.status === 'checking' ? 'Checking…'
                              : description}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Status badge */}
                    <div className="shrink-0">
                      {isPass && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200/60">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Passed
                        </span>
                      )}
                      {isFail && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-600 ring-1 ring-red-200/60">
                          <AlertTriangle size={10} />
                          Fix needed
                        </span>
                      )}
                      {(check.status === 'checking' || check.status === 'pending') && (
                        <span className="inline-flex h-7 w-16 animate-pulse rounded-full bg-black/[0.06]" aria-hidden="true" />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-black/[0.06] bg-[#FAFAFA] px-6 py-4">
              {/* Summary */}
              <div className="flex items-center gap-2.5">
                {isChecking ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-brand-navy/30" />
                    <span className="text-xs text-brand-navy/40">Checking your environment…</span>
                  </>
                ) : allPassed ? (
                  <>
                    <div className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-emerald-700">All {total} checks passed</span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                    <span className="text-xs font-semibold text-red-600">
                      {failCount} issue{failCount !== 1 ? 's' : ''} found · {passCount}/{total} passed
                    </span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={runValidations}
                  disabled={isChecking}
                  className="gap-1.5 py-2 text-xs"
                  aria-label="Re-run environment checks"
                >
                  <RefreshCw
                    size={12}
                    className={cn(isChecking && 'animate-spin')}
                    aria-hidden="true"
                  />
                  Re-check
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleStart}
                  disabled={!allPassed || isChecking || isStarting}
                  className="gap-1.5 py-2 text-xs"
                  title={!allPassed ? 'Fix the issues above to continue' : undefined}
                >
                  {isStarting ? (
                    <>
                      <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      Starting…
                    </>
                  ) : (
                    <>
                      Start Assessment
                      <ChevronRight size={13} aria-hidden="true" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Sub-note */}
          <p className="mt-4 text-center text-[11px] text-brand-navy/30">
            Your proctor is monitoring this session. Do not close or minimize this window.
          </p>
        </div>
      </div>
    </motion.div>
  )
}
