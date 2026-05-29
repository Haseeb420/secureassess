import { type ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
