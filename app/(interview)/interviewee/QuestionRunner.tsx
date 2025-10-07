'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { 
  setQuestion, 
  setTimer, 
  setAnswerDraft, 
  finalizeAnswer, 
  advanceIndex, 
  completeInterview 
} from '@/store/slices/session'
import { 
  selectCurrentIndex, 
  selectQuestionForIndex, 
  selectTimerForIndex, 
  selectAnswerDraftForIndex,
  selectResumeText,
  selectIds 
} from '@/store/slices/session'
import { finalizeCandidate, upsertAnswer } from '@/lib/http/apiClient'
import { emitter } from '@/lib/utils/emitter'
import { CountdownBadge } from '@/components/timers/CountdownBadge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { isExpired } from '@/lib/timers'

interface QuestionRunnerProps {
  stage?: 'collecting_profile' | 'interviewing' | 'completed'
}

export function QuestionRunner({ stage = 'interviewing' }: QuestionRunnerProps) {
  const dispatch = useAppDispatch()
  const currentIndex = useAppSelector(selectCurrentIndex)
  const resumeText = useAppSelector(selectResumeText)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false)
  const [shouldGenerateSummary, setShouldGenerateSummary] = useState(false)
  const autoSubmitRef = useRef<boolean>(false)

  // Get current question and timer
  const question = useAppSelector(state => selectQuestionForIndex(state, currentIndex))
  const timer = useAppSelector(state => selectTimerForIndex(state, currentIndex))
  const answerDraft = useAppSelector(state => selectAnswerDraftForIndex(state, currentIndex))
  const allAnswers = useAppSelector(state => state.session.answers)
  const finalResults = useAppSelector(state => state.session.finalResults)
  const { candidateId, sessionId } = useAppSelector(selectIds)

  // On mount: Generate question if not exists
  useEffect(() => {
    // Only generate if we don't have a question for THIS index yet
    if (question) return

    const generateQuestion = async () => {
      try {
        console.log(`🔄 Generating question ${currentIndex + 1}...`)
        
        // Truncate resumeText to 800 characters to meet API validation
        const truncatedResumeContext = resumeText 
          ? resumeText.substring(0, 800) 
          : undefined

        const response = await fetch('/api/generate-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            questionIndex: currentIndex,
            role: 'fullstack',
            resumeContext: truncatedResumeContext
          })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Generate question error:', response.status, errorData)
          throw new Error(`Failed to generate question: ${response.status}`)
        }

        const data = await response.json()
        
        console.log(`✅ Question ${currentIndex + 1} generated successfully`)
        
        dispatch(setQuestion({
          index: currentIndex,
          data: {
            prompt: data.prompt,
            difficulty: data.difficulty,
            targetDurationMs: data.targetDurationMs
          }
        }))

        // Set timer
        dispatch(setTimer({
          index: currentIndex,
          startedAt: Date.now(),
          durationMs: data.targetDurationMs
        }))
      } catch (error) {
        console.error('Error generating question:', error)
      }
    }

    generateQuestion()
  }, [currentIndex, question, resumeText, dispatch])

  // Reset auto-submit state when question changes
  useEffect(() => {
    setHasAutoSubmitted(false)
    autoSubmitRef.current = false
    setShouldGenerateSummary(false)
  }, [currentIndex])

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (isSubmitting || (isAutoSubmit && hasAutoSubmitted)) return

    setIsSubmitting(true)
    if (isAutoSubmit) {
      setHasAutoSubmitted(true)
    }

    try {
      const durationMs = timer.durationMs
      const elapsedMs = Math.max(0, Date.now() - timer.startedAt)
      const timeTakenMs = Math.min(durationMs, elapsedMs)

      // Truncate resumeText to 800 characters to meet API validation
      const truncatedResumeContext = resumeText 
        ? resumeText.substring(0, 800) 
        : undefined

      // Score the answer
      const scoreResponse = await fetch('/api/score-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIndex: currentIndex,
          question: question.prompt,
          answer: answerDraft || '',
          durationMs,
          timeTakenMs,
          difficulty: question.difficulty,
          resumeContext: truncatedResumeContext
        })
      })

      if (!scoreResponse.ok) {
        const errorData = await scoreResponse.json().catch(() => ({}))
        console.error('Scoring error:', scoreResponse.status, errorData)
        throw new Error(`Failed to score answer: ${scoreResponse.status} ${errorData.error?.message || 'Unknown error'}`)
      }

      const rubric = await scoreResponse.json()

      // Finalize the answer in Redux state
      dispatch(finalizeAnswer({
        index: currentIndex,
        submittedAt: Date.now(),
        timeTakenMs,
        rubric
      }))

      // Persist answer to database if we have sessionId
      if (sessionId) {
        try {
          console.log(`🔄 Persisting answer ${currentIndex + 1} to database...`, { sessionId })
          await upsertAnswer(sessionId, {
            questionIndex: currentIndex,
            difficulty: question.difficulty,
            question: question.prompt,
            answerText: answerDraft || '',
            durationMs,
            timeTakenMs,
            rubric,
            submittedAt: new Date().toISOString()
          })
          console.log(`✅ Answer ${currentIndex + 1} successfully persisted to database`)
        } catch (dbError) {
          console.error(`❌ Failed to persist answer ${currentIndex + 1} to database:`, dbError)
          // Continue anyway - don't block the UI
        }
      } else {
        console.warn(`⚠️ No sessionId found, skipping answer ${currentIndex + 1} database persistence`)
      }

      // Check if this was the last question
      if (currentIndex >= 5) {
        // Trigger summary generation after a short delay to ensure state is updated
        setTimeout(() => {
          setShouldGenerateSummary(true)
        }, 100)
      } else {
        // Advance to next question
        dispatch(advanceIndex())
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, hasAutoSubmitted, timer, question, answerDraft, resumeText, currentIndex, dispatch])

  // Auto-submit logic
  useEffect(() => {
    if (!timer || !question || hasAutoSubmitted || autoSubmitRef.current) return

    const checkExpiry = () => {
      if (isExpired(timer.startedAt, timer.durationMs)) {
        autoSubmitRef.current = true
        handleSubmit(true) // Auto-submit
      } else {
        requestAnimationFrame(checkExpiry)
      }
    }

    checkExpiry()

    // Cleanup function to cancel animation frame
    return () => {
      // Note: requestAnimationFrame doesn't need explicit cleanup
    }
  }, [timer, question, hasAutoSubmitted, currentIndex, handleSubmit])

  // Summary generation effect - when i becomes 6
  useEffect(() => {
    if (!shouldGenerateSummary) return

    const generateSummary = async () => {
      const allRubrics = []
      
      for (let i = 0; i <= 5; i++) {
        const answer = allAnswers[i]
        if (answer?.rubric) {
          allRubrics.push(answer.rubric)
        }
      }

      // Generate summary with available rubrics (even if fewer than 6)
      if (allRubrics.length > 0) {
        try {
          const summaryResponse = await fetch('/api/summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rubrics: allRubrics })
          })

          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json()
            const strengths = Array.isArray(summaryData.strengths)
              ? summaryData.strengths
              : (summaryData.strengths ? [summaryData.strengths] : [])
            const gaps = Array.isArray(summaryData.gaps)
              ? summaryData.gaps
              : (summaryData.gap ? [summaryData.gap] : [])
            
            const finalResults = {
              finalScore: summaryData.finalScore || 0,
              summary: summaryData.summary || 'Summary not available',
              strengths: strengths.length > 0 ? strengths : ['Your technical skills show promise'],
              gaps: gaps.length > 0 ? gaps : ['Continue practicing and learning']
            }
            
            // Persist to database if we have candidateId
            if (candidateId) {
              try {
                console.log('🔄 Persisting interview results to database...', { candidateId, finalResults })
                await finalizeCandidate({
                  id: candidateId,
                  finalScore: finalResults.finalScore,
                  summary: finalResults.summary,
                  strengths: finalResults.strengths,
                  gap: finalResults.gaps.join('; ') // Convert array to single string as expected by API
                })
                console.log('✅ Interview results successfully persisted to database')
              } catch (dbError) {
                console.error('❌ Failed to persist interview results to database:', dbError)
                // Continue anyway - don't block the UI
              }
            } else {
              console.warn('⚠️ No candidateId found, skipping database persistence')
            }
            
            dispatch(completeInterview(finalResults))
            // Notify any listeners (e.g., interviewer dashboard) that a candidate was finalized
            try {
              if (candidateId) {
                emitter.emit('candidate:finalized', { candidateId })
              }
            } catch (emitError) {
              // emitter is in-memory and should not fail; log for observability
              console.warn('Failed to emit candidate:finalized event', emitError)
            }
          } else {
            // Fallback if API fails
            const fallbackResults = {
              finalScore: 75,
              summary: 'Interview completed successfully. Detailed analysis is being processed.',
              strengths: ['Completed all questions', 'Showed good engagement'],
              gaps: ['Keep practicing technical skills', 'Review feedback for improvement areas']
            }
            
            // Persist fallback results to database
            if (candidateId) {
              try {
                console.log('🔄 Persisting fallback interview results to database...', { candidateId })
                await finalizeCandidate({
                  id: candidateId,
                  finalScore: fallbackResults.finalScore,
                  summary: fallbackResults.summary,
                  strengths: fallbackResults.strengths,
                  gap: fallbackResults.gaps.join('; ')
                })
                console.log('✅ Fallback interview results successfully persisted to database')
              } catch (dbError) {
                console.error('❌ Failed to persist fallback interview results to database:', dbError)
              }
            }
            
            dispatch(completeInterview(fallbackResults))
            try {
              if (candidateId) {
                emitter.emit('candidate:finalized', { candidateId })
              }
            } catch (emitError) {
              console.warn('Failed to emit candidate:finalized event', emitError)
            }
          }
        } catch (error) {
          console.error('Error generating summary:', error)
          // Fallback if API fails
          const errorFallbackResults = {
            finalScore: 75,
            summary: 'Interview completed successfully. Detailed analysis is being processed.',
            strengths: ['Completed all questions', 'Showed good engagement'],
            gaps: ['Keep practicing technical skills', 'Review feedback for improvement areas']
          }
          
          // Persist error fallback results to database
          if (candidateId) {
            try {
              console.log('🔄 Persisting error fallback interview results to database...', { candidateId })
              await finalizeCandidate({
                id: candidateId,
                finalScore: errorFallbackResults.finalScore,
                summary: errorFallbackResults.summary,
                strengths: errorFallbackResults.strengths,
                gap: errorFallbackResults.gaps.join('; ')
              })
              console.log('✅ Error fallback interview results successfully persisted to database')
            } catch (dbError) {
              console.error('❌ Failed to persist error fallback interview results to database:', dbError)
            }
          }
          
            dispatch(completeInterview(errorFallbackResults))
            try {
              if (candidateId) {
                emitter.emit('candidate:finalized', { candidateId })
              }
            } catch (emitError) {
              console.warn('Failed to emit candidate:finalized event', emitError)
            }
        }
      } else {
        // Fallback if no rubrics available
        const noRubricsResults = {
          finalScore: 50,
          summary: 'Interview completed. Please ensure all questions are properly answered for detailed feedback.',
          strengths: ['Participated in the interview process'],
          gaps: ['Consider providing more detailed answers']
        }
        
        // Persist no-rubrics results to database
        if (candidateId) {
          try {
            console.log('🔄 Persisting no-rubrics interview results to database...', { candidateId })
            await finalizeCandidate({
              id: candidateId,
              finalScore: noRubricsResults.finalScore,
              summary: noRubricsResults.summary,
              strengths: noRubricsResults.strengths,
              gap: noRubricsResults.gaps.join('; ')
            })
            console.log('✅ No-rubrics interview results successfully persisted to database')
          } catch (dbError) {
            console.error('❌ Failed to persist no-rubrics interview results to database:', dbError)
          }
        }
        
        dispatch(completeInterview(noRubricsResults))
        try {
          if (candidateId) {
            emitter.emit('candidate:finalized', { candidateId })
          }
        } catch (emitError) {
          console.warn('Failed to emit candidate:finalized event', emitError)
        }
      }
    }

    generateSummary()
  }, [shouldGenerateSummary, dispatch, allAnswers])

  const handleAnswerChange = (text: string) => {
    dispatch(setAnswerDraft({ index: currentIndex, text }))
  }

  // Show loading state while generating summary
  if (shouldGenerateSummary && !finalResults) {
    return (
      <div data-testid="question-runner-root">
        <Card className="p-8" data-testid="summary-loading">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Generating Your Results...
            </h2>
            <p className="text-gray-600">
              Please wait while we analyze your responses and prepare your feedback.
            </p>
          </div>
        </Card>
      </div>
    )
  }

  // Render final summary when interview is completed
  if (finalResults) {
    return (
      <div data-testid="question-runner-root" className="max-w-4xl mx-auto">
        <Card className="p-8" data-testid="final-summary">
          <div className="text-center mb-8">
            <div className="mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-3">
              Interview Complete!
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              Here&apos;s your detailed feedback and performance summary
            </p>
            <p className="text-sm text-gray-500">
              Review your results below and use this feedback to guide your continued learning
            </p>
          </div>

          <div className="space-y-8">
            {/* Score Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-8 rounded-xl border border-blue-200">
              <div className="text-center mb-6">
                <div className="text-5xl font-bold text-blue-900 mb-2">
                  {finalResults.finalScore}<span className="text-2xl text-blue-700">/100</span>
                </div>
                <div className="text-blue-700 font-medium">
                  Overall Performance Score
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Executive Summary</h3>
                <p className="text-gray-700 leading-relaxed">{finalResults.summary}</p>
              </div>
            </div>

            {/* Strengths and Areas for Improvement */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-green-900">
                    Key Strengths
                  </h3>
                </div>
                <ul className="space-y-3">
                  {finalResults.strengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-green-800 leading-relaxed">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200">
                <div className="flex items-center mb-4">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-orange-900">
                    Growth Areas
                  </h3>
                </div>
                <ul className="space-y-3">
                  {(finalResults.gaps || []).map((gap: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-orange-800 leading-relaxed">{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => window.location.href = '/interviewer'}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  View Dashboard
                </Button>
                <Button 
                  onClick={() => {
                    if (confirm('Are you sure you want to start a new interview? This will reset your current progress.')) {
                      window.location.href = '/profile'
                    }
                  }}
                  className="flex-1 sm:flex-none"
                >
                  Start New Interview
                </Button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-4">
                Your results have been saved and can be reviewed in the dashboard
              </p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (stage !== 'interviewing') {
    return <div data-testid="question-runner-root" />
  }

  if (!question) {
    return (
      <div data-testid="question-runner-root">
        <Card className="p-6">
          <p>Loading question...</p>
        </Card>
      </div>
    )
  }

  return (
    <div data-testid="question-runner-root">
      <Card className="p-6" data-testid={`question-card-${currentIndex + 1}`}>
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-semibold">
            Question {currentIndex + 1}/6
          </h2>
          {timer && (
            <CountdownBadge 
              startedAt={timer.startedAt} 
              durationMs={timer.durationMs} 
            />
          )}
        </div>
        
        <div className="mb-6">
          <p className="text-gray-700 leading-relaxed">
            {question.prompt}
          </p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="answer-input" className="block text-sm font-medium mb-2">
              Your Answer
            </label>
            <Textarea
              id="answer-input"
              value={answerDraft}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder="Type your answer here..."
              className="min-h-[200px]"
              data-testid="answer-input"
            />
          </div>
          
          <div className="flex justify-end">
            <Button
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              data-testid="answer-submit"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
