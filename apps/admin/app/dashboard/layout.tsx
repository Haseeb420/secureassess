import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '../../lib/auth'
import { QueryProvider } from '../../components/QueryProvider'
import { Sidebar } from '../../components/Sidebar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<Record<string, string>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) redirect('/login')

  const role = (session.user as { role?: string }).role ?? 'candidate'

  if (role === 'candidate') redirect('/login')

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-brand-surface text-brand-navy">
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
