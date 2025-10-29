import { useEffect, useState } from 'react'
import { emitter } from '@/lib/utils/emitter'

export function useDashboardRefresh() {
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  useEffect(() => {
    const unsubscribe = emitter.on('candidate:finalized', () => {
      setRefreshTrigger(prev => prev + 1)
    })

    return unsubscribe
  }, [])

  return refreshTrigger
}