/**
 * Example usage of the File Processing Service
 * This file demonstrates how to use the service in different scenarios
 */

import { 
  getFileProcessingService,
  createFileProcessingService,
  ProcessingStatus,
  ProcessingOptions,
  FileFormat
} from '@/lib/services/file-processing'

/**
 * Example 1: Basic file processing
 */
export async function basicFileProcessing(file: File) {
  const service = getFileProcessingService()

  try {
    const result = await service.processFile(file, {
      extractText: true,
      extractMetadata: true,
      validateContent: true
    })

    if (result.status === ProcessingStatus.COMPLETED) {
      console.log('Processing successful!')
      console.log('Extracted text length:', result.extractedText?.length)
      console.log('Page count:', result.metadata?.pageCount)
      console.log('Processing time:', result.processingTime, 'ms')
    } else {
      console.error('Processing failed:', result.error?.message)
    }

    return result
  } catch (error) {
    console.error('Unexpected error:', error)
    throw error
  }
}

/**
 * Example 2: Batch processing multiple files
 */
export async function batchFileProcessing(files: File[]) {
  const service = getFileProcessingService()

  console.log(`Processing ${files.length} files...`)

  const results = await service.processBatch(files, {
    extractText: true,
    priority: 'high'
  })

  const successful = results.filter(r => r.status === ProcessingStatus.COMPLETED)
  const failed = results.filter(r => r.status === ProcessingStatus.FAILED)

  console.log(`✅ Successful: ${successful.length}`)
  console.log(`❌ Failed: ${failed.length}`)

  return {
    successful,
    failed,
    results
  }
}

/**
 * Example 3: File validation before processing
 */
export async function validateFile(file: File) {
  const service = getFileProcessingService()

  const validation = await service.validateFile(file)

  if (!validation.isValid) {
    console.error('File validation failed:')
    validation.errors.forEach(error => console.error('  -', error))
    return false
  }

  if (validation.warnings.length > 0) {
    console.warn('File validation warnings:')
    validation.warnings.forEach(warning => console.warn('  -', warning))
  }

  console.log('✅ File is valid')
  console.log('Format:', validation.metadata.format)
  console.log('Size:', validation.metadata.size, 'bytes')

  return true
}

/**
 * Example 4: Processing with custom configuration
 */
export async function customConfigProcessing(file: File) {
  const service = createFileProcessingService({
    maxFileSize: 20 * 1024 * 1024, // 20MB
    defaultTimeout: 45000, // 45 seconds
    retryAttempts: 5,
    supportedFormats: [FileFormat.PDF, FileFormat.DOCX]
  })

  const result = await service.processFile(file, {
    extractText: true,
    extractMetadata: true,
    maxPages: 50, // Only process first 50 pages
    timeout: 60000 // 60 second timeout for this specific job
  })

  return result
}

/**
 * Example 5: Event handling and progress tracking
 */
export async function eventHandlingExample(file: File) {
  const service = getFileProcessingService()

  // Add event listener
  service.addEventListener({
    onEvent: async (event) => {
      console.log(`[${event.timestamp.toISOString()}] ${event.type}: ${event.jobId}`)
      
      if (event.data) {
        console.log('Event data:', event.data)
      }
    }
  })

  const result = await service.processFile(file)

  return result
}

/**
 * Example 6: Resume upload workflow
 */
export async function resumeUploadWorkflow(file: File) {
  const service = getFileProcessingService()

  // Step 1: Validate the file
  console.log('Step 1: Validating file...')
  const validation = await service.validateFile(file)

  if (!validation.isValid) {
    throw new Error(`File validation failed: ${validation.errors.join(', ')}`)
  }

  // Step 2: Process the file
  console.log('Step 2: Processing file...')
  const result = await service.processFile(file, {
    extractText: true,
    extractMetadata: true,
    validateContent: true
  })

  if (result.status !== ProcessingStatus.COMPLETED) {
    throw new Error(`Processing failed: ${result.error?.message}`)
  }

  // Step 3: Return the processed data
  console.log('Step 3: Processing complete!')
  return {
    text: result.extractedText || '',
    metadata: result.metadata,
    processingTime: result.processingTime
  }
}

/**
 * Example 7: Error handling with retries
 */
export async function errorHandlingExample(file: File) {
  const service = getFileProcessingService()
  let attempts = 0
  const maxAttempts = 3

  while (attempts < maxAttempts) {
    try {
      attempts++
      console.log(`Attempt ${attempts}/${maxAttempts}...`)

      const result = await service.processFile(file)

      if (result.status === ProcessingStatus.COMPLETED) {
        console.log('✅ Success on attempt', attempts)
        return result
      }

      if (result.error && !result.error.recoverable) {
        console.error('❌ Non-recoverable error, stopping retries')
        throw new Error(result.error.message)
      }

      console.warn(`⚠️ Attempt ${attempts} failed, retrying...`)
      await new Promise(resolve => setTimeout(resolve, result.error?.retryAfter || 1000))

    } catch (error) {
      if (attempts >= maxAttempts) {
        console.error('❌ All attempts failed')
        throw error
      }
      console.warn(`⚠️ Attempt ${attempts} failed, retrying...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  throw new Error('Max retry attempts reached')
}

/**
 * Example 8: Get service statistics
 */
export async function getServiceStats() {
  const service = getFileProcessingService()
  const stats = service.getStats()

  console.log('=== File Processing Service Statistics ===')
  console.log('Total jobs:', stats.totalJobs)
  console.log('Completed:', stats.completedJobs)
  console.log('Failed:', stats.failedJobs)
  console.log('Success rate:', stats.successRate.toFixed(2) + '%')
  console.log('Average processing time:', stats.averageProcessingTime.toFixed(0) + 'ms')
  console.log('Queue size:', stats.queueSize)
  console.log('Active jobs:', stats.activeJobs)

  return stats
}

/**
 * Example 9: Extract metadata only
 */
export async function extractMetadataOnly(file: File) {
  const service = getFileProcessingService()

  const metadata = await service.extractMetadata(file)

  console.log('=== File Metadata ===')
  console.log('Title:', metadata.title)
  console.log('Author:', metadata.author)
  console.log('Page count:', metadata.pageCount)
  console.log('Word count:', metadata.wordCount)
  console.log('Character count:', metadata.characterCount)
  console.log('Created:', metadata.creationDate)
  console.log('Modified:', metadata.modificationDate)

  return metadata
}

/**
 * Example 10: Check supported formats
 */
export function checkSupportedFormats() {
  const service = getFileProcessingService()
  const formats = service.getSupportedFormats()

  console.log('Supported file formats:')
  formats.forEach(format => console.log('  -', format))

  return formats
}
