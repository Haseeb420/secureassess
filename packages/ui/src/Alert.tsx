import { type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from './lib/utils'

type AlertVariant = 'error' | 'success' | 'warning' | 'info'

const VARIANTS = {
  error:   { bg: 'bg-red-50 border-red-200',     icon: AlertCircle,   iconClass: 'text-red-500',    textClass: 'text-red-700' },
  success: { bg: 'bg-green-50 border-green-200',  icon: CheckCircle2,  iconClass: 'text-green-600',  textClass: 'text-green-700' },
  warning: { bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle, iconClass: 'text-amber-500',  textClass: 'text-amber-700' },
  info:    { bg: 'bg-blue-50 border-blue-200',    icon: Info,          iconClass: 'text-blue-500',   textClass: 'text-blue-700' },
}

interface AlertProps {
  variant?: AlertVariant
  children: ReactNode
  className?: string
}

export function Alert({ variant = 'error', children, className }: AlertProps) {
  const { bg, icon: Icon, iconClass, textClass } = VARIANTS[variant]
  return (
    <div role="alert" className={cn('flex items-start gap-2 rounded-lg border px-4 py-3', bg, className)}>
      <Icon size={16} className={cn('mt-0.5 shrink-0', iconClass)} aria-hidden="true" />
      <p className={cn('text-sm', textClass)}>{children}</p>
    </div>
  )
}
