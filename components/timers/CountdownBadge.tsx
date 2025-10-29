'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'

interface CountdownBadgeProps {
  startedAt: number
  durationMs: number
  className?: string
}

export function CountdownBadge({ startedAt, durationMs, className }: CountdownBadgeProps) {
  const [remainingMs, setRemainingMs] = useState(0)

  useEffect(() => {
    const updateRemaining = () => {
      const elapsed = Date.now() - startedAt
      const remaining = Math.max(0, durationMs - elapsed)
      setRemainingMs(remaining)

      if (remaining > 0) {
        requestAnimationFrame(updateRemaining)
      }
    }

    updateRemaining()
  }, [startedAt, durationMs])

  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const isExpired = remainingMs === 0
  const isUrgent = remainingMs < 10000

  return (
    <Badge 
      variant={isExpired ? 'destructive' : isUrgent ? 'secondary' : 'default'}
      className={className}
      data-testid="countdown-badge"
    >
      {isExpired ? 'Time Up!' : `${remainingSeconds}s`}
    </Badge>
  )
}