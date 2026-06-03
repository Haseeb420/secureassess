import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff, Mail, Save, ShieldCheck, Wifi } from 'lucide-react'
import { toast } from 'sonner'
import {
  loginSchema,
  inviteTokenSchema,
  type LoginFormValues,
  type InviteTokenFormValues,
} from '@secureassess/shared-types'
import type { LandingPageData } from '@secureassess/shared-types'
import { cn } from '@secureassess/ui'
import { useAuth } from '../features/auth/useAuth'
import { useAssessmentStore } from '../store/assessmentStore'
import { validateToken } from '../lib/apiClient'
import { getAssessmentStatus } from '../lib/schedule'

type Tab = 'email' | 'token'

const FEATURES = [
  { Icon: ShieldCheck, text: 'Environment monitored throughout' },
  { Icon: Save,        text: 'Work auto-saved every 3 seconds' },
  { Icon: Wifi,        text: 'Continues offline automatically' },
] as const

function HexShape() {
  return (
    <svg width="180" height="180" viewBox="0 0 200 200" fill="none" aria-hidden="true">
      <polygon
        points="173.6,57.5 173.6,142.5 100,185 26.4,142.5 26.4,57.5 100,15"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="1.5"
      />
      <polygon
        points="153,68 153,132 100,163 47,132 47,68 100,37"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="1"
      />
    </svg>
  )
}

interface FloatingInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string
  label: string
  error?: string
  leftIcon?: ReactNode
}

const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  ({ id, label, error, leftIcon, className, type, onChange, onBlur, defaultValue, ...props }, ref) => {
    const [focused, setFocused] = useState(false)
    const [hasValue, setHasValue] = useState(Boolean(defaultValue))
    const [showPw, setShowPw] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword ? (showPw ? 'text' : 'password') : type
    const isFloated = focused || hasValue

    return (
      <div>
        <div className="relative">
          {leftIcon && (
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30">
              {leftIcon}
            </span>
          )}
          <label
            htmlFor={id}
            className="pointer-events-none absolute transition-all duration-150"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              left: leftIcon ? '44px' : '16px',
              top: isFloated ? '7px' : '14px',
              fontSize: isFloated ? '11px' : '14px',
              color: error && isFloated
                ? '#ef4444'
                : isFloated
                ? '#DE5E1F'
                : 'rgba(42,42,71,0.5)',
            }}
          >
            {label}
          </label>
          <input
            ref={ref}
            id={id}
            type={inputType}
            defaultValue={defaultValue}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false)
              setHasValue(e.target.value.length > 0)
              onBlur?.(e)
            }}
            onChange={(e) => {
              setHasValue(e.target.value.length > 0)
              onChange?.(e)
            }}
            className={cn(
              'w-full rounded-xl border bg-white text-sm text-brand-navy outline-none transition-colors duration-150',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error
                ? 'border-red-300'
                : focused
                ? 'border-brand-orange'
                : 'border-brand-border',
              className,
            )}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              paddingTop: '22px',
              paddingBottom: '8px',
              paddingLeft: leftIcon ? '44px' : '16px',
              paddingRight: isPassword ? '44px' : '16px',
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy transition-colors"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
        </div>
        <AnimatePresence>
          {error && (
            <motion.p
              key="error"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              role="alert"
              style={{ overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}
              className="ml-1 mt-1 text-xs text-red-500"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    )
  },
)
FloatingInput.displayName = 'FloatingInput'

interface SubmitButtonProps {
  isLoading: boolean
  label: string
  color: 'navy' | 'orange'
}

function SubmitButton({ isLoading, label, color }: SubmitButtonProps) {
  const bg = color === 'navy' ? '#2A2A47' : '#DE5E1F'
  const bgHover = color === 'navy' ? '#3A3A60' : '#F06B28'

  return (
    <button
      type="submit"
      disabled={isLoading}
      className="relative w-full overflow-hidden rounded-xl text-white disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-orange focus:ring-offset-2"
      style={{ height: '48px', backgroundColor: bg, transition: 'background-color 150ms' }}
      onMouseEnter={(e) => {
        if (!isLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = bgHover
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = bg
      }}
    >
      <span
        style={{
          fontFamily: isLoading ? "'DM Mono', monospace" : "'DM Sans', sans-serif",
          fontSize: isLoading ? '12px' : '14px',
          fontWeight: isLoading ? 400 : 500,
          letterSpacing: isLoading ? '0.03em' : 'normal',
        }}
      >
        {isLoading ? 'Authenticating...' : label}
      </span>
      {isLoading && (
        <motion.div
          className="absolute bottom-0 left-0 h-0.5"
          style={{
            width: '40%',
            backgroundColor: color === 'navy' ? '#DE5E1F' : 'rgba(255,255,255,0.55)',
          }}
          initial={{ x: '-100%' }}
          animate={{ x: '250%' }}
          transition={{
            duration: 1.4,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'loop',
            repeatDelay: 0.15,
          }}
        />
      )}
    </button>
  )
}

const TOKEN_ERROR_MESSAGES: Record<string, string> = {
  not_found:           'This token does not exist. Check for typos.',
  expired:             'This token has expired. Contact your coordinator.',
  usage_limit_reached: 'You have used all available attempts for this assessment.',
  assessment_closed:   'This assessment is no longer available.',
}

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { setToken, setLandingData, setCandidateData } = useAssessmentStore()
  const [activeTab, setActiveTab] = useState<Tab>('email')
  const [serverError, setServerError] = useState<string | null>(null)

  const emailForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
  })

  const tokenForm = useForm<InviteTokenFormValues>({
    resolver: zodResolver(inviteTokenSchema),
    mode: 'onBlur',
  })

  const isLoading = emailForm.formState.isSubmitting || tokenForm.formState.isSubmitting

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    setServerError(null)
  }

  const onEmailSubmit = async (values: LoginFormValues) => {
    setServerError(null)
    try {
      await login(values.email, values.password)
      toast.success('Welcome back!')
      navigate('/pre-assessment')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Login failed. Check your credentials.')
    }
  }

  const onTokenSubmit = async (values: InviteTokenFormValues) => {
    setServerError(null)
    try {
      const result = await validateToken(values.token)

      if (!result.valid) {
        setServerError(TOKEN_ERROR_MESSAGES[result.reason] ?? 'Token is invalid.')
        return
      }

      const scheduleInfo = getAssessmentStatus(result.assessment)
      const landingData: LandingPageData = {
        token: result.token,
        assessment: result.assessment,
        assessmentStatus: scheduleInfo.status,
        countdownToMs: scheduleInfo.countdownMs,
        mocks: result.mocks,
        previousAttempts: [],
      }

      setToken(result.token)
      setLandingData(landingData)
      setCandidateData({
        id: result.token.id,
        email: result.token.candidateEmail,
        name: result.token.candidateName,
        organizationId: result.token.organizationId ?? '',
      })

      toast.success('Token verified!')
      navigate('/landing')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Token is invalid or has expired.')
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── LEFT COLUMN (42%) ── */}
      <div className="hidden w-[42%] flex-col bg-brand-navy md:flex">

        {/* Logo — top-left */}
        <div className="flex items-center gap-2.5 px-10 pt-10">
          <img
            src="/wamo-logo.webp"
            alt=""
            role="presentation"
            width={32}
            height={32}
            className="rounded-sm object-contain"
          />
          <span
            className="text-lg font-semibold text-white"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            SecureAssess
          </span>
        </div>

        {/* Centered shape + copy */}
        <div className="flex flex-1 flex-col items-center justify-center px-10">
          <HexShape />
          <div className="mt-8 text-center">
            <h1
              className="text-3xl font-bold leading-tight text-white"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Your assessment<br />environment.
            </h1>
            <p
              className="mt-3 max-w-xs text-sm leading-relaxed text-white/50"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              A secure, monitored space for technical evaluation.
            </p>
          </div>
        </div>

        {/* Feature list — bottom */}
        <div className="flex flex-col gap-3 px-10 pb-12">
          {FEATURES.map(({ Icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <Icon size={15} className="shrink-0 text-brand-orange" aria-hidden="true" />
              <span
                className="text-xs text-white/50"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT COLUMN (58%) ── */}
      <div className="flex flex-1 items-center justify-center bg-white px-8">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Portal label */}
          <p
            className="text-xs font-semibold uppercase text-brand-navy/40"
            style={{ fontFamily: "'DM Sans', sans-serif", letterSpacing: '0.2em' }}
          >
            Candidate Portal
          </p>

          {/* Heading */}
          <h2
            className="mt-2 text-2xl font-bold text-brand-navy"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Sign in to continue
          </h2>

          {/* Tab toggle */}
          <div className="mt-6 mb-6 flex gap-6">
            {(['email', 'token'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => switchTab(tab)}
                  className={cn(
                    'relative pb-1.5 transition-colors duration-150',
                    isActive
                      ? 'text-brand-navy'
                      : 'text-brand-navy/40 hover:text-brand-navy/70',
                  )}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '14px',
                    fontWeight: isActive ? 500 : 400,
                    background: 'none',
                    border: 'none',
                    padding: '0 0 6px 0',
                    cursor: 'pointer',
                  }}
                >
                  {tab === 'email' ? 'Email' : 'Invite Token'}
                  {isActive && (
                    <motion.span
                      layoutId="tab-indicator"
                      className="absolute -bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-orange"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Forms */}
          <AnimatePresence mode="wait">
            {activeTab === 'email' ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                <FloatingInput
                  id="login-email"
                  label="Email"
                  type="email"
                  leftIcon={<Mail size={16} />}
                  error={emailForm.formState.errors.email?.message}
                  aria-required="true"
                  autoComplete="email"
                  disabled={isLoading}
                  {...emailForm.register('email')}
                />
                <FloatingInput
                  id="login-password"
                  label="Password"
                  type="password"
                  error={
                    emailForm.formState.errors.password?.message ??
                    serverError ??
                    undefined
                  }
                  aria-required="true"
                  autoComplete="current-password"
                  disabled={isLoading}
                  {...emailForm.register('password')}
                />
                <SubmitButton isLoading={isLoading} label="Sign In" color="navy" />
              </motion.form>
            ) : (
              <motion.form
                key="token-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                onSubmit={tokenForm.handleSubmit(onTokenSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                <div>
                  <input
                    id="invite-token"
                    placeholder="PASTE YOUR TOKEN"
                    autoComplete="off"
                    spellCheck={false}
                    aria-required="true"
                    disabled={isLoading}
                    className={cn(
                      'w-full rounded-xl border bg-white outline-none transition-all duration-150',
                      'placeholder:text-brand-navy/20 disabled:cursor-not-allowed disabled:opacity-50',
                      tokenForm.formState.errors.token || serverError
                        ? 'border-red-300'
                        : 'border-brand-border focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10',
                    )}
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      letterSpacing: '0.15em',
                      height: '50px',
                      textAlign: 'center',
                      fontSize: '13px',
                      color: '#2A2A47',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                    }}
                    {...tokenForm.register('token')}
                  />
                  <p
                    className="mt-2 text-center text-xs text-brand-navy/30"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Ctrl+V or Cmd+V to paste
                  </p>
                  <AnimatePresence>
                    {(tokenForm.formState.errors.token?.message || serverError) && (
                      <motion.p
                        key="token-error"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        role="alert"
                        style={{ overflow: 'hidden', fontFamily: "'DM Sans', sans-serif" }}
                        className="mt-1 text-center text-xs text-red-500"
                      >
                        {tokenForm.formState.errors.token?.message ?? serverError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <SubmitButton isLoading={isLoading} label="Verify & Continue" color="orange" />
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer */}
          <p
            className="mt-8 text-center text-xs text-brand-navy/30"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Need help? Contact your assessment coordinator.
          </p>
        </motion.div>
      </div>

    </div>
  )
}
