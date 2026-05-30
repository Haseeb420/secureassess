import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  Clock,
  Key,
  Lock,
  Mail,
  ShieldCheck,
  Wifi,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  loginSchema,
  inviteTokenSchema,
  type LoginFormValues,
  type InviteTokenFormValues,
} from '@secureassess/shared-types'
import { FormField, Input, Button } from '@secureassess/ui'
import { useAuth } from '../features/auth/useAuth'

type Tab = 'email' | 'token'

const FEATURES = [
  { icon: ShieldCheck, label: 'Secure environment monitoring' },
  { icon: Clock,       label: 'Auto-saves your progress' },
  { icon: Wifi,        label: 'Works offline, syncs automatically' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithToken } = useAuth()
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
      await loginWithToken(values.token)
      toast.success('Token verified. Starting assessment setup…')
      navigate('/pre-assessment')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Token is invalid or has expired.')
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left: brand panel */}
      <div className="hidden w-[45%] flex-col bg-brand-navy md:flex">
        {/* Logo + name */}
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/20">
            <ShieldCheck size={28} className="text-brand-orange" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">SecureAssess</h1>
          <p className="mt-1 text-sm text-white/50">Trusted assessment platform</p>
        </div>

        {/* Feature list */}
        <div className="px-12 pb-14 space-y-4">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon size={16} className="shrink-0 text-brand-orange" aria-hidden="true" />
              <span className="text-sm text-white/70">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <motion.div
        className="flex flex-1 flex-col items-center justify-center bg-white px-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-brand-navy">Welcome back</h2>
            <p className="mt-1 text-sm text-brand-navy/60">
              Sign in to continue your assessment
            </p>
          </div>

          {/* Tab toggle */}
          <div className="mb-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => switchTab('email')}
              className={[
                'text-sm transition-colors',
                activeTab === 'email'
                  ? 'font-medium text-brand-orange underline underline-offset-4'
                  : 'text-brand-navy/50 hover:text-brand-navy',
              ].join(' ')}
            >
              Email
            </button>
            <span className="text-brand-navy/30" aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => switchTab('token')}
              className={[
                'text-sm transition-colors',
                activeTab === 'token'
                  ? 'font-medium text-brand-orange underline underline-offset-4'
                  : 'text-brand-navy/50 hover:text-brand-navy',
              ].join(' ')}
            >
              Invite Token
            </button>
          </div>

          {/* Server error */}
          {serverError && (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" aria-hidden="true" />
              <p className="text-sm text-red-700">{serverError}</p>
            </div>
          )}

          {/* Email form */}
          {activeTab === 'email' ? (
            <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="space-y-4">
              <FormField
                label="Email"
                required
                error={emailForm.formState.errors.email?.message}
              >
                <Input
                  type="email"
                  placeholder="you@company.com"
                  leftIcon={Mail}
                  disabled={isLoading}
                  error={!!emailForm.formState.errors.email}
                  aria-required="true"
                  aria-describedby={emailForm.formState.errors.email ? 'email-error' : undefined}
                  {...emailForm.register('email')}
                />
              </FormField>

              <FormField
                label="Password"
                required
                error={emailForm.formState.errors.password?.message}
              >
                <Input
                  type="password"
                  placeholder="••••••••"
                  leftIcon={Lock}
                  disabled={isLoading}
                  error={!!emailForm.formState.errors.password}
                  aria-required="true"
                  {...emailForm.register('password')}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="mt-2 w-full"
              >
                {isLoading ? <Spinner /> : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={tokenForm.handleSubmit(onTokenSubmit)} noValidate className="space-y-4">
              <FormField
                label="Invite Token"
                required
                error={tokenForm.formState.errors.token?.message}
                hint="Paste the token from your assessment invitation email"
              >
                <Input
                  placeholder="xxxx-xxxx-xxxx-xxxx"
                  leftIcon={Key}
                  disabled={isLoading}
                  error={!!tokenForm.formState.errors.token}
                  aria-required="true"
                  className="font-mono tracking-wider"
                  {...tokenForm.register('token')}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="mt-2 w-full"
              >
                {isLoading ? <Spinner /> : 'Verify & Continue'}
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-xs text-brand-navy/40">
            Need help? Contact your assessment coordinator.
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
