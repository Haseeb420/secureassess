import type { ReactNode } from 'react'
import { cn } from '@secureassess/ui'

interface PageWrapperProps {
  children: ReactNode
  className?: string
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <div
      className={cn('page-enter h-full w-full', className)}
    >
      {children}
    </div>
  )
}
