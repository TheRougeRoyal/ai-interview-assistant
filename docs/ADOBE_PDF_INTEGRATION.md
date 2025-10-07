# Adobe PDF Services Integration

This document describes the integration of Adobe PDF Services into the AI Interview Assistant for enhanced resume processing.

## Overview

The application now supports Adobe PDF Services API for superior PDF text extraction and analysis, with automatic fallback to PDF.js when Adobe services are unavailable.

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Adobe PDF Services
ADOBE_CLIENT_ID=afba7a8cafe041d083c1c7c35d0b2927
USE_ADOBE_PDF_SERVICES=true
```

### API Key

Your Adobe API key: `afba7a8cafe041d083c1c7c35d0b2927`

## Features

### Enhanced PDF Processing

1. **Adobe PDF Services Integration** (`/lib/parsing/adobe-pdf.ts`)
   - Text extraction with metadata
   - Superior accuracy compared to PDF.js
   - Automatic fallback mechanism

2. **Enhanced Resume Processing Service** (`/lib/services/resume-processor.ts`)
   - Structured section extraction (summary, experience, education, skills)
   - Technical skill categorization
   - Experience analysis (years, roles, companies)
   - Quality metrics (completeness, clarity, relevance, formatting)
   - Interview context generation

3. **Updated APIs**
   - `/api/parse-resume` - Enhanced with Adobe processing and structured analysis
   - `/api/assess-resume` - Leverages structured data for better assessments
   - `/api/test-adobe-pdf` - Test endpoint for Adobe integration

### Interview System Integration

The processed resume data flows into the interview system:

1. **Resume Upload** → Adobe PDF processing → Structured analysis
2. **Quality Assessment** → Generated from structured data + AI enhancement
3. **Interview Context** → Feeds into AI question generation
4. **Enhanced Metadata** → Available for interviewer dashboard

## Usage

### Testing the Integration

1. Visit `/test-adobe` to test Adobe PDF Services directly
2. Upload a PDF to see:
   - Processing time
   - Text extraction quality
   - Metadata extraction
   - Fallback behavior

### Resume Upload Flow

1. User uploads PDF/DOCX resume
2. System attempts Adobe PDF Services (if enabled)
3. Falls back to PDF.js/DOCX parser if needed
4. Extracts structured data (sections, skills, experience)
5. Generates quality metrics and interview context
6. Feeds enhanced data to interview system

## API Endpoints

### POST /api/parse-resume
Enhanced resume parsing with Adobe integration.

**Response includes:**
```json
{
  "fields": { "name": "...", "email": "...", "phone": "..." },
  "confidence": { "name": 0.95, "email": 0.98, "phone": 0.85 },
  "resumeMeta": {
    "filename": "resume.pdf",
    "parseSource": "adobe",
    "metadata": { /* PDF metadata */ }
  },
  "resumeText": "extracted text...",
  "analysis": {
    "sections": { /* structured sections */ },
    "skills": { /* categorized skills */ },
    "experience": { /* analyzed experience */ },
    "quality": { "score": 85, /* quality metrics */ },
    "interviewContext": "context for AI..."
  }
}
```

### GET/POST /api/test-adobe-pdf
Test Adobe PDF Services integration.

### POST /api/assess-resume
Enhanced resume assessment using structured data.

## Architecture

```
Resume Upload → Adobe PDF Services → Resume Processor → Interview System
     ↓              ↓ (fallback)           ↓                   ↓
  File Input → PDF.js/DOCX Parser → Structured Analysis → Question Gen
```

## Benefits

1. **Better Accuracy**: Adobe PDF Services provides superior text extraction
2. **Structured Data**: Rich analysis feeds better interview questions
3. **Quality Metrics**: Objective resume scoring
4. **Metadata**: Enhanced file information and processing details
5. **Fallback Support**: Graceful degradation when Adobe services unavailable
6. **Interview Context**: AI gets better candidate information for question generation

## Error Handling

- Network failures → Fallback to PDF.js
- API key issues → Fallback with logging
- Unsupported files → Clear error messages
- Processing timeouts → Graceful fallback

## Monitoring

The system logs:
- Parse source used (adobe/fallback/docx)
- Processing times
- Quality scores
- Error conditions

Check browser console and server logs for detailed processing information.

## Next Steps

1. **AI Enhancement**: Add resume assessment AI task to the gateway
2. **Caching**: Implement processed resume caching
3. **Analytics**: Track parsing success rates and quality metrics
4. **Advanced Features**: Table extraction, image text recognition
5. **Batch Processing**: Handle multiple resume uploads

## Troubleshooting

### Adobe Services Not Working
1. Check API key in environment variables
2. Verify `USE_ADOBE_PDF_SERVICES=true`
3. Check network connectivity
4. Review server logs for specific errors

### Fallback Issues
1. Ensure PDF.js dependencies are installed
2. Check file type validation
3. Verify file size limits

### Quality Issues
1. Review structured extraction logic
2. Check PII extraction patterns
3. Validate skill categorization lists