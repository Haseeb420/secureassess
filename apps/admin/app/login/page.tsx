import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

async function signIn(formData: FormData): Promise<{ error: string } | never> {
  'use server'
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) return { error: error.message }
  redirect('/dashboard')
}

interface PageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const params = await searchParams
  const errorMessage = params?.error

  return (
    <div className="min-h-screen bg-brand-surface flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-navy">SecureAssess</h1>
          <p className="mt-1 text-sm text-brand-navy/60">Admin Portal</p>
        </div>

        <div className="rounded-xl border border-brand-border bg-white shadow-sm p-8">
          <h2 className="mb-6 text-base font-semibold text-brand-navy">Sign in to your account</h2>

          <LoginForm errorMessage={errorMessage} />
        </div>
      </div>
    </div>
  )
}

function LoginForm({ errorMessage }: { errorMessage?: string }) {
  return (
    <form
      action={async (formData: FormData) => {
        'use server'
        const result = await signIn(formData)
        if (result?.error) {
          redirect(`/login?error=${encodeURIComponent(result.error)}`)
        }
      }}
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-navy">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-navy">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
          />
        </div>
      </div>

      {errorMessage && (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
          {errorMessage}
        </p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-lg bg-brand-orange py-2.5 text-sm font-medium text-white hover:bg-brand-orange-light transition-colors"
      >
        Sign In
      </button>
    </form>
  )
}
