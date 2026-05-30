import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { OfflineBanner } from './OfflineBanner'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white text-brand-navy">
      <OfflineBanner />
      {children}
      <Toaster position="top-right" richColors />
    </div>
  )
}
