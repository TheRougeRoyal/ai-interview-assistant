# AI-Powered Resume Processing System

## Overview

The AI-Powered Resume Processing System automatically extracts, categorizes, and analyzes resume content to provide structured insights for the interview process. It integrates seamlessly with the existing application workflow and uses AI to ensure consistent, comprehensive analysis.

## Features

### 🤖 AI-Powered Analysis
- **Skills Extraction**: Automatically categorizes skills into technical, soft, languages, frameworks, tools, certifications, and domains
- **Experience Analysis**: Determines years of experience and seniority level (entry/mid/senior/lead/executive)
- **Quality Assessment**: Provides a 0-100 quality score for resume completeness and professionalism
- **Professional Summary**: Generates concise 2-3 sentence summary of candidate profile
- **Strengths Identification**: Highlights top 3-5 key strengths from resume content

### 📊 Structured Data Storage
- **Database Schema**: New fields in Candidate model for structured AI analysis
- **Skills Categorization**: JSON storage with organized skill categories
- **Analysis Metadata**: Experience years, seniority level, quality metrics
- **AI Insights**: Generated summaries and identified strengths

### 🔄 Automated Processing
- **Auto-Processing**: New candidates with resumes are automatically processed
- **Batch Processing**: Script to process existing candidates' resumes
- **Error Handling**: Graceful degradation if AI processing fails
- **Background Processing**: Non-blocking resume analysis

## API Endpoints

### Process Resume
```
POST /api/process-resume
```
Manually trigger AI analysis for a specific candidate's resume.

**Request Body:**
```json
{
  "candidateId": "string",
  "resumeText": "string"
}
```

**Response:**
```json
{
  "candidate": {
    "id": "string",
    "skills": {
      "technical": ["JavaScript", "Python"],
      "soft": ["Leadership", "Communication"],
      "languages": ["English", "Spanish"],
      "frameworks": ["React", "Django"],
      "tools": ["Git", "Docker"],
      "certifications": ["AWS Certified"],
      "domains": ["Healthcare", "Finance"]
    },
    "experienceYears": 5,
    "seniorityLevel": "senior",
    "qualityScore": 85,
    "aiSummary": "...",
    "aiStrengths": ["Problem Solving", "Leadership"]
  },
  "analysis": { /* same structure */ }
}
```

### Check Processing Status
```
GET /api/process-resume?candidateId=<id>
```
Check if a candidate's resume has been processed.

**Response:**
```json
{
  "candidateId": "string",
  "hasResumeText": true,
  "hasAIAnalysis": true,
  "lastProcessed": "2024-01-01T00:00:00Z",
  "status": "completed" // or "ready" or "missing_resume"
}
```

## Database Schema Updates

### New Candidate Fields
```sql
-- AI-extracted resume analysis
skillsJson       STRING  -- JSON object with categorized skills
experienceYears  INTEGER -- Years of experience from AI analysis
seniorityLevel   STRING  -- entry, mid, senior, lead, executive
qualityScore     INTEGER -- Resume quality score 0-100
aiSummary        STRING  -- AI-generated professional summary
aiStrengthsJson  STRING  -- JSON array of AI-identified strengths
```

## Usage Examples

### 1. Automatic Processing (Built-in)
When creating a candidate with resume text, processing happens automatically:

```javascript
// Candidate creation automatically triggers AI processing
const candidate = await createOrUpsertCandidate({
  name: "John Doe",
  email: "john@example.com",
  resumeText: "Full resume content here..."
})
// AI analysis runs in background
```

### 2. Manual Processing
```javascript
import { aiResumeProcessor } from '@/lib/services/ai-resume-processor'

const result = await aiResumeProcessor.processResumeText(
  candidateId, 
  resumeText
)

if (result.success) {
  console.log('Analysis:', result.analysis)
} else {
  console.error('Error:', result.error)
}
```

### 3. Batch Processing Existing Resumes
```bash
# Dry run to see what would be processed
npm run process-resumes:dry

# Process all unanalyzed resumes
npm run process-resumes

# Process with limit
npm run process-resumes -- --limit=10
```

### 4. Test AI Integration
```bash
# Test AI resume processing with sample data
npm run test-ai-resume
```

## AI Vendor Configuration

### OpenAI (Recommended)
```env
AI_VENDOR=openai
OPENAI_API_KEY=your_openai_api_key
AI_MODEL=gpt-4o-mini
```

### Mock (Development/Testing)
```env
AI_VENDOR=mock
```

## Skills Categories

The system organizes skills into these categories:

- **Technical**: Programming languages, databases, cloud platforms
- **Soft**: Communication, leadership, problem-solving, teamwork
- **Languages**: Spoken/written languages (English, Spanish, etc.)
- **Frameworks**: React, Django, TensorFlow, Spring
- **Tools**: Git, Docker, VS Code, Jira, Figma
- **Certifications**: AWS Certified, PMP, etc.
- **Domains**: Healthcare, Finance, E-commerce, etc.

## Quality Scoring

Resume quality is scored 0-100 based on:
- **Completeness** (25%): All sections present
- **Clarity** (25%): Clear structure and formatting
- **Relevance** (25%): Job-relevant content
- **Detail Level** (25%): Specific achievements and metrics

## Dashboard Integration

The enhanced dashboard now shows:
- **AI Analysis Summary**: Experience, seniority, quality score
- **Categorized Skills**: Visual skill badges by category
- **Professional Summary**: AI-generated candidate overview
- **Key Strengths**: AI-identified top strengths
- **Resume Quality**: Visual quality assessment

## Error Handling

- **Graceful Degradation**: Candidate creation succeeds even if AI processing fails
- **Retry Logic**: Built-in retry for transient AI service errors
- **Logging**: Comprehensive logging for debugging and monitoring
- **Validation**: Input validation for resume text length and quality

## Performance Considerations

- **Async Processing**: Resume analysis doesn't block user interactions
- **Rate Limiting**: Built-in rate limiting for AI service calls
- **Batch Processing**: Efficient bulk processing with delays
- **Caching**: Analysis results cached in database

## Monitoring & Analytics

Track resume processing with:
- Success/failure rates
- Processing times
- Quality score distributions
- Skills frequency analysis
- AI vendor performance metrics

## Future Enhancements

Planned improvements:
- Resume comparison and ranking
- Skills gap analysis
- Industry-specific skill weighting
- Resume improvement suggestions
- Multilingual resume support
- Custom skill taxonomy