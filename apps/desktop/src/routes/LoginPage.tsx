import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'framer-motion'
import { Mail, Lock, Key } from 'lucide-react'
import { toast } from 'sonner'
import { loginSchema, inviteTokenSchema, type LoginFormValues, type InviteTokenFormValues } from '@secureassess/shared-types'
import { FormField, Input, Alert, Button } from '@secureassess/ui'
import { useAuth } from '../features/auth/useAuth'

type Tab = 'email' | 'token'

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
    <motion.div
      className="min-h-screen bg-brand-surface flex items-center justify-center px-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">SecureAssess</h1>
          <p className="mt-1 text-sm text-brand-navy/60">Secure software engineering assessment</p>
        </div>

        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-8">
          {/* Tab bar */}
          <div className="mb-6 flex border-b border-brand-border">
            {(['email', 'token'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => switchTab(tab)}
                className={[
                  'flex-1 pb-2.5 text-sm font-medium transition-colors',
                  activeTab === tab
                    ? 'border-b-2 border-brand-orange text-brand-orange'
                    : 'text-brand-navy/50 hover:text-brand-navy',
                ].join(' ')}
              >
                {tab === 'email' ? 'Email & Password' : 'Invite Token'}
              </button>
            ))}
          </div>

          {serverError && (
            <Alert variant="error" className="mb-4">
              {serverError}
            </Alert>
          )}

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
                className="w-full mt-2 active:scale-[0.97]"
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
                  placeholder="xxxx-xxxx-xxxx"
                  leftIcon={Key}
                  disabled={isLoading}
                  error={!!tokenForm.formState.errors.token}
                  aria-required="true"
                  {...tokenForm.register('token')}
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="w-full mt-2 active:scale-[0.97]"
              >
                {isLoading ? <Spinner /> : 'Verify Token'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </motion.div>
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
