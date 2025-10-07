'use client'

import { useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QAItem } from './QAItem'
import { fetchAPI } from '@/lib/http/apiClient'

const USE_MOCK_DASHBOARD = false

const mockCandidateDetails: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice.johnson@example.com',
    phone: '+1-555-0123',
    finalScore: 85,
    summary: 'Strong technical candidate with excellent problem-solving skills and clear communication. Demonstrates solid understanding of core concepts with room for growth in advanced topics.',
    strengths: ['Problem Solving', 'Communication', 'Technical Knowledge', 'Analytical Thinking'],
    gap: 'Advanced Algorithms',
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    sessions: [{
      id: 'session-1',
      answers: [
        {
          questionIndex: 0,
          difficulty: 'Easy',
          question: 'What is the difference between let and var in JavaScript?',
          answerText: 'The main differences are scope and hoisting. Let has block scope while var has function scope. Variables declared with let are not hoisted to the top of their scope.',
          durationMs: 120000,
          timeTakenMs: 95000,
          rubric: { accuracy: 9, completeness: 8, relevance: 9, timeliness: 8 }
        },
        {
          questionIndex: 1,
          difficulty: 'Easy',
          question: 'Explain the concept of closures in JavaScript.',
          answerText: 'A closure is when a function retains access to variables from its outer scope even after the outer function has returned. This allows for data privacy and creating factory functions.',
          durationMs: 120000,
          timeTakenMs: 110000,
          rubric: { accuracy: 8, completeness: 7, relevance: 9, timeliness: 7 }
        },
        {
          questionIndex: 2,
          difficulty: 'Medium',
          question: 'How would you implement a debounce function?',
          answerText: 'A debounce function delays execution until after a specified time has passed since the last call. You can implement it using setTimeout and clearTimeout.',
          durationMs: 120000,
          timeTakenMs: 115000,
          rubric: { accuracy: 7, completeness: 6, relevance: 8, timeliness: 6 }
        },
        {
          questionIndex: 3,
          difficulty: 'Medium',
          question: 'What are the different ways to handle asynchronous operations in JavaScript?',
          answerText: 'The main approaches are callbacks, promises, and async/await. Each has pros and cons in terms of readability and error handling.',
          durationMs: 120000,
          timeTakenMs: 108000,
          rubric: { accuracy: 8, completeness: 8, relevance: 9, timeliness: 8 }
        },
        {
          questionIndex: 4,
          difficulty: 'Hard',
          question: 'Implement a function to find the longest common subsequence between two strings.',
          answerText: 'This is a dynamic programming problem. You can solve it using a 2D array to store intermediate results and build up the solution.',
          durationMs: 120000,
          timeTakenMs: 120000,
        },
        {
          questionIndex: 5,
          difficulty: 'Hard',
          question: 'Design a system for handling millions of concurrent users.',
          durationMs: 120000,
        }
      ]
    }]
  },
  '2': {
    id: '2',
    name: 'Bob Smith',
    email: 'bob.smith.really.long.email@example.com',
    phone: '+1-555-0456',
    finalScore: 72,
    summary: 'Solid developer with good fundamentals. Shows potential but needs more practice with advanced concepts.',
    strengths: ['Debugging', 'Testing', 'Documentation'],
    gap: 'System Design',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    sessions: []
  },
  '3': {
    id: '3',
    name: 'Carol Davis',
    email: 'carol.davis@example.com',
    phone: '+1-555-0789',
    finalScore: 91,
    summary: 'Exceptional candidate with strong technical skills and leadership potential. Ready for senior roles.',
    strengths: ['Architecture', 'Leadership', 'Problem Solving', 'Mentoring'],
    gap: 'Domain Knowledge',
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    sessions: []
  }
}

