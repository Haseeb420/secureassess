import { redirect } from 'next/navigation'
import { createClient } from '../../lib/supabase/server'

async function signOut() {
  'use server'
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">SecureAssess Admin</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">{user.email}</span>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">Welcome, {user.email}</p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Assessments', value: '—' },
            { label: 'Active Candidates', value: '—' },
            { label: 'Submissions Today', value: '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
            >
              <p className="text-xs font-medium text-zinc-500">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold">{stat.value}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
