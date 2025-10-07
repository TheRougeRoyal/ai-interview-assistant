'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { flowChannel } from '@/lib/utils/channel'
import { Upload, File, CheckCircle, AlertCircle } from 'lucide-react'

interface ParsedData {
  fields: {
    name?: string
    email?: string
    phone?: string
  }
  confidence: {
    name: number
    email: number
    phone: number
  }
  resumeMeta: {
    filename: string
    size: number
    mime: string
    parseSource?: 'pdf' | 'docx'
    metadata?: any
  }
  resumeText: string
  analysis?: {
    sections: any
    skills: any
    experience: any
    education: any
    quality: {
      score: number
      completeness: number
      clarity: number
      relevance: number
      formatting: number
    }
    interviewContext: string
  }
}

interface ResumeUploaderProps {
  onParsed: (data: ParsedData) => void
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

export default function ResumeUploader({ onParsed }: ResumeUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const maxSizeMB = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB) || 5
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const handleFileSelect = useCallback((file: File) => {
    setError(null)
    setParsedData(null)

    // Validate file type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Please select a PDF or Word document (.pdf, .docx)')
      return
    }

    // Validate file size
    if (file.size > maxSizeBytes) {
      setError(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setSelectedFile(file)
  }, [maxSizeMB, maxSizeBytes])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleFallbackClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleParse = useCallback(async () => {
    if (!selectedFile) return

    setBusy(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const response = await fetch('/api/parse-resume', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Prefer structured message fields when the API returns an error object
        const nested = errorData?.error
        const message =
          (typeof nested === 'string' && nested) ||
          (nested && (nested.message || nested.error)) ||
          errorData?.message ||
          // Fallback to a readable JSON string for objects, or plain HTTP status
          (typeof nested === 'object' ? JSON.stringify(nested) : `HTTP ${response.status}`)

        throw new Error(message)
      }

      const json = await response.json()
      setParsedData(json)
      onParsed(json)
      // broadcast parsed event to other tabs/windows
      flowChannel.post('resume:parsed', json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse resume')
    } finally {
      setBusy(false)
    }
  }, [selectedFile, onParsed])

  return (
    <div className="space-y-4">
      {/* File Drop Area */}
      <Card>
        <CardContent className="p-6">
          <div
            data-testid="file-drop"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop your resume here
            </p>
            <p className="text-sm text-gray-600 mb-1">
              Supports PDF and Word documents (max {maxSizeMB}MB)
            </p>
            <p className="text-xs text-gray-500 mb-4">
              We never store your file; parsing runs in-memory and on trusted services.
            </p>
            
            <Button
              data-testid="file-choose-fallback"
              variant="outline"
              onClick={handleFallbackClick}
            >
              Choose File
            </Button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected File Display */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-sm text-gray-600">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>
              <Button
                data-testid="parse-resume"
                onClick={handleParse}
                disabled={!selectedFile || busy}
              >
                {busy ? 'Parsing...' : 'Parse Resume'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Parsed Data Preview */}
      {parsedData && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-800">Resume Parsed Successfully</span>
            </div>
            
            <div className="space-y-2 text-sm">
              {parsedData.fields.name && (
                <div className="flex justify-between items-center">
                  <span data-testid="parsed-name" className="text-gray-700">
                    Name: {parsedData.fields.name}
                  </span>
                  <span 
                    data-testid="confidence-name" 
                    className="text-xs bg-white px-2 py-1 rounded"
                  >
                    {Math.round(parsedData.confidence.name * 100)}% confidence
                  </span>
                </div>
              )}
              
              {parsedData.fields.email && (
                <div className="flex justify-between items-center">
                  <span data-testid="parsed-email" className="text-gray-700">
                    Email: {parsedData.fields.email}
                  </span>
                  <span 
                    data-testid="confidence-email" 
                    className="text-xs bg-white px-2 py-1 rounded"
                  >
                    {Math.round(parsedData.confidence.email * 100)}% confidence
                  </span>
                </div>
              )}
              
              {parsedData.fields.phone && (
                <div className="flex justify-between items-center">
                  <span data-testid="parsed-phone" className="text-gray-700">
                    Phone: {parsedData.fields.phone}
                  </span>
                  <span 
                    data-testid="confidence-phone" 
                    className="text-xs bg-white px-2 py-1 rounded"
                  >
                    {Math.round(parsedData.confidence.phone * 100)}% confidence
                  </span>
                </div>
              )}
              
              {/* Enhanced parsing info */}
              {parsedData.resumeMeta.parseSource && (
                <div className="mt-3 pt-3 border-t border-green-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">
                      Parsed using: <span className="font-medium">
                        {parsedData.resumeMeta.parseSource === 'pdf' ? 'Native PDF Parser' : 
                         parsedData.resumeMeta.parseSource === 'docx' ? 'DOCX Parser' : 'Unknown'}
                      </span>
                    </span>
                    {parsedData.analysis && (
                      <span className="text-gray-600">
                        Quality Score: <span className="font-medium text-green-700">
                          {parsedData.analysis.quality.score}/100
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {parsedData.analysis && parsedData.analysis.experience.totalYears > 0 && (
                    <div className="text-xs text-gray-600 mt-1">
                      Experience: {parsedData.analysis.experience.totalYears} years
                      {parsedData.analysis.skills.technical.length > 0 && (
                        <span className="ml-2">
                          • Skills: {parsedData.analysis.skills.technical.slice(0, 3).join(', ')}
                          {parsedData.analysis.skills.technical.length > 3 && '...'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
