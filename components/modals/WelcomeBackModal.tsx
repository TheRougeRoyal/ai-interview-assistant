'use client'

import { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RootState } from '@/store'
import { selectIsResumable, selectRemainingMsForIndex, resetInterview } from '@/store/slices/session'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function WelcomeBackModal() {
  const dispatch = useDispatch()
  const session = useSelector((state: RootState) => state.session)
  const isResumable = useSelector(selectIsResumable)
  
  const [isOpen, setIsOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [remainingTime, setRemainingTime] = useState('')
  const [isHydrated, setIsHydrated] = useState(false)

  // Wait for client-side hydration
  useEffect(() => {
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (isHydrated && isResumable && !dismissed) {
      setIsOpen(true)
    }
  }, [isHydrated, isResumable, dismissed])

  useEffect(() => {
    if (!isOpen || !isResumable || !isHydrated) return

    const updateRemainingTime = () => {
      // Safety check for undefined state
      if (!session || typeof session.currentIndex !== 'number') {
        setRemainingTime('')
        return
      }

      const remainingMs = selectRemainingMsForIndex({ session }, session.currentIndex)

      if (remainingMs <= 0) {
        setRemainingTime('Time expired')
      } else {
        const totalSeconds = Math.ceil(remainingMs / 1000)
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        setRemainingTime(`${minutes}:${seconds.toString().padStart(2, '0')} remaining`)
      }
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [isOpen, isResumable, isHydrated, session])

  const handleContinue = () => {
    setIsOpen(false)
    setDismissed(true)
  }

  const handleStartOver = () => {
    dispatch(resetInterview({ keepProfile: true }))
    setIsOpen(false)
    setDismissed(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setDismissed(true)
  }

  if (!isResumable) return null

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) handleClose()
      }}
    >
      <DialogContent 
        className="sm:max-w-md"
        onEscapeKeyDown={handleClose}
        onPointerDownOutside={handleClose}
      >
        <DialogHeader>
          <DialogTitle>Welcome back</DialogTitle>
          <DialogDescription>
            You have an interview in progress (Q{(session as any).currentIndex + 1}/6). 
            Continue where you left off?
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <div className="text-sm font-medium">Current Progress</div>
            <div className="text-xs text-muted-foreground mt-1">
              Question {(session as any).currentIndex + 1} of 6 • {remainingTime}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleStartOver}
              className="focus:ring-2 focus:ring-destructive"
            >
              Start Over
            </Button>
            <Button
              onClick={handleContinue}
              className="focus:ring-2 focus:ring-primary"
            >
              Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}