# File Processing Service

A robust, extensible file processing service for handling resume uploads and document parsing in the AI Interview Assistant.

## Architecture

The file processing service follows a modular architecture with:

1. **Core Service** (`FileProcessingService`): Main orchestrator for file processing
2. **File Processors**: Format-specific processors (PDF, DOCX)
3. **Fallback Strategies**: Multiple fallback mechanisms for handling failures
4. **Job Queue**: Processing job management and status tracking
5. **Validation**: Comprehensive file validation before processing

## Features

### ✅ Native PDF Parsing
- Uses `pdftotext` for fast, accurate text extraction
- Falls back to `pdf-parse` for better compatibility
- Extracts metadata (author, creation date, page count, etc.)
- Validates PDF structure and detects encryption

### ✅ DOCX Support
- Native DOCX text extraction
- Handles modern Office document formats
- Validates ZIP structure and document.xml presence

### ✅ Robust Error Handling
- Multiple fallback strategies for failed parsing
- Detailed error reporting with correlation IDs
- Recoverable vs non-recoverable error classification

### ✅ Processing Pipeline
- File validation before processing
- Support for batch processing
- Concurrent job processing with limits
- Job status tracking and progress monitoring

### ✅ Fallback Strategies
1. **SimpleTextExtractionFallback**: Extract any readable text from binary
2. **AIVisionExtractionFallback**: OCR/vision API for image-based PDFs (placeholder)
3. **RetryWithOptionsFallback**: Retry with modified options
4. **MinimalExtractionFallback**: Last resort - return file info even if parsing fails

## Usage

### Basic Usage

```typescript
import { getFileProcessingService } from '@/lib/services/file-processing'

const service = getFileProcessingService()

// Process a file
const result = await service.processFile(file, {
  extractText: true,
  extractMetadata: true,
  validateContent: true
})

console.log(result.extractedText)
console.log(result.metadata)
```

### Custom Configuration

```typescript
import { createFileProcessingService } from '@/lib/services/file-processing'

const service = createFileProcessingService({
  maxFileSize: 20 * 1024 * 1024, // 20MB
  maxConcurrentJobs: 5,
  defaultTimeout: 45000,
  retryAttempts: 3,
  supportedFormats: [FileFormat.PDF, FileFormat.DOCX]
})
```

### Batch Processing

```typescript
const files = [file1, file2, file3]
const results = await service.processBatch(files, {
  extractText: true,
  priority: 'high'
})

results.forEach(result => {
  if (result.status === ProcessingStatus.COMPLETED) {
    console.log('Success:', result.extractedText)
  } else {
    console.error('Failed:', result.error)
  }
})
```

### Event Handling

```typescript
service.addEventListener({
  onEvent: async (event) => {
    switch (event.type) {
      case ProcessingEventType.JOB_STARTED:
        console.log('Job started:', event.jobId)
        break
      case ProcessingEventType.JOB_COMPLETED:
        console.log('Job completed:', event.jobId)
        break
      case ProcessingEventType.JOB_FAILED:
        console.error('Job failed:', event.jobId)
        break
    }
  }
})
```

### Custom Processor

```typescript
import { FileProcessor, FileFormat } from '@/lib/services/file-processing'

class CustomProcessor implements FileProcessor {
  readonly supportedFormats = [FileFormat.TXT]
  readonly name = 'CustomProcessor'
  readonly version = '1.0.0'

  canProcess(file: File | Buffer, format: FileFormat): boolean {
    return format === FileFormat.TXT
  }

  async process(file: File | Buffer, options?: ProcessingOptions): Promise<ProcessingResult> {
    // Implementation
  }

  async validate(file: File | Buffer): Promise<FileValidationResult> {
    // Implementation
  }

  async extractMetadata(file: File | Buffer): Promise<FileMetadata> {
    // Implementation
  }
}

service.registerProcessor(new CustomProcessor())
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxFileSize` | number | 10MB | Maximum file size in bytes |
| `maxConcurrentJobs` | number | 5 | Max parallel processing jobs |
| `defaultTimeout` | number | 30000 | Default timeout in milliseconds |
| `retryAttempts` | number | 3 | Number of retry attempts |
| `supportedFormats` | FileFormat[] | [PDF, DOCX] | Supported file formats |
| `enableOCR` | boolean | false | Enable OCR for image PDFs |
| `ocrLanguages` | string[] | ['eng'] | OCR languages |
| `tempDirectory` | string | '/tmp' | Temporary file directory |
| `storageProvider` | string | 'local' | Storage provider |
| `queueProvider` | string | 'memory' | Queue provider |

