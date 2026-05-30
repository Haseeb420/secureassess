import { type ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-brand-navy-dark text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
