'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Upload, FileText, Brain, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import type { PDFProcessingResult, SkillAssessment } from '@/lib/pdf-assessment/types'

interface ProcessingState {
  status: 'idle' | 'uploading' | 'processing' | 'generating' | 'complete' | 'error'
  progress: number
  message: string
}

interface AssessmentResults {
  processingResult: PDFProcessingResult
  assessment: SkillAssessment[]
  strengths: string[]
  improvements: string[]
  enhancedData?: any
}

export default function PDFAssessmentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [processing, setProcessing] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    message: ''
  })
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [generateQuestions, setGenerateQuestions] = useState(true)

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        alert('Please select a PDF file')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      setFile(selectedFile)
      setResults(null)
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile)
      setResults(null)
    }
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  const processFile = async () => {
    if (!file) return

    setProcessing({
      status: 'uploading',
      progress: 10,
      message: 'Uploading file...'
    })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('generateQuestions', generateQuestions.toString())

      setProcessing({
        status: 'processing',
        progress: 30,
        message: 'Extracting text and analyzing structure...'
      })

      const response = await fetch('/api/process-pdf', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`)
      }

      setProcessing({
        status: 'generating',
        progress: 70,
        message: 'Generating skill-based assessment questions...'
      })

      const data = await response.json()

      if (generateQuestions) {
        // Also get enhanced assessment
        const assessmentResponse = await fetch('/api/assess-resume', {
          method: 'POST',
          body: formData
        })

        if (assessmentResponse.ok) {
          const assessmentData = await assessmentResponse.json()
          data.strengths = assessmentData.strengths
          data.improvements = assessmentData.improvements
          data.enhancedData = assessmentData.enhancedData
        }
      }

      setProcessing({
        status: 'complete',
        progress: 100,
        message: 'Processing complete!'
      })

      setResults({
        processingResult: data.processingResult,
        assessment: data.assessment || [],
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        enhancedData: data.enhancedData
      })

    } catch (error) {
      console.error('Processing error:', error)
      setProcessing({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Processing failed'
      })
    }
  }

  const resetUpload = () => {
    setFile(null)
    setResults(null)
    setProcessing({
      status: 'idle',
      progress: 0,
      message: ''
    })
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            AI-Powered PDF Assessment System
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Upload a resume or CV to extract skills, generate personalized assessment questions, and get detailed feedback.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!file && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">Drop your PDF here or click to browse</p>
              <p className="text-sm text-gray-500">Supports PDF files up to 10MB</p>
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {file && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500" />
                <div className="flex-1">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={resetUpload}>
                  Remove
                </Button>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="generate-questions"
                  checked={generateQuestions}
                  onChange={(e) => setGenerateQuestions(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="generate-questions" className="text-sm">
                  Generate skill-based assessment questions
                </label>
              </div>

              {processing.status === 'idle' && (
                <Button onClick={processFile} className="w-full">
                  <Brain className="h-4 w-4 mr-2" />
                  Process with AI Assessment
                </Button>
              )}

              {processing.status !== 'idle' && processing.status !== 'complete' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span className="text-sm">{processing.message}</span>
                  </div>
                  <Progress value={processing.progress} className="w-full" />
                </div>
              )}

              {processing.status === 'error' && (
                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{processing.message}</span>
                </div>
              )}

              {processing.status === 'complete' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{processing.message}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {results && <AssessmentResults results={results} />}
    </div>
  )
}

function AssessmentResults({ results }: { results: AssessmentResults }) {
  const { processingResult, assessment, strengths, improvements, enhancedData } = results

  return (
    <div className="space-y-6">
      {/* Processing Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {processingResult.extractedData.skills.technical.length}
              </div>
              <div className="text-sm text-gray-500">Technical Skills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {processingResult.extractedData.experience.length}
              </div>
              <div className="text-sm text-gray-500">Work Experience</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {assessment.length}
              </div>
              <div className="text-sm text-gray-500">Skill Assessments</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {assessment.reduce((sum, a) => sum + a.questions.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Questions Generated</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths and Improvements */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">Strengths</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Areas for Improvement</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Generated Assessments */}
      {assessment.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Skill Assessments</CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-generated questions based on extracted skills and experience
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assessment.map((skillAssessment, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-medium">{skillAssessment.skill}</h4>
                      <p className="text-sm text-gray-500 capitalize">
                        {skillAssessment.category} • {skillAssessment.difficulty} • 
                        {skillAssessment.estimatedTime} min
                      </p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {skillAssessment.questions.length} questions
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {skillAssessment.questions.slice(0, 2).map((question, qIndex) => (
                      <div key={qIndex} className="bg-gray-50 p-3 rounded text-sm">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium capitalize">{question.type}</span>
                          <span className="text-xs text-gray-500">{question.timeLimit}min</span>
                        </div>
                        <p className="text-gray-700">{question.question}</p>
                        {question.options && (
                          <div className="mt-2 space-y-1">
                            {question.options.slice(0, 2).map((option, oIndex) => (
                              <div key={oIndex} className="text-xs text-gray-600">
                                • {option}
                              </div>
                            ))}
                            {question.options.length > 2 && (
                              <div className="text-xs text-gray-500">
                                ... and {question.options.length - 2} more options
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {skillAssessment.questions.length > 2 && (
                      <p className="text-xs text-gray-500 text-center">
                        ... and {skillAssessment.questions.length - 2} more questions
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}