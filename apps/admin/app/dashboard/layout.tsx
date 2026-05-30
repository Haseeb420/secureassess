import { redirect } from 'next/navigation'
import Link from 'next/link'
import { QueryProvider } from '../../components/QueryProvider'
import { createClient } from '../../lib/supabase/server'

const NAV = [
  { label: 'Assessments', href: '/dashboard/assessments' },
  { label: 'Questions', href: '/dashboard/questions' },
  { label: 'Monitor', href: '/dashboard/monitor' },
  { label: 'Reports', href: '/dashboard/reports' },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col bg-brand-navy border-r border-brand-navy-light">
          <div className="px-5 py-5 border-b border-brand-navy-light">
            <span className="text-sm font-semibold text-brand-orange tracking-wide">SecureAssess</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/70 hover:bg-brand-navy-light hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto bg-brand-navy-dark text-white">
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
