'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store'
import { selectProfile, selectResumeText, selectCurrentIndex, selectQuestionForIndex, selectTimerForIndex, setTimer } from '@/store/slices/session'
import { requireProfileComplete } from '@/lib/navigation/guards'
import { QuestionRunner } from '@/app/(interview)/interviewee/QuestionRunner'
import { remainingMs } from '@/lib/timers'

export default function InterviewPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const profile = useAppSelector(selectProfile)
  const resumeText = useAppSelector(selectResumeText)
  const currentIndex = useAppSelector(selectCurrentIndex)
  const question = useAppSelector(state => selectQuestionForIndex(state, currentIndex))
  const timer = useAppSelector(state => selectTimerForIndex(state, currentIndex))
  const [remainingTime, setRemainingTime] = useState<number>(0)
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Check if profile is complete using the guard
    if (!requireProfileComplete(profile)) {
      console.log('Profile incomplete, redirecting to /profile')
      setIsRedirecting(true)
      router.replace('/profile')
      return
    }

    // Also check if we have resume text - if not, redirect to intake
    if (!resumeText || resumeText.trim().length === 0) {
      console.log('No resume text found, redirecting to /intake')
      setIsRedirecting(true)
      router.replace('/intake')
      return
    }
  }, [profile, resumeText, router])

  // Initialize timer if missing but question exists
  useEffect(() => {
    if (question && !timer) {
      dispatch(setTimer({
        index: currentIndex,
        startedAt: Date.now(),
        durationMs: question.targetDurationMs
      }))
    }
  }, [question, timer, currentIndex, dispatch])

  // Update remaining time every second
  useEffect(() => {
    if (!timer) return

    const updateRemainingTime = () => {
      const remaining = remainingMs(timer.startedAt, timer.durationMs)
      setRemainingTime(Math.max(0, remaining))
    }

    updateRemainingTime()
    const interval = setInterval(updateRemainingTime, 1000)

    return () => clearInterval(interval)
  }, [timer])

  // Don't render anything if profile is incomplete (will redirect)
  if (!requireProfileComplete(profile) || !resumeText || isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading interview...</p>
        </div>
      </div>
    )
  }

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner */}
      {question && (
        <div className="bg-blue-600 text-white py-3 px-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div className="text-sm font-medium">
              Question {currentIndex + 1} of 6
            </div>
            <div className="text-sm">
              {timer ? formatTime(remainingTime) : 'Loading...'}
            </div>
          </div>
        </div>
      )}

      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <QuestionRunner stage="interviewing" data-testid="question-runner-root" />
        </div>
      </div>
    </div>
  )
}
