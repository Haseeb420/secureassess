import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from './lib/utils'

interface FormFieldProps {
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: ReactNode
  className?: string
}

export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="block text-sm font-medium text-brand-navy">
        {label}
        {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-brand-navy/50">{hint}</p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            role="alert"
            aria-live="polite"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="text-xs text-red-600 overflow-hidden"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
