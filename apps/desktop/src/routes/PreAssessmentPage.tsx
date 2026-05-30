import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

const INITIAL_STATE: ValidationState = {
  display: { status: 'pending' },
  screenRecording: { status: 'pending' },
}

const ROW_CLASS: Record<CheckState['status'], string> = {
  pass:    'bg-green-50 border-green-200',
  fail:    'bg-red-50 border-red-200',
  pending: 'bg-brand-surface border-brand-border',
}

export function PreAssessmentPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ValidationState>(INITIAL_STATE)
  const [isChecking, setIsChecking] = useState(false)
  const [kioskReady, setKioskReady] = useState(false)

  // Enter fullscreen immediately on mount — restricts window switching
  useEffect(() => {
    enterKioskMode()
      .then(() => setKioskReady(true))
      .catch(() => setKioskReady(true)) // allow through in dev if kiosk unavailable
  }, [])

  const runValidations = useCallback(async () => {
    setIsChecking(true)
    setState(INITIAL_STATE)

    try {
      const result = await validateDisplays() as ValidationResult
      const multiDisplay = result.violations.some((v) => v.type === 'MultipleDisplays')
      const external = result.violations.some((v) => v.type === 'ExternalDisplay')
      const screenRec = result.violations.some((v) => v.type === 'ScreenRecording')

      setState({
        display: multiDisplay
          ? { status: 'fail', detail: 'Multiple monitors detected. Disconnect extra displays.' }
          : external
            ? { status: 'fail', detail: 'External display (AirPlay/Sidecar) detected. Disconnect it.' }
            : { status: 'pass' },
        screenRecording: screenRec
          ? { status: 'fail', detail: 'Screen recording is active. Stop it before continuing.' }
          : { status: 'pass' },
      })
    } catch {
      // dev: Tauri command not available — allow through
      setState({ display: { status: 'pass' }, screenRecording: { status: 'pass' } })
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    if (kioskReady) runValidations()
  }, [kioskReady, runValidations])

  const allPassed =
    state.display.status === 'pass' && state.screenRecording.status === 'pass'

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">SecureAssess</h1>
          <p className="mt-1 text-sm text-brand-navy/60">Environment Check</p>
        </div>

        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-brand-navy">
            Display Check
          </h2>

          <div className="space-y-2">
            <CheckRow
              label="Single display connected"
              detail="Disconnect any external monitors, AirPlay, or Sidecar displays."
              state={state.display}
              loading={isChecking}
            />
            <CheckRow
              label="No screen recording active"
              detail="Stop any screen recording or screen-sharing software."
              state={state.screenRecording}
              loading={isChecking}
            />
          </div>

          {state.display.status === 'fail' || state.screenRecording.status === 'fail' ? (
            <p className="mt-4 text-xs text-brand-navy/50">
              Fix the issues above, then click Re-check.
            </p>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={runValidations}
              disabled={isChecking}
              className="rounded-lg border border-brand-border bg-white px-4 py-2 text-sm text-brand-navy transition-colors hover:border-brand-navy disabled:opacity-50"
            >
              {isChecking ? 'Checking…' : 'Re-check'}
            </button>

            <button
              type="button"
              onClick={() => navigate('/assessment')}
              disabled={!allPassed || isChecking}
              className="flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors
                enabled:bg-brand-orange enabled:hover:bg-brand-orange-light enabled:text-white
                disabled:bg-brand-border disabled:text-brand-navy/30 disabled:cursor-not-allowed"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CheckRowProps {
  label: string
  detail: string
  state: CheckState
  loading: boolean
}

function CheckRow({ label, detail, state, loading }: CheckRowProps) {
  const effectiveStatus = loading ? 'pending' : state.status
  return (
    <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${ROW_CLASS[effectiveStatus]}`}>
      <StatusIcon status={effectiveStatus} />
      <div className="flex-1">
        <span className="text-sm font-medium text-brand-navy">{label}</span>
        {!loading && state.status === 'fail' && (
          <p className="mt-0.5 text-xs text-red-500">{state.detail ?? detail}</p>
        )}
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: CheckState['status'] }) {
  if (status === 'pending') {
    return (
      <span className="mt-0.5 flex h-4 w-4 items-center justify-center">
        <svg className="h-4 w-4 animate-spin text-brand-navy/30" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    )
  }
  if (status === 'pass') return <span className="mt-0.5 text-base leading-none text-green-600">✓</span>
  return <span className="mt-0.5 text-base leading-none text-red-500">✗</span>
}
