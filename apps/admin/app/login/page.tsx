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
    <div className="min-h-screen bg-brand-navy-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-brand-orange">SecureAssess</h1>
          <p className="mt-1 text-sm text-white/50">Admin Portal</p>
        </div>

        <div className="rounded-lg border border-brand-navy-light bg-brand-navy-mid p-6">
          <h2 className="mb-6 text-base font-medium text-white">Sign in to your account</h2>

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
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            placeholder="admin@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-zinc-400">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
            placeholder="••••••••"
          />
        </div>
      </div>

      {errorMessage && (
        <p className="mt-4 text-sm text-red-400">{errorMessage}</p>
      )}

      <button
        type="submit"
        className="mt-6 w-full rounded-md bg-white py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90"
      >
        Sign In
      </button>
    </form>
  )
}