interface CandidateDetailDrawerProps {
  candidateId: string | null
  onClose: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function CandidateDetailDrawer({ candidateId, onClose }: CandidateDetailDrawerProps) {
  const [candidate, setCandidate] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (!candidateId) {
      setCandidate(null)
      return
    }

    const fetchCandidate = async () => {
      setIsLoading(true)
      try {
        if (USE_MOCK_DASHBOARD) {
          await new Promise(resolve => setTimeout(resolve, 300))
          setCandidate(mockCandidateDetails[candidateId] || null)
        } else {
          // Fetch candidate with full session data including answers
          const data = await fetchAPI(`/api/candidates/${candidateId}/full`)
          setCandidate(data)
        }
      } catch (error) {
        console.error('Error fetching candidate:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCandidate()
  }, [candidateId])

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  useEffect(() => {
    if (candidateId) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [candidateId])

  if (!candidateId) return null

  return (
    <Sheet open={!!candidateId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl lg:max-w-4xl overflow-y-auto shadow-xl border z-[60]">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : candidate ? (
          <div className="space-y-6 pb-6">
            <SheetHeader className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl font-bold text-foreground">{candidate.name}</SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1.5 break-all">{candidate.email}</p>
                </div>
                {candidate.finalScore !== undefined && (
                  <Badge className="text-lg px-4 py-1.5 bg-primary text-primary-foreground font-semibold shrink-0">
                    Score: {candidate.finalScore}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground pt-2">
                <span className="font-medium">Updated {formatDate(candidate.updatedAt)}</span>
                {candidate.phone && <span className="font-medium">{candidate.phone}</span>}
              </div>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid w-full grid-cols-3 h-11">
                <TabsTrigger value="overview" className="text-sm font-medium">Overview</TabsTrigger>
                <TabsTrigger value="skills" className="text-sm font-medium">Skills</TabsTrigger>
                <TabsTrigger value="qa" className="text-sm font-medium">Q&A</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-6">
                {/* Interview Session Status */}
                {candidate.sessions && candidate.sessions.length > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-5 border border-blue-100 dark:border-blue-900">
                    <h3 className="font-semibold text-base mb-4 text-foreground">Interview Status</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">Questions Answered:</span>
                        <div className="font-semibold text-foreground text-base">
                          {candidate.sessions[0].answers?.length || 0} / 6
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Stage:</span>
                        <div className="font-semibold text-foreground text-base capitalize">
                          {candidate.sessions[0].stage?.replace('_', ' ') || 'Not Started'}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Started:</span>
                        <div className="font-medium text-foreground">
                          {formatDate(candidate.sessions[0].createdAt)}
                        </div>
                      </div>
                      {candidate.sessions[0].updatedAt !== candidate.sessions[0].createdAt && (
                        <div>
                          <span className="text-muted-foreground block mb-1">Last Activity:</span>
                          <div className="font-medium text-foreground">
                            {formatDate(candidate.sessions[0].updatedAt)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Score and Performance */}
                {candidate.finalScore !== undefined ? (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-6 border border-purple-100 dark:border-purple-900">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary text-primary-foreground mb-3">
                        <span className="text-4xl font-bold">{candidate.finalScore}</span>
                      </div>
                      <p className="text-base font-semibold text-foreground">Final Score</p>
                    </div>
                    
                    {/* Score breakdown if we have rubric data */}
                    {candidate.sessions?.[0]?.answers && (
                      <div className="mt-6 pt-6 border-t border-purple-200 dark:border-purple-800">
                        {(() => {
                          const answers = candidate.sessions[0].answers.filter((a: any) => a.rubric)
                          if (answers.length === 0) return null
                          
                          const avgAccuracy = answers.reduce((sum: number, a: any) => sum + (a.rubric?.accuracy || 0), 0) / answers.length
                          const avgCompleteness = answers.reduce((sum: number, a: any) => sum + (a.rubric?.completeness || 0), 0) / answers.length
                          const avgRelevance = answers.reduce((sum: number, a: any) => sum + (a.rubric?.relevance || 0), 0) / answers.length
                          const avgTimeliness = answers.reduce((sum: number, a: any) => sum + (a.rubric?.timeliness || 0), 0) / answers.length
                          
                          return (
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-foreground">{avgAccuracy.toFixed(1)}</div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Accuracy</span>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-foreground">{avgCompleteness.toFixed(1)}</div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Completeness</span>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-foreground">{avgRelevance.toFixed(1)}</div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Relevance</span>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-foreground">{avgTimeliness.toFixed(1)}</div>
                                <span className="text-xs text-muted-foreground uppercase tracking-wide">Timeliness</span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 px-4 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground font-medium">Interview not yet completed</p>
                  </div>
                )}

                {/* AI Summary */}
                {candidate.summary && (
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-5 border border-amber-100 dark:border-amber-900">
                    <h3 className="font-semibold text-base mb-3 text-foreground">AI Analysis Summary</h3>
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {candidate.summary}
                    </p>
                  </div>
                )}

                {/* Strengths */}
                {candidate.strengths && candidate.strengths.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-base mb-4 text-foreground">Identified Strengths</h3>
                    <div className="flex flex-wrap gap-2">
                      {candidate.strengths.map((strength: string, index: number) => (
                        <Badge key={index} variant="default" className="text-sm px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">
                          {strength}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Areas for Improvement */}
                {candidate.gap && (
                  <div>
                    <h3 className="font-semibold text-base mb-4 text-foreground">Areas for Improvement</h3>
                    <Badge variant="outline" className="text-sm px-4 py-2 border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400 font-medium">
                      {candidate.gap}
                    </Badge>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="skills" className="space-y-6 mt-6">
                {/* Resume Information */}
                {candidate.resumeText && (
                  <div className="bg-slate-50 dark:bg-slate-950/30 rounded-lg p-5 border border-slate-100 dark:border-slate-900">
                    <h3 className="font-semibold text-base mb-4 text-foreground">Resume Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {candidate.resumeFile && (
                        <div>
                          <span className="text-muted-foreground block mb-1">File:</span>
                          <div className="font-medium text-foreground">{candidate.resumeFile}</div>
                        </div>
                      )}
                      {candidate.resumeSize && (
                        <div>
                          <span className="text-muted-foreground block mb-1">Size:</span>
                          <div className="font-medium text-foreground">
                            {(candidate.resumeSize / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* AI-Extracted Skills */}
                {candidate.skills ? (
                  <div className="space-y-6">
                    {/* AI Analysis Summary */}
                    {(candidate.experienceYears || candidate.seniorityLevel || candidate.qualityScore) && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-5 border border-blue-100 dark:border-blue-900">
                        <h3 className="font-semibold text-base mb-4 text-foreground">AI Analysis Summary</h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          {candidate.experienceYears && (
                            <div>
                              <span className="text-muted-foreground block mb-1">Experience:</span>
                              <div className="font-semibold text-foreground text-base">{candidate.experienceYears} years</div>
                            </div>
                          )}
                          {candidate.seniorityLevel && (
                            <div>
                              <span className="text-muted-foreground block mb-1">Level:</span>
                              <div className="font-semibold text-foreground text-base capitalize">{candidate.seniorityLevel}</div>
                            </div>
                          )}
                          {candidate.qualityScore && (
                            <div>
                              <span className="text-muted-foreground block mb-1">Resume Quality:</span>
                              <div className="font-semibold text-foreground text-base">{candidate.qualityScore}/100</div>
                            </div>
                          )}
                        </div>
                        {candidate.aiSummary && (
                          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-foreground/90 leading-relaxed">{candidate.aiSummary}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Skills by Category */}
                    {Object.entries(candidate.skills).map(([group, list]: any, idx: number) => (
                      list && list.length > 0 ? (
                        <div key={idx}>
                          <h3 className="font-semibold text-base mb-4 text-foreground flex items-center gap-2">
                            {group === 'technical' ? '💻 Technical Skills' : 
                             group === 'soft' ? '🤝 Soft Skills' :
                             group === 'languages' ? '🌍 Languages' :
                             group === 'frameworks' ? '🛠️ Frameworks' :
                             group === 'tools' ? '⚙️ Tools' :
                             group === 'certifications' ? '🏆 Certifications' :
                             group === 'domains' ? '🎯 Domain Expertise' :
                             `${group} Skills`}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {list.slice(0, 15).map((s: string, i: number) => (
                              <Badge 
                                key={i} 
                                variant={group === 'technical' || group === 'frameworks' ? "default" : "secondary"} 
                                className="text-sm px-3 py-1.5"
                              >
                                {s}
                              </Badge>
                            ))}
                            {list.length > 15 && (
                              <Badge variant="outline" className="text-sm px-3 py-1.5">
                                +{list.length - 15} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      ) : null
                    ))}

                    {/* AI Strengths */}
                    {candidate.aiStrengths && candidate.aiStrengths.length > 0 && (
                      <div>
                        <h3 className="font-semibold text-base mb-4 text-foreground">🎯 AI-Identified Strengths</h3>
                        <div className="flex flex-wrap gap-2">
                          {candidate.aiStrengths.map((strength: string, i: number) => (
                            <Badge key={i} variant="default" className="text-sm px-3 py-1.5 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300">
                              {strength}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : candidate.resumeText ? (
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Resume uploaded but skills extraction not yet completed.
                    </div>
                    
                    {/* Show resume text preview */}
                    <div>
                      <h3 className="font-semibold mb-3">Resume Preview</h3>
                      <div className="bg-muted/30 rounded-lg p-3 text-sm max-h-40 overflow-y-auto">
                        <pre className="whitespace-pre-wrap font-mono text-xs">
                          {candidate.resumeText.substring(0, 500)}
                          {candidate.resumeText.length > 500 && '...'}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No resume or skills information available</p>
                    <p className="text-xs mt-2">
                      The candidate may not have uploaded a resume yet.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="qa" className="space-y-6 mt-6">
                {candidate.sessions?.[0]?.answers ? (
                  <div className="space-y-5">
                    {/* Interview Session Summary */}
                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-5 border border-indigo-100 dark:border-indigo-900">
                      <h4 className="font-semibold text-base mb-4 text-foreground">Session Overview</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground block mb-1">Total Questions:</span>
                          <div className="font-semibold text-foreground text-base">6</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Answered:</span>
                          <div className="font-semibold text-foreground text-base">{candidate.sessions[0].answers.length}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Completion:</span>
                          <div className="font-semibold text-foreground text-base">
                            {Math.round((candidate.sessions[0].answers.length / 6) * 100)}%
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Questions and Answers */}
                    {Array.from({ length: 6 }).map((_, index) => {
                      const answer = candidate.sessions[0].answers.find(
                        (a: any) => a.questionIndex === index
                      )
                      
                      if (!answer) {
                        return (
                          <div key={index} className="border rounded-lg p-4 opacity-60">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">Question {index + 1}</h4>
                              <Badge variant="outline" className="text-xs">Not Attempted</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              This question was not answered during the interview session.
                            </p>
                          </div>
                        )
                      }

                      return (
                        <QAItem
                          key={index}
                          questionIndex={answer.questionIndex}
                          difficulty={answer.difficulty}
                          question={answer.question}
                          answerText={answer.answerText}
                          durationMs={answer.durationMs}
                          timeTakenMs={answer.timeTakenMs}
                          rubric={answer.rubric}
                        />
                      )
                    })}
                  </div>
                ) : candidate.sessions && candidate.sessions.length > 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Interview session found but no answers recorded.</p>
                    <p className="text-xs mt-2">
                      Session created on {formatDate(candidate.sessions[0].createdAt)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No interview session found for this candidate.</p>
                    <p className="text-xs mt-2">Candidate has not started the interview process.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Candidate not found</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}