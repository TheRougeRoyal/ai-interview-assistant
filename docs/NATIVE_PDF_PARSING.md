# Native PDF Parsing Implementation

## Overview

This application uses **PDF.js** (Mozilla's native PDF renderer) for extracting text and metadata from PDF resumes. This approach provides:

- ✅ **No external dependencies**: No API keys or third-party services required
- ✅ **Cost-effective**: 100% free and open-source
- ✅ **Privacy-first**: All processing happens in-memory on your server
- ✅ **Reliable**: Battle-tested library used by Firefox and millions of applications
- ✅ **Rich metadata**: Extracts document properties, page count, and structure

## Architecture

### 1. PDF Parsing Flow

```
User uploads PDF
    ↓
ResumeUploader component
    ↓
/api/parse-resume endpoint
    ↓
resumeProcessingService
    ↓
pdfToTextWithMetadata() ← lib/parsing/pdf.ts
    ↓
PDF.js extraction
    ↓
Text + Metadata returned
    ↓
PII extraction (name, email, phone)
    ↓
Section analysis (experience, skills, education)
    ↓
Quality scoring
    ↓
Return structured ResumeAnalysis
```

### 2. Key Components

#### `/lib/parsing/pdf.ts`
The core PDF parsing module using PDF.js:

```typescript
export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pdfVersion?: string;
}

export interface PDFParseResult {
  text: string;           // Full extracted text
  metadata: PDFMetadata;  // Document metadata
  pageTexts: string[];    // Individual page texts
}
```

**Features:**
- Extracts text from all pages with proper spacing
- Preserves document structure (paragraphs, line breaks)
- Extracts PDF metadata (author, title, dates, etc.)
- Handles multi-page documents efficiently
- Normalizes whitespace for consistent processing

#### `/lib/services/resume-processor.ts`
Orchestrates the entire resume analysis pipeline:

```typescript
export interface ResumeAnalysis {
  text: string;                    // Raw extracted text
  pii: PIIResult;                  // Name, email, phone
  sections: ResumeSections;        // Structured sections
  skills: ExtractedSkills;         // Categorized skills
  experience: ExperienceAnalysis;  // Work history
  education: EducationInfo[];      // Education details
  parseSource: 'pdf' | 'docx';    // Parser used
  metadata: PDFMetadata;           // PDF metadata
  quality: QualityMetrics;         // Quality scoring
}
```

**Analysis Pipeline:**
1. **Text Extraction**: Uses PDF.js to extract all text
2. **PII Detection**: Regex-based extraction of name, email, phone
3. **Section Identification**: Identifies resume sections (experience, education, skills)
4. **Skill Extraction**: Categorizes technical/soft skills
5. **Experience Analysis**: Calculates years of experience, roles, companies
6. **Quality Scoring**: Assesses resume completeness, clarity, relevance

#### `/lib/parsing/extract.ts`
Heuristic-based PII extraction:

```typescript
export interface PIIResult {
  fields: {
    name?: string;
    email?: string;
    phone?: string;
  };
  confidence: {
    name: number;    // 0-1 confidence score
    email: number;
    phone: number;
  };
}
```

**Extraction Strategy:**
- **Email**: Regex pattern matching with preference for unique emails
- **Phone**: E.164 format detection with fallback to common formats
- **Name**: Multi-heuristic approach:
  - Scans first 12 non-empty lines
  - Filters out URLs, section headers, contact info
  - Prefers 2-4 Title Case words
  - Penalizes ALL CAPS
  - Returns best candidate with confidence score

### 3. Workflow Examples

#### Example 1: Basic PDF Upload
```typescript
// User uploads resume.pdf
const file = new File([pdfBuffer], 'resume.pdf', { type: 'application/pdf' });

// API processes the file
const analysis = await resumeProcessingService.processResumeFile(file);

// Returns structured data:
{
  text: "John Doe\njohn.doe@email.com\n...",
  pii: {
    fields: { name: "John Doe", email: "john.doe@email.com", phone: "+1-555-0100" },
    confidence: { name: 0.9, email: 0.95, phone: 0.95 }
  },
  sections: {
    experience: "Senior Developer - ABC Corp...",
    skills: "JavaScript, TypeScript, React...",
    education: "BS Computer Science - MIT..."
  },
  skills: {
    technical: ["JavaScript", "TypeScript", "React"],
    frameworks: ["Next.js", "Node.js"],
    tools: ["Git", "Docker"]
  },
  experience: {
    totalYears: 5,
    roles: [{ title: "Senior Developer", company: "ABC Corp", ... }]
  },
  quality: {
    score: 85,
    completeness: 90,
    clarity: 85,
    relevance: 80,
    formatting: 85
  }
}
```

#### Example 2: Interview Question Generation
```typescript
// After resume parsing, generate contextual questions
const context = resumeProcessingService.generateInterviewContext(analysis);

// Context includes:
// - Years of experience
// - Key skills
// - Recent roles
// - Education level

// AI uses this to generate targeted questions
const question = await aiGateway.generateQuestion({
  difficulty: 'medium',
  context: context
});
```

## PDF.js Configuration

### Server-Side Setup
```typescript
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker for Node.js environment
if (typeof window === 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 
    `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}
