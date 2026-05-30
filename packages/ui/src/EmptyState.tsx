import { type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from './lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-surface">
        <Icon size={24} className="text-brand-navy/40" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-brand-navy">{title}</h3>
      {description && <p className="mb-4 text-sm text-brand-navy/60">{description}</p>}
      {action}
    </div>
  )
}
