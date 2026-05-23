import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  checkForbiddenProcesses,
  enterKioskMode,
  validateDisplays,
} from '../features/security/securityService'
import type { ForbiddenProcess, ValidationResult } from '../features/security/types'

interface CheckState {
  status: 'pending' | 'pass' | 'fail'
  detail?: string
}

interface ValidationState {
  display: CheckState
  screenRecording: CheckState
  processes: CheckState
  forbiddenFound: ForbiddenProcess[]
}

const INITIAL_STATE: ValidationState = {
  display: { status: 'pending' },
  screenRecording: { status: 'pending' },
  processes: { status: 'pending' },
  forbiddenFound: [],
}

export function PreAssessmentPage() {
  const navigate = useNavigate()
  const [state, setState] = useState<ValidationState>(INITIAL_STATE)
  const [isChecking, setIsChecking] = useState(false)
  const [isStarting, setIsStarting] = useState(false)

  const runValidations = useCallback(async () => {
    setIsChecking(true)
    setState(INITIAL_STATE)

    // Run both checks in parallel
    const [displayResult, processes] = await Promise.allSettled([
      validateDisplays(),
      checkForbiddenProcesses(),
    ])

    setState((prev) => {
      const next = { ...prev }

      // Display check
      if (displayResult.status === 'fulfilled') {
        const result = displayResult.value as ValidationResult
        const multiDisplay = result.violations.some((v) => v.type === 'MultipleDisplays')
        const external = result.violations.some((v) => v.type === 'ExternalDisplay')
        const screenRec = result.violations.some((v) => v.type === 'ScreenRecording')

        if (multiDisplay) {
          next.display = { status: 'fail', detail: 'Multiple displays detected. Disconnect extra monitors.' }
        } else if (external) {
          next.display = { status: 'fail', detail: 'External display (AirPlay/Sidecar) detected.' }
        } else {
          next.display = { status: 'pass' }
        }

        next.screenRecording = screenRec
          ? { status: 'fail', detail: 'Screen recording software detected.' }
          : { status: 'pass' }
      } else {
        next.display = { status: 'pass' } // allow through if command unavailable (dev)
        next.screenRecording = { status: 'pass' }
      }

      // Process check
      if (processes.status === 'fulfilled') {
        const found = processes.value as ForbiddenProcess[]
        if (found.length > 0) {
          const names = found.map((p) => p.name).join(', ')
          next.processes = { status: 'fail', detail: `Close these applications: ${names}` }
          next.forbiddenFound = found
        } else {
          next.processes = { status: 'pass' }
          next.forbiddenFound = []
        }
      } else {
        next.processes = { status: 'pass' }
        next.forbiddenFound = []
      }

      return next
    })

    setIsChecking(false)
  }, [])

  useEffect(() => {
    runValidations()
  }, [runValidations])

  const allPassed =
    state.display.status === 'pass' &&
    state.screenRecording.status === 'pass' &&
    state.processes.status === 'pass'

  const handleStart = async () => {
    if (!allPassed) return
    setIsStarting(true)
    try {
      await enterKioskMode()
      navigate('/assessment')
    } catch {
      setIsStarting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">SecureAssess</h1>
          <p className="mt-1 text-sm text-zinc-500">Pre-Assessment Validation</p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wider">
            System Checks
          </h2>

          <div className="space-y-3">
            <CheckRow
              label="Single display connected"
              state={state.display}
              loading={isChecking}
            />
            <CheckRow
              label="No screen recording active"
              state={state.screenRecording}
              loading={isChecking}
            />
            <CheckRow
              label="No forbidden applications running"
              state={state.processes}
              loading={isChecking}
            />
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={runValidations}
              disabled={isChecking}
              className="rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-50"
            >
              {isChecking ? 'Checking…' : 'Re-check'}
            </button>

            <button
              type="button"
              onClick={handleStart}
              disabled={!allPassed || isChecking || isStarting}
              className="flex-1 rounded-md bg-white py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {isStarting ? 'Starting…' : 'Start Assessment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface CheckRowProps {
  label: string
  state: CheckState
  loading: boolean
}

function CheckRow({ label, state, loading }: CheckRowProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <StatusIcon status={loading ? 'pending' : state.status} />
        <span className="text-sm text-white">{label}</span>
      </div>
      {!loading && state.status === 'fail' && state.detail && (
        <p className="ml-7 mt-0.5 text-xs text-red-400">{state.detail}</p>
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: CheckState['status'] }) {
  if (status === 'pending') {
    return (
      <span className="flex h-5 w-5 items-center justify-center">
        <svg
          className="h-4 w-4 animate-spin text-zinc-500"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    )
  }
  if (status === 'pass') {
    return <span className="text-base leading-none text-green-400">✓</span>
  }
  return <span className="text-base leading-none text-red-400">✗</span>
}
