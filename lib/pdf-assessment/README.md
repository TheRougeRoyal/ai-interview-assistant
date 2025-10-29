# In-House PDF Assessment System

A comprehensive AI-powered PDF processing and skill assessment system that replaces Adobe PDF Services with enhanced capabilities for resume analysis and question generation.

## 🚀 Features

### Core Capabilities
- **Smart PDF Processing**: Advanced text extraction with fallback mechanisms
- **AI-Powered Analysis**: Intelligent document structure recognition and skill extraction
- **Skill Assessment**: Automatic generation of personalized assessment questions
- **Multi-Format Support**: Handles various PDF layouts and structures
- **Real-time Processing**: Fast, efficient processing with progress tracking

### Question Generation
- **Multiple Question Types**: Multiple-choice, coding challenges, scenarios, explanations
- **Adaptive Difficulty**: Questions tailored to candidate experience level
- **Skill-Specific**: Questions generated based on extracted technical skills
- **Time Estimation**: Automatic time allocation for each question type

### Data Extraction
- **Personal Information**: Contact details, professional summary
- **Technical Skills**: Programming languages, frameworks, tools
- **Work Experience**: Job history with technologies and achievements
- **Education**: Degrees, institutions, academic achievements
- **Projects**: Portfolio projects with technology stacks

## 📁 Architecture

```
lib/pdf-assessment/
├── types.ts              # TypeScript type definitions
├── processor.ts          # Main PDF processor class
├── analyzer.ts           # Document structure analysis
├── skill-extractor.ts    # AI-powered data extraction
├── question-generator.ts # Assessment question generation
├── config.ts            # Configuration management
└── index.ts             # Main exports
```

## 🛠️ Installation & Setup

### 1. Install Dependencies
The system uses existing dependencies in your project:
- `pdf-parse` - PDF text extraction
- `openai` - AI processing via your gateway
- Standard Node.js libraries

### 2. Environment Configuration
Add these variables to your `.env.local`:

```bash
# PDF Assessment System Configuration
PDF_ASSESSMENT_MODEL=gpt-4
PDF_ASSESSMENT_TEMPERATURE=0.3
PDF_ASSESSMENT_MAX_TOKENS=4000
PDF_ASSESSMENT_STRUCTURED_EXTRACTION=true
PDF_ASSESSMENT_QUESTION_GENERATION=true
```

### 3. Migration from Adobe PDF Services
Run the migration script to transition from Adobe:

```bash
# Dry run to see what will be changed
tsx scripts/migrate-from-adobe.ts --dry-run

# Execute the migration
tsx scripts/migrate-from-adobe.ts
```

## 📖 Usage

### Basic PDF Processing

```typescript
import { pdfProcessor } from '@/lib/pdf-assessment';

// Process a PDF file
const result = await pdfProcessor.processPDF(file);
console.log('Extracted skills:', result.extractedData.skills.technical);
```

### Generate Assessment Questions

```typescript
// Process PDF and generate questions in one step
const { processingResult, assessment } = await pdfProcessor.processAndAssess(file);

// Or generate questions from existing data
const assessment = await pdfProcessor.generateAssessment(processingResult);
```

### Custom Configuration

```typescript
import { createPDFProcessor } from '@/lib/pdf-assessment';

const customProcessor = createPDFProcessor({
  model: 'gpt-3.5-turbo',
  temperature: 0.4,
  skillCategories: ['programming', 'frontend', 'backend'],
  questionTypes: ['multiple-choice', 'coding']
});
```

## 🔧 API Endpoints

### POST /api/process-pdf
Process PDF files with optional question generation.

**Request:**
```bash
curl -X POST /api/process-pdf \
  -F "file=@resume.pdf" \
  -F "generateQuestions=true"
```

**Response:**
```json
{
  "success": true,
  "processingResult": {
    "text": "...",
    "metadata": {...},
    "extractedData": {...}
  },
  "assessment": [...],
  "stats": {...}
}
```

### POST /api/generate-assessment
Generate questions from processed data.

**Request:**
```json
{
  "extractedData": {...},
  "structure": {...},
  "config": {
    "questionTypes": ["multiple-choice", "coding"]
  }
}
```

### POST /api/assess-resume
Enhanced resume assessment with AI analysis.

**Supports both JSON and multipart/form-data for file uploads.**

## 🎯 Question Types

### Multiple Choice
- **Time Limit**: 3 minutes
- **Use Case**: Quick knowledge verification
- **Example**: "Which of the following is a JavaScript framework?"

### Coding Challenges
- **Time Limit**: 15 minutes
- **Use Case**: Practical programming skills
- **Example**: "Write a function to reverse a string"

### Scenario Questions
- **Time Limit**: 10 minutes
- **Use Case**: Problem-solving and decision-making
- **Example**: "How would you optimize a slow database query?"

### Explanation Questions
- **Time Limit**: 8 minutes
- **Use Case**: Conceptual understanding
- **Example**: "Explain the difference between REST and GraphQL"

## ⚙️ Configuration Options

