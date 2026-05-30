import { redirect } from 'next/navigation'
import { QueryProvider } from '../../components/QueryProvider'
import { Sidebar } from '../../components/Sidebar'
import { createClient } from '../../lib/supabase/server'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <QueryProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar userEmail={user.email ?? ''} />
        <main className="flex-1 overflow-y-auto bg-brand-surface text-brand-navy">
          {children}
        </main>
      </div>
    </QueryProvider>
  )
}