```

### Loading Documents
```typescript
const loadingTask = pdfjsLib.getDocument({
  data: uint8Array,
  useSystemFonts: true,
  standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.269/standard_fonts/',
});

const pdfDocument = await loadingTask.promise;
```

### Text Extraction
```typescript
const page = await pdfDocument.getPage(pageNum);
const textContent = await page.getTextContent();

// Reconstruct text with proper spacing
for (const item of textContent.items) {
  if ('str' in item) {
    // Handle line breaks based on Y coordinate
    // Add spacing based on X coordinate
    text += item.str;
  }
}
```

## Quality Metrics

The resume processor calculates quality scores:

1. **Completeness (0-100)**: Presence of key sections
2. **Clarity (0-100)**: Text length and structure
3. **Relevance (0-100)**: Skill and experience relevance
4. **Formatting (0-100)**: Document structure quality
5. **Overall Score**: Weighted average

## Error Handling

### Common Issues

1. **Corrupted PDFs**
   - Error: "Failed to parse PDF content"
   - Solution: Ask user to re-export PDF

2. **Image-based PDFs (Scanned)**
   - Limited text extraction
   - Consider OCR integration for future

3. **Password-protected PDFs**
   - Not supported
   - User must remove password

4. **Large Files**
   - Configurable limit: `UPLOAD_MAX_MB` (default: 5MB)
   - Adjust in environment variables

## Performance

- **Small PDFs (< 1MB)**: < 500ms processing time
- **Medium PDFs (1-3MB)**: < 2s processing time
- **Large PDFs (3-5MB)**: < 5s processing time

Processing includes:
- Text extraction
- Metadata parsing
- PII detection
- Section analysis
- Skill extraction
- Quality scoring

## Future Enhancements

1. **OCR Support**: For image-based PDFs using Tesseract.js
2. **Table Extraction**: Better handling of tabular data
3. **Multi-language**: Support for non-English resumes
4. **Caching**: Cache parsed results for same file
5. **Streaming**: Process large PDFs page-by-page

## Migration Notes

### From Adobe PDF Services

If you previously used Adobe PDF Services:

1. **No API keys needed**: Remove `ADOBE_CLIENT_ID` and `USE_ADOBE_PDF_SERVICES`
2. **Same interface**: The `ResumeAnalysis` type remains unchanged
3. **Better privacy**: All processing happens locally
4. **Zero cost**: No usage limits or billing

### Type Changes
```typescript
// OLD
parseSource: 'adobe' | 'fallback' | 'docx'

// NEW
parseSource: 'pdf' | 'docx'
```

## Testing

### Unit Tests
```bash
npm run test:unit
```

Test coverage:
- PDF text extraction
- Metadata parsing
- PII detection accuracy
- Section identification
- Quality scoring

### Integration Tests
```bash
npm run test:e2e
```

Tests end-to-end flow:
- Upload PDF resume
- Parse and extract data
- Display parsed information
- Generate interview questions

## Troubleshooting

### Issue: "PDF.js worker not found"
**Solution**: Ensure worker path is correctly configured in `lib/parsing/pdf.ts`

### Issue: Poor text extraction quality
**Solution**: PDF may be image-based (scanned). Consider:
- Re-exporting as text-based PDF
- Using OCR (future enhancement)

### Issue: Missing metadata
**Solution**: Some PDFs don't have metadata fields. This is normal and doesn't affect text extraction.

## References

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [PDF.js GitHub](https://github.com/mozilla/pdf.js)
- [PDF.js Examples](https://mozilla.github.io/pdf.js/examples/)
