import Link from 'next/link'
import { QueryProvider } from '../../components/QueryProvider'

const NAV = [
  { label: 'Assessments', href: '/dashboard/assessments' },
  { label: 'Questions', href: '/dashboard/questions' },
  { label: 'Monitor', href: '/dashboard/monitor' },
  { label: 'Reports', href: '/dashboard/reports' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="flex w-60 shrink-0 flex-col bg-[#111] border-r border-zinc-800">
          <div className="px-5 py-5 border-b border-zinc-800">
            <span className="text-sm font-semibold text-white tracking-wide">SecureAssess</span>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto bg-[#0f0f0f] text-white">
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
