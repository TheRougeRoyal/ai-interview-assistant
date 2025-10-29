import { rateLimit } from '@/lib/http/rateLimit'
import { json, handleApiError } from '@/lib/http/errors'
import { resumeProcessingService } from '@/lib/services/resume-processor'

const PDF_MIME = 'application/pdf'
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const DEFAULT_MAX_MB = 5
const BYTES_PER_MB = 1024 * 1024

function resolveMaxUploadBytes(): number {
  const fromEnv = Number(process.env.UPLOAD_MAX_MB)
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return fromEnv * BYTES_PER_MB
  }
  return DEFAULT_MAX_MB * BYTES_PER_MB
}

function badFile(message: string) {
  return json(400, {
    error: {
      code: 'BAD_FILE',
      message,
    },
  })
}

function unsupportedMedia(message: string) {
  return json(415, {
    error: {
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message,
    },
  })
}

function parsingFailed(message: string) {
  return json(422, {
    error: {
      code: 'SCHEMA_VALIDATION_FAILED',
      message,
    },
  })
}

export async function POST(req: Request) {
  try {
    await rateLimit(req, 'parse-resume')

    const form = await req.formData()
    const file = form.get('file')

    // Improved File validation using duck typing for better Node.js compatibility
    if (!file || typeof file === 'string') {
      return badFile('Expected resume upload under "file" field.')
    }

    // Check if it has File-like properties
    if (!('arrayBuffer' in file) || !('size' in file) || !('name' in file)) {
      return badFile('Invalid file upload format.')
    }

    if (!file.size) {
      return badFile('Uploaded file is empty.')
    }

    const maxBytes = resolveMaxUploadBytes()
    if (file.size > maxBytes) {
      const limitMb = (maxBytes / BYTES_PER_MB).toFixed(1)
      return badFile(`File exceeds ${limitMb} MB limit.`)
    }

    const mime = file.type?.toLowerCase()

    // Check file extension as fallback for mime type
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isPdf = mime === PDF_MIME || fileExtension === 'pdf';
    const isDocx = mime === DOCX_MIME || fileExtension === 'docx';
    
    if (!isPdf && !isDocx) {
      return unsupportedMedia('Only PDF or DOCX resumes are supported.');
    }

    try {
      // Use the enhanced resume processing service
      const resumeAnalysis = await resumeProcessingService.processResumeFile(file);
      
      console.log(`Resume processed using: ${resumeAnalysis.parseSource}`);
      console.log('Quality score:', resumeAnalysis.quality.score);
      if (resumeAnalysis.metadata) {
        console.log('PDF metadata:', JSON.stringify(resumeAnalysis.metadata, null, 2));
      }

      // Generate interview context for AI question generation
      const interviewContext = resumeProcessingService.generateInterviewContext(resumeAnalysis);
      
      return json(200, {
        // Legacy format for compatibility
        fields: resumeAnalysis.pii.fields,
        confidence: resumeAnalysis.pii.confidence,
        resumeMeta: {
          filename: file.name,
          size: file.size,
          mime: file.type,
          parseSource: resumeAnalysis.parseSource,
          metadata: resumeAnalysis.metadata,
        },
        resumeText: resumeAnalysis.text,
        
        // Enhanced analysis
        analysis: {
          sections: resumeAnalysis.sections,
          skills: resumeAnalysis.skills,
          experience: resumeAnalysis.experience,
          education: resumeAnalysis.education,
          quality: resumeAnalysis.quality,
          interviewContext,
        }
      });
    } catch (err) {
      console.error('Error processing resume:', err);
      return parsingFailed('Unable to process resume. Please upload a readable PDF or DOCX file.');
    }
  } catch (e) {
    return handleApiError(e)
  }
}
