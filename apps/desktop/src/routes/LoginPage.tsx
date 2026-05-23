import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/useAuth'

type LoginMode = 'email' | 'token'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithToken, isLoading, error } = useAuth()

  const [mode, setMode] = useState<LoginMode>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteToken, setInviteToken] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const displayError = validationError ?? error

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    if (!email.trim()) return setValidationError('Email is required')
    if (!password) return setValidationError('Password is required')
    try {
      await login(email.trim(), password)
      navigate('/pre-assessment')
    } catch {
      // error is set by useAuth
    }
  }

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    if (!inviteToken.trim()) return setValidationError('Invite token is required')
    try {
      await loginWithToken(inviteToken.trim())
      navigate('/pre-assessment')
    } catch {
      // error is set by useAuth
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-white">SecureAssess</h1>
          <p className="mt-1 text-sm text-zinc-500">Secure Software Engineering Assessment</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          {/* Mode toggle */}
          <div className="mb-6 flex rounded-md border border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={() => { setMode('email'); setValidationError(null) }}
              disabled={isLoading}
              className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
                mode === 'email'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Login with Email
            </button>
            <button
              type="button"
              onClick={() => { setMode('token'); setValidationError(null) }}
              disabled={isLoading}
              className={`flex-1 rounded py-1.5 text-sm font-medium transition-colors ${
                mode === 'token'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Login with Invite Token
            </button>
          </div>

          {/* Email form */}
          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 disabled:opacity-50"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 disabled:opacity-50"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {displayError && (
                <p className="mt-4 text-sm text-red-400">{displayError}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center rounded-md bg-white py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? <Spinner /> : 'Sign In'}
              </button>
            </form>
          )}

          {/* Token form */}
          {mode === 'token' && (
            <form onSubmit={handleTokenSubmit} noValidate>
              <div>
                <label htmlFor="invite-token" className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Invite Token
                </label>
                <input
                  id="invite-token"
                  type="text"
                  autoComplete="off"
                  disabled={isLoading}
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 disabled:opacity-50"
                  placeholder="Paste your invite token here"
                />
              </div>

              {displayError && (
                <p className="mt-4 text-sm text-red-400">{displayError}</p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 flex w-full items-center justify-center rounded-md bg-white py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isLoading ? <Spinner /> : 'Verify Token'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
