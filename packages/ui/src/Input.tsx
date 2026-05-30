import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from './lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  onRightIconClick?: () => void
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon: LeftIcon, rightIcon: RightIcon, onRightIconClick, error, className, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false)

    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

    const VisibilityIcon = showPassword ? EyeOff : Eye

    return (
      <div className="relative">
        {LeftIcon && (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-navy/40">
            <LeftIcon size={16} />
          </span>
        )}
        <input
          ref={ref}
          type={inputType}
          className={cn(
            'w-full rounded-lg border bg-white px-3 py-2 text-sm text-brand-navy',
            'placeholder-brand-navy/30 outline-none transition-colors',
            'focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error ? 'border-red-400 focus:border-red-400 focus:ring-red-200' : 'border-brand-border',
            LeftIcon && 'pl-9',
            (RightIcon || isPassword) && 'pr-9',
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy transition-colors"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            <VisibilityIcon size={16} />
          </button>
        )}
        {RightIcon && !isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={onRightIconClick}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-navy/40 hover:text-brand-navy transition-colors"
          >
            <RightIcon size={16} />
          </button>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