### AI Model Settings
```typescript
{
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'deepseek',
  temperature: 0.0-1.0,  // Creativity level
  maxTokens: 100-8000    // Response length limit
}
```

### Skill Categories
- `programming` - Programming languages
- `frontend` - Frontend frameworks and tools
- `backend` - Backend frameworks and APIs
- `database` - Database systems and query languages
- `cloud` - Cloud platforms and services
- `devops` - DevOps tools and practices
- `mobile` - Mobile development frameworks
- `data-science` - Data analysis and ML tools

### Difficulty Levels
- `beginner` - 0-1 years experience
- `intermediate` - 1-3 years experience
- `advanced` - 3-5 years experience
- `expert` - 5+ years experience

## 🔍 Monitoring & Analytics

### Processing Statistics
```typescript
const stats = pdfProcessor.getStats();
console.log({
  documentsProcessed: stats.analyzer.documentsAnalyzed,
  averageProcessingTime: stats.analyzer.averageProcessingTime,
  questionsGenerated: stats.questionGenerator.questionsGenerated,
  successRate: stats.analyzer.successRate
});
```

### Error Handling
The system includes comprehensive error handling with fallback mechanisms:
- PDF parsing fallbacks (pdftotext → pdf-parse)
- AI processing fallbacks (structured → heuristic analysis)
- Graceful degradation for partial failures

## 🚀 Performance Optimization

### Processing Speed
- Parallel AI requests for different data types
- Efficient text chunking for large documents
- Caching of processed results (implement as needed)

### Resource Usage
- Configurable token limits to control AI costs
- Batch processing for multiple files
- Memory-efficient streaming for large PDFs

## 🔒 Security & Privacy

### Data Protection
- No external API dependencies (except your AI gateway)
- Local PDF processing without cloud uploads
- Configurable data retention policies

### Input Validation
- File type and size validation
- Content sanitization
- Rate limiting on API endpoints

## 🧪 Testing

### Unit Tests
```bash
npm test lib/pdf-assessment
```

### Integration Tests
```bash
# Test with sample PDF files
npm run test:pdf-processing
```

### Manual Testing
1. Visit `/pdf-assessment` page
2. Upload a test resume PDF
3. Verify skill extraction accuracy
4. Review generated questions quality

## 🔄 Migration from Adobe PDF Services

### What's Replaced
- ✅ Text extraction (Adobe → pdftotext/pdf-parse)
- ✅ Metadata extraction (Adobe → enhanced AI analysis)
- ✅ Document structure analysis (Adobe → AI-powered)
- ✅ Error handling (Adobe SDK → custom fallbacks)

### New Capabilities
- ✨ AI-powered skill extraction
- ✨ Automatic question generation
- ✨ Personalized difficulty adjustment
- ✨ Enhanced resume analysis
- ✨ No external dependencies

### Migration Checklist
- [ ] Run migration script
- [ ] Update environment variables
- [ ] Test PDF processing
- [ ] Verify question generation
- [ ] Update documentation
- [ ] Deploy to staging
- [ ] Monitor performance

## 📊 Comparison: Adobe vs In-House

| Feature | Adobe PDF Services | In-House System |
|---------|-------------------|-----------------|
| **Cost** | Per-API-call pricing | No external costs |
| **Dependencies** | External API | Self-contained |
| **Customization** | Limited | Fully customizable |
| **AI Integration** | None | Built-in AI analysis |
| **Question Generation** | None | Automatic |
| **Skill Assessment** | None | Comprehensive |
| **Data Privacy** | Third-party | Complete control |
| **Offline Capability** | No | Yes (except AI calls) |

## 🤝 Contributing

### Adding New Question Types
1. Update `types.ts` with new question type
2. Add generation logic in `question-generator.ts`
3. Update UI components to handle new type
4. Add tests and documentation

### Adding New Skill Categories
1. Update `config.ts` skill categories
2. Add category-specific question templates
3. Update skill extraction logic
4. Test with relevant resumes

## 📚 Troubleshooting

### Common Issues

**PDF Processing Fails**
- Check file size (< 10MB limit)
- Verify PDF is not password-protected
- Ensure pdftotext is installed on system

**AI Extraction Returns Empty Results**
- Check AI gateway configuration
- Verify API rate limits
- Review input text quality

**Questions Not Generated**
- Ensure `enableQuestionGeneration` is true
- Check if skills were extracted successfully
- Verify AI model has sufficient context

### Debug Mode
Enable detailed logging:
```bash
DEBUG=pdf-assessment npm run dev
```

## 📈 Roadmap

### Planned Features
- [ ] Batch processing for multiple files
- [ ] Custom question templates
- [ ] Integration with assessment platforms
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] OCR for scanned PDFs

### Performance Improvements
- [ ] Caching layer for processed results
- [ ] Background job processing
- [ ] Streaming responses for large files
- [ ] CDN integration for static assets

---

## 📞 Support

For questions or issues:
1. Check this documentation
2. Review the troubleshooting section
3. Check existing GitHub issues
4. Create a new issue with detailed information

**Happy assessing! 🎯**