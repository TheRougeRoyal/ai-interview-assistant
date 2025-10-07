import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface InlineStatusProps {
  variant: 'success' | 'error' | 'warn' | 'info'
  children: ReactNode
  className?: string
}

const variantStyles: Record<InlineStatusProps['variant'], string> = {
  success: 'text-green-600 dark:text-green-400',
  error: 'text-red-600 dark:text-red-500',
  warn: 'text-amber-600 dark:text-amber-500',
  info: 'text-blue-600 dark:text-blue-500',
}

/** Inline status message with semantic color */
export function InlineStatus({ variant, children, className }: InlineStatusProps) {
  return (
    <div role="status" className={cn('flex items-center gap-2 text-sm', variantStyles[variant], className)}>
      <span className="inline-block w-2 h-2 rounded-full bg-current" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
