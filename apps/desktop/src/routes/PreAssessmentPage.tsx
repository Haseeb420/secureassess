import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, RefreshCw, ShieldCheck } from 'lucide-react'
import { Button, Skeleton } from '@secureassess/ui'
import { enterKioskMode, validateDisplays } from '../features/security/securityService'
import type { ValidationResult } from '../features/security/types'

interface CheckState {
  status: 'pending' | 'pass' | 'fail'
  detail?: string
}

interface ValidationState {
  display: CheckState
  screenRecording: CheckState
}

const INITIAL: ValidationState = {
  display: { status: 'pending' },
  screenRecording: { status: 'pending' },
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const rowVariants = {
  hidden: { opacity: 0, x: -8 },
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
    setState(INITIAL)
    try {
      const result = await validateDisplays() as ValidationResult
      const multiDisplay = result.violations.some((v) => v.type === 'MultipleDisplays')
      const external = result.violations.some((v) => v.type === 'ExternalDisplay')
      const screenRec = result.violations.some((v) => v.type === 'ScreenRecording')
      setState({
        display: multiDisplay
          ? { status: 'fail', detail: 'Disconnect the extra monitor, then click Re-check.' }
          : external
            ? { status: 'fail', detail: 'Disable AirPlay and screen mirroring, then click Re-check.' }
            : { status: 'pass' },
        screenRecording: screenRec
          ? { status: 'fail', detail: 'Stop screen recording or screen-sharing, then click Re-check.' }
          : { status: 'pass' },
      })
    } catch {
      setState({ display: { status: 'pass' }, screenRecording: { status: 'pass' } })
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (kioskReady) runValidations()
  }, [kioskReady, runValidations])

  const allPassed = state.display.status === 'pass' && state.screenRecording.status === 'pass'

  const handleStart = async () => {
    setIsStarting(true)
    navigate('/assessment')
  }

  const checks: Array<{ key: keyof ValidationState; label: string; reason: string }> = [
    { key: 'display', label: 'Single display connected', reason: 'External monitors are not allowed during assessment.' },
    { key: 'screenRecording', label: 'No screen recording active', reason: 'Screen sharing and recording must be disabled.' },
  ]

  return (
    <motion.div
      className="min-h-screen bg-brand-surface flex items-center justify-center px-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-orange-pale">
            <ShieldCheck size={24} className="text-brand-orange" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold text-brand-navy">Environment Check</h1>
          <p className="mt-1 text-sm text-brand-navy/60">
            We need to verify your setup before starting.
          </p>
        </div>

        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <motion.div
            className="space-y-2 mb-6"
            variants={containerVariants}
            initial="hidden"
            animate={isChecking ? 'hidden' : 'visible'}
            aria-busy={isChecking}
          >
            {isChecking
              ? checks.map((c) => (
                  <div key={c.key} className="flex items-center gap-4 rounded-xl border border-brand-border bg-brand-surface px-5 py-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                ))
              : checks.map((c) => {
                  const check = state[c.key]
                  return (
                    <motion.div
                      key={c.key}
                      variants={rowVariants}
                      className={[
                        'flex items-start gap-4 rounded-xl border px-5 py-4 transition-colors',
                        check.status === 'pass' ? 'border-green-200 bg-green-50' :
                        check.status === 'fail' ? 'border-red-200 bg-red-50' :
                        'border-brand-border bg-brand-surface',
                      ].join(' ')}
                    >
                      <CheckIcon status={check.status} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-brand-navy">{c.label}</p>
                        <p className="text-xs text-brand-navy/60 mt-0.5">{c.reason}</p>
                        <AnimatePresence>
                          {check.status === 'fail' && check.detail && (
                            <motion.p
                              role="alert"
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="text-xs text-red-600 font-medium mt-1 overflow-hidden"
                            >
                              {check.detail}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>
                    </motion.div>
                  )
                })}
          </motion.div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={runValidations}
              disabled={isChecking}
              className="gap-2"
              aria-label="Re-run environment checks"
            >
              <RefreshCw size={14} className={isChecking ? 'animate-spin' : ''} aria-hidden="true" />
              {isChecking ? 'Checking…' : 'Re-check'}
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={handleStart}
              disabled={!allPassed || isChecking || isStarting}
              className="flex-1 active:scale-[0.97]"
              title={!allPassed ? 'Fix the issues above to continue' : undefined}
            >
              {isStarting ? 'Starting…' : 'Start Assessment'}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function CheckIcon({ status }: { status: CheckState['status'] }) {
  if (status === 'pass') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
        <CheckCircle2 size={20} className="text-green-600" aria-label="Pass" />
      </div>
    )
  }
  if (status === 'fail') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
        <XCircle size={20} className="text-red-500" aria-label="Fail" />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-surface">
      <Clock size={20} className="text-brand-navy/40" aria-label="Pending" />
    </div>
  )
}