## Processing Options

```typescript
interface ProcessingOptions {
  extractText?: boolean          // Extract text content
  extractMetadata?: boolean       // Extract file metadata
  validateContent?: boolean       // Validate file content
  enableOCR?: boolean            // Enable OCR for images
  ocrLanguage?: string           // OCR language
  maxPages?: number              // Maximum pages to process
  timeout?: number               // Processing timeout
  retryAttempts?: number         // Number of retries
  priority?: 'low' | 'normal' | 'high'  // Job priority
}
```

## Environment-Specific Setup

### Development
```typescript
import { createDevFileProcessingService } from '@/lib/services/file-processing'

const service = createDevFileProcessingService()
// - Higher file size limits (50MB)
// - More concurrent jobs (10)
// - Longer timeouts (60s)
// - More retry attempts (5)
```

### Production
```typescript
import { createProductionFileProcessingService } from '@/lib/services/file-processing'

const service = createProductionFileProcessingService()
// - Stricter limits (5MB)
// - Fewer concurrent jobs (3)
// - Shorter timeouts (20s)
// - Fewer retries (2)
```

## Error Handling

All processing errors include:
- `code`: Error code for programmatic handling
- `message`: Human-readable error message
- `details`: Additional error context
- `stack`: Stack trace (if available)
- `recoverable`: Whether the error is recoverable
- `retryAfter`: Suggested retry delay (if applicable)

```typescript
try {
  const result = await service.processFile(file)
} catch (error) {
  if (error.recoverable) {
    // Retry after delay
    setTimeout(() => service.processFile(file), error.retryAfter || 1000)
  } else {
    // Handle permanent failure
    console.error('Processing failed permanently:', error.message)
  }
}
```

## Integration with Resume Processing

The file processing service integrates seamlessly with the resume processing pipeline:

```typescript
import { getFileProcessingService } from '@/lib/services/file-processing'
import { resumeProcessingService } from '@/lib/services/resume-processor'

// 1. Process file to extract text
const fileService = getFileProcessingService()
const processingResult = await fileService.processFile(file)

// 2. Analyze resume content
const resumeAnalysis = await resumeProcessingService.processResumeFile(file)

// 3. Generate interview context
const context = resumeProcessingService.generateInterviewContext(resumeAnalysis)
```

## Testing

```typescript
import { createFileProcessingService, resetFileProcessingService } from '@/lib/services/file-processing'

describe('File Processing Service', () => {
  let service: FileProcessingService

  beforeEach(() => {
    service = createFileProcessingService({
      maxFileSize: 1024 * 1024, // 1MB for tests
      retryAttempts: 1
    })
  })

  afterEach(() => {
    resetFileProcessingService()
  })

  it('should process PDF files', async () => {
    const result = await service.processFile(mockPdfFile)
    expect(result.status).toBe(ProcessingStatus.COMPLETED)
    expect(result.extractedText).toBeTruthy()
  })
})
```

## Future Enhancements

- [ ] OCR integration for image-based PDFs
- [ ] AI vision API integration for scanned documents
- [ ] DOC (legacy Word) format support
- [ ] RTF format support
- [ ] Database-backed job queue for persistence
- [ ] S3/GCS storage provider integration
- [ ] Redis-based distributed queue
- [ ] Real-time progress tracking via WebSockets
- [ ] Batch processing optimization
- [ ] Memory usage monitoring and optimization

## Dependencies

- `pdftotext` (system dependency)
- `pdf-parse` (npm package)
- Node.js Buffer and File APIs
- Logging infrastructure (`@/lib/logging`)
- Error handling utilities (`@/lib/errors`)

## Related Files

- `/lib/parsing/pdf.ts` - PDF parsing implementation
- `/lib/parsing/docx.ts` - DOCX parsing implementation
- `/lib/parsing/extract.ts` - PII extraction utilities
- `/lib/services/resume-processor.ts` - Resume analysis service
- `/lib/errors/correlation.ts` - Correlation ID generation
- `/lib/logging/` - Logging infrastructure
