import { type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { OfflineBanner } from './OfflineBanner'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col h-screen bg-white text-brand-navy">
      <OfflineBanner />
      <div className="flex flex-1 flex-col min-h-0">
        {children}
      </div>
      <Toaster position="top-right" richColors />
    </div>
  )
}
