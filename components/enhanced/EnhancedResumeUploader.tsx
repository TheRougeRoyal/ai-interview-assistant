/**
 * Enhanced Resume Uploader with error boundaries, loading states, and offline support
 */

'use client'

import React, { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, File, CheckCircle, AlertCircle, WifiOff } from 'lucide-react'
import { 
  ComponentErrorBoundary, 
  useErrorHandler 
} from '@/components/ui/error-boundary'
import { 
  LoadingOverlay, 
  FileUploadLoading, 
  useLoading, 
  useProgress 
} from '@/components/ui/loading-states'
import { 
  useOnlineStatus, 
  useOfflineQueue, 
  OfflineAware 
} from '@/components/ui/offline-state'
import { useToast } from '@/components/ui/use-toast'
import { flowChannel } from '@/lib/utils/channel'
import { getApiLogger } from '@/lib/logging'
import { generateCorrelationId } from '@/lib/errors/correlation'

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

interface EnhancedResumeUploaderProps {
  onParsed: (data: ParsedData) => void
  onError?: (error: Error) => void
  maxRetries?: number
  enableOfflineQueue?: boolean
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

function ResumeUploaderCore({ 
  onParsed, 
  onError,
  maxRetries = 3,
  enableOfflineQueue = true
}: EnhancedResumeUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParsedData | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { isLoading, withLoading } = useLoading()
  const { progress, setProgress, resetProgress } = useProgress()
  const { handleError } = useErrorHandler()
  const { toast } = useToast()
  const isOnline = useOnlineStatus()
  const { addToQueue, processQueue } = useOfflineQueue()
  
  const logger = getApiLogger()
  const maxSizeMB = Number(process.env.NEXT_PUBLIC_UPLOAD_MAX_MB) || 5
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Please select a PDF or Word document (.pdf, .docx)'
    }

    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSizeMB}MB`
    }

    return null
  }, [maxSizeMB, maxSizeBytes])

  const handleFileSelect = useCallback((file: File) => {
    const correlationId = generateCorrelationId()
    
    logger.debug('File selected for upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      correlationId
    })

    setError(null)
    setParsedData(null)
    resetProgress()

    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      logger.warn('File validation failed', {
        fileName: file.name,
        error: validationError,
        correlationId
      })
      return
    }

    setSelectedFile(file)
  }, [validateFile, resetProgress, logger])

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

  const parseResume = useCallback(async (file: File): Promise<ParsedData> => {
    const correlationId = generateCorrelationId()
    
    return new Promise((resolve, reject) => {
      const formData = new FormData()
      formData.append('file', file)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          setProgress(progress)
        }
      })

      xhr.addEventListener('load', async () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const json = JSON.parse(xhr.responseText)
            resolve(json)
          } else {
            const errorData = await xhr.response?.json?.() || {}
            const nested = errorData?.error
            const message =
              (typeof nested === 'string' && nested) ||
              (nested && (nested.message || nested.error)) ||
              errorData?.message ||
              (typeof nested === 'object' ? JSON.stringify(nested) : `HTTP ${xhr.status}`)
            
            reject(new Error(message))
          }
        } catch (parseError) {
          reject(new Error('Failed to parse server response'))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error occurred during upload'))
      })

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out'))
      })

      xhr.open('POST', '/api/parse-resume')
      xhr.setRequestHeader('X-Correlation-ID', correlationId)
      xhr.timeout = 60000 // 1 minute timeout
      xhr.send(formData)
    })
  }, [setProgress])

  const handleParse = useCallback(async () => {
    if (!selectedFile) return

    const correlationId = generateCorrelationId()

    try {
      await withLoading(async () => {
        logger.info('Starting resume parsing', {
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          correlationId
        })

        // Check if online
        if (!isOnline && enableOfflineQueue) {
          // Add to offline queue
          const queueId = addToQueue('parse-resume', {
            file: selectedFile,
            correlationId
          })
          
          toast({
            title: 'Added to queue',
            description: 'Resume will be parsed when connection is restored.',
          })
          
          logger.info('Resume parsing queued for offline processing', {
            queueId,
            correlationId
          })
          return
        }

        const result = await parseResume(selectedFile)
        
        setParsedData(result)
        onParsed(result)
        setRetryCount(0)
        
        // Broadcast parsed event
        flowChannel.post('resume:parsed', result)
        
        toast({
          title: 'Resume parsed successfully',
          description: `Extracted information for ${result.fields.name || 'candidate'}`,
        })
        
        logger.info('Resume parsing completed successfully', {
          candidateName: result.fields.name,
          qualityScore: result.analysis?.quality?.score,
          correlationId
        })
      })
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to parse resume')
      
      logger.error('Resume parsing failed', error, {
        fileName: selectedFile.name,
        retryCount,
        correlationId
      })

      setError(error.message)
      
      if (onError) {
        onError(error)
      }

      // Show retry option if under max retries
      if (retryCount < maxRetries) {
        toast({
          title: 'Parsing failed',
          description: `${error.message}. You can try again.`,
          variant: 'destructive',
          action: (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRetryCount(prev => prev + 1)
                setError(null)
                handleParse()
              }}
            >
              Retry ({maxRetries - retryCount} left)
            </Button>
          )
        })
      } else {
        toast({
          title: 'Parsing failed',
          description: 'Maximum retry attempts reached. Please try a different file.',
          variant: 'destructive'
        })
      }
    }
  }, [
    selectedFile, 
    withLoading, 
    parseResume, 
    onParsed, 
    onError, 
    retryCount, 
    maxRetries,
    isOnline,
    enableOfflineQueue,
    addToQueue,
    toast,
    logger
  ])

  // Process offline queue when back online
  React.useEffect(() => {
    if (isOnline && enableOfflineQueue) {
      processQueue(async (action) => {
        if (action.type === 'parse-resume') {
          try {
            const result = await parseResume(action.data.file)
            setParsedData(result)
            onParsed(result)
            return true
          } catch (error) {
            logger.error('Failed to process queued resume parsing', error)
            return false
          }
        }
        return false
      })
    }
  }, [isOnline, enableOfflineQueue, processQueue, parseResume, onParsed, logger])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="space-y-4">
      {/* Offline Banner */}
      {!isOnline && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-800">
                You're offline. Resume parsing will be queued until connection is restored.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* File Drop Area */}
      <LoadingOverlay isLoading={isLoading} message="Processing resume...">
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
                disabled={isLoading}
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
      </LoadingOverlay>

      {/* Upload Progress */}
      {isLoading && selectedFile && (
        <FileUploadLoading 
          progress={progress} 
          fileName={selectedFile.name}
        />
      )}

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-red-800">{error}</span>
                {retryCount < maxRetries && selectedFile && (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setRetryCount(prev => prev + 1)
                        setError(null)
                        handleParse()
                      }}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Retry ({maxRetries - retryCount} attempts left)
                    </Button>
                  </div>
                )}
              </div>
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
              
              <OfflineAware
                fallback={
                  <Button disabled>
                    <WifiOff className="h-4 w-4 mr-2" />
                    Offline
                  </Button>
                }
              >
                <Button
                  data-testid="parse-resume"
                  onClick={handleParse}
                  disabled={!selectedFile || isLoading}
                >
                  {isLoading ? 'Parsing...' : 'Parse Resume'}
                </Button>
              </OfflineAware>
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

/**
 * Enhanced Resume Uploader with error boundary
 */
export default function EnhancedResumeUploader(props: EnhancedResumeUploaderProps) {
  return (
    <ComponentErrorBoundary
      onError={(error, errorInfo, errorId) => {
        console.error('Resume uploader error:', error)
        if (props.onError) {
          props.onError(error)
        }
      }}
      maxRetries={2}
    >
      <ResumeUploaderCore {...props} />
    </ComponentErrorBoundary>
  )
}