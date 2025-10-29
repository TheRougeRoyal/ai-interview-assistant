# File Processing Service Architecture

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     File Processing Service                      │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    API Layer                                │ │
│  │  - processFile()                                            │ │
│  │  - processBatch()                                           │ │
│  │  - validateFile()                                           │ │
│  │  - getProcessingStatus()                                    │ │
│  │  - extractMetadata()                                        │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  Core Service Layer                         │ │
│  │  - Job Management                                           │ │
│  │  - Middleware Pipeline                                      │ │
│  │  - Event Emission                                           │ │
│  │  - Statistics Tracking                                      │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│          ┌──────────────────┼──────────────────┐                │
│          ▼                   ▼                  ▼                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Validator  │  │  Job Queue   │  │  Processors  │          │
│  │              │  │              │  │              │          │
│  │ - Size       │  │ - Add Job    │  │ - PDF        │          │
│  │ - Format     │  │ - Update     │  │ - DOCX       │          │
│  │ - Signature  │  │ - Status     │  │ - Custom     │          │
│  │ - Content    │  │ - Priority   │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                               │                  │
│                                               ▼                  │
│                                      ┌──────────────┐            │
│                                      │  Fallbacks   │            │
│                                      │              │            │
│                                      │ - Simple     │            │
│                                      │ - AI Vision  │            │
│                                      │ - Retry      │            │
│                                      │ - Minimal    │            │
│                                      └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

## Processing Flow

```
┌─────────┐
│  File   │
│ Upload  │
└────┬────┘
     │
     ▼
┌─────────────────┐
│   Validation    │
│  - Size check   │
│  - Format check │
│  - Signature    │
└────┬────────────┘
     │
     ├─── Invalid ──────► Return Error
     │
     ▼ Valid
┌─────────────────┐
│  Create Job     │
│  - Generate ID  │
│  - Set Priority │
│  - Queue        │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Middleware     │
│  - Before       │
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│  Process File   │
│  - Select       │
│    Processor    │
│  - Extract Text │
│  - Get Metadata │
└────┬────────────┘
     │
     ├─── Success ──┐
     │              │
     ▼ Failure      ▼
┌─────────────┐  ┌──────────────┐
│  Fallback   │  │  Middleware  │
│  Strategy   │  │  - After     │
└────┬────────┘  └────┬─────────┘
     │                │
     └────────┬───────┘
              │
              ▼
        ┌──────────┐
        │  Result  │
        │  - Text  │
        │  - Meta  │
        │  - Stats │
        └──────────┘
```

## Processor Selection

```
File Type Detection
        │
        ├─── .pdf / application/pdf
        │         │
        │         ▼
        │    ┌──────────────────┐
        │    │ PDFFileProcessor │
        │    │                  │
        │    │ 1. pdftotext     │
        │    │ 2. pdf-parse     │
        │    └──────────────────┘
        │
        ├─── .docx / application/vnd.openxml...
        │         │
        │         ▼
        │    ┌───────────────────┐
        │    │ DOCXFileProcessor │
        │    │                   │
        │    │ 1. Native parser  │
        │    └───────────────────┘
        │
        └─── Unknown
                  │
                  ▼
             ┌─────────┐
             │  Error  │
             └─────────┘
```

## Fallback Strategy Chain

```
Primary Processing Failed
          │
          ▼
    ┌──────────────────────┐
    │ SimpleTextExtraction │  ◄── Try extracting any text
    └──────────┬───────────┘
               │
               ├─── Success ──► Return Result
               │
               ▼ Failure
    ┌──────────────────────┐
    │  AIVisionExtraction  │  ◄── Try OCR/Vision API
    └──────────┬───────────┘      (if enabled)
               │
               ├─── Success ──► Return Result
               │
               ▼ Failure
    ┌──────────────────────┐
    │  RetryWithOptions    │  ◄── Retry with modified opts
    └──────────┬───────────┘
               │
               ├─── Success ──► Return Result
               │
               ▼ Failure
    ┌──────────────────────┐
    │ MinimalExtraction    │  ◄── Last resort: file info
    └──────────┬───────────┘
               │
               ▼
          Return Result
       (even if minimal)
```

## Event Flow

```
Client Code
    │
    │ processFile(file)
    │
    ▼
┌───────────────────┐
│ FileProcessing    │
│ Service           │
└─────┬─────────────┘
      │
      ├──► JOB_CREATED ──────────────┐
      │                               │
      ├──► JOB_STARTED ───────────────┤
      │                               │
      ├──► JOB_PROGRESS ──────────────┤──► Event Listeners
      │                               │    - Logging
      ├──► JOB_COMPLETED ─────────────┤    - Notifications
      │                               │    - Analytics
      ├──► JOB_FAILED ────────────────┤    - Monitoring
      │                               │
      └──► JOB_CANCELLED ─────────────┘
```

## Service Lifecycle

```
┌────────────────────┐
│  Initialization    │
│  - Create service  │
│  - Register        │
│    processors      │
│  - Register        │
│    fallbacks       │
│  - Setup queue     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Active State      │
│  - Process files   │
│  - Handle jobs     │
│  - Emit events     │
│  - Track stats     │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│  Cleanup           │
│  - Cancel active   │
│    jobs            │
│  - Clear queues    │
│  - Remove          │
│    listeners       │
└────────────────────┘
```

## Configuration Hierarchy

```
┌──────────────────────────────────┐
│  Environment Detection           │
│  - process.env.NODE_ENV          │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────┐
│   DEV    │    │   PROD   │
│          │    │          │
│ 50MB     │    │ 5MB      │
│ 10 jobs  │    │ 3 jobs   │
│ 60s      │    │ 20s      │
│ 5 retry  │    │ 2 retry  │
└──────────┘    └──────────┘
     │               │
     └───────┬───────┘
             │
             ▼
    ┌────────────────┐
    │  Custom Config │
    │  (Optional)    │
    │  - Override    │
    │    defaults    │
    └────────────────┘
```

## Integration Points

```
┌──────────────────────────────────────────────────┐
│              Client Application                   │
└────────────┬─────────────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌──────────┐    ┌──────────────┐
│ API      │    │ Resume       │
│ Routes   │    │ Processor    │
└────┬─────┘    └────┬─────────┘
     │               │
     └───────┬───────┘
             │
             ▼
┌───────────────────────────────┐
│  File Processing Service      │
└────────┬──────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌─────────┐ ┌────────────┐
│ Parsing │ │ Logging    │
│ Library │ │ System     │
└─────────┘ └────────────┘
```

## Data Flow

```
File (Browser/Upload)
        │
        ▼
File Object / Buffer
        │
        ▼
Validation Result
        │
        ▼
Processing Job
        │
        ▼
┌───────────────┐
│   Processor   │
│   - Extract   │
│   - Parse     │
│   - Validate  │
└───────┬───────┘
        │
        ▼
┌───────────────┐
│ Raw Text      │
│ + Metadata    │
└───────┬───────┘
        │
        ▼
Processing Result
        │
        ▼
┌───────────────┐
│ Return to     │
│ Caller        │
└───────────────┘
```
