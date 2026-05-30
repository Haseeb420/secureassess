import { cn } from './lib/utils'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'orange' | 'blue'

const VARIANTS: Record<BadgeVariant, string> = {
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  danger:  'bg-red-100 text-red-600',
  neutral: 'bg-brand-surface text-brand-navy/60',
  orange:  'bg-brand-orange-pale text-brand-orange',
  blue:    'bg-blue-100 text-blue-700',
}

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', VARIANTS[variant], className)}>
      {children}
    </span>
  )
}
