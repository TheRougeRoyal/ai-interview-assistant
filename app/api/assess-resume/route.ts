import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { ask } from '@/lib/ai/gateway'
import type { ResumeAnalysis } from '@/lib/services/resume-processor'

interface AssessResumeRequest {
  resumeText: string;
  analysis?: ResumeAnalysis;
}

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'assess-resume')
    
    const contentType = req.headers.get('content-type') || ''
    let body: AssessResumeRequest
    
    if (contentType.includes('multipart/form-data')) {
      // Handle file upload for enhanced processing
      const formData = await req.formData()
      const file = formData.get('file') as File
      const enhancedProcessing = formData.get('enhancedProcessing') === 'true'
      
      if (!file) {
        return json(400, { error: 'File is required for enhanced processing' })
      }

      if (enhancedProcessing) {
        return await handleEnhancedProcessing(file)
      } else {
        // Extract text and use legacy processing
        const processingResult = await pdfProcessor.processPDF(file)
        body = { 
          resumeText: processingResult.text,
          enhancedProcessing: false
        }
      }
    } else {
      // Handle JSON request (legacy)
      body = await req.json() as AssessResumeRequest
    }

    const { resumeText, analysis } = body

    if (!resumeText) {
      return json(400, { error: 'Resume text is required' })
    }

    let strengths: string[] = []
    let improvements: string[] = []

    // If we have enhanced analysis, use it
    if (analysis) {
      strengths = generateStrengthsFromAnalysis(analysis)
      improvements = generateImprovementsFromAnalysis(analysis)
      console.log('Using structured analysis with quality score:', analysis.quality.score)
    } else {
      // Use AI-enhanced assessment
      const aiAssessment = await generateAIAssessment(resumeText)
      strengths = aiAssessment.strengths
      improvements = aiAssessment.improvements
    }

    return json(200, { 
      strengths: [...new Set(strengths)].slice(0, 5),
      improvements: [...new Set(improvements)].slice(0, 5)
    })
  } catch (err) {
    return handleApiError(err)
  }
}

/**
 * Handle enhanced PDF processing with AI-powered assessment
 */
async function handleEnhancedProcessing(file: File) {
  try {
    console.log('Processing PDF with enhanced AI assessment...')
    
    // Process PDF and generate complete assessment
    const result = await pdfProcessor.processAndAssess(file)
    const { processingResult, assessment } = result
    
    // Generate strengths and improvements from enhanced data
    const strengths = generateStrengthsFromEnhancedData(processingResult)
    const improvements = generateImprovementsFromEnhancedData(processingResult)
    
    return json(200, {
      strengths: [...new Set(strengths)].slice(0, 5),
      improvements: [...new Set(improvements)].slice(0, 5),
      enhancedData: {
        extractedData: processingResult.extractedData,
        assessment: assessment,
        metadata: processingResult.metadata,
        skillsFound: processingResult.extractedData.skills.technical.length,
        experienceYears: calculateTotalExperience(processingResult.extractedData),
        assessmentQuestions: assessment.reduce((sum, a) => sum + a.questions.length, 0)
      }
    })
    
  } catch (error) {
    console.error('Enhanced processing failed:', error)
    throw new Error(`Enhanced processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Generate AI-powered assessment for resume text
 */
async function generateAIAssessment(resumeText: string) {
  try {
    const prompt = `Analyze this resume and provide strengths and areas for improvement:

${resumeText.substring(0, 2000)}

Provide a JSON response with:
{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"]
}

Focus on:
- Technical skills and experience
- Professional presentation
- Quantifiable achievements
- Career progression
- Skill diversity and depth`

    const response = await ask(prompt, {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 800
    })

    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || []
      }
    }
    
    // Fallback if parsing fails
    return {
      strengths: ['Resume content successfully analyzed'],
      improvements: ['Consider adding more specific technical details']
    }
    
  } catch (error) {
    console.warn('AI assessment failed, using fallback:', error)
    return {
      strengths: ['Resume content is present and readable'],
      improvements: ['Consider improving structure and adding quantifiable achievements']
    }
  }
}

function generateStrengthsFromAnalysis(analysis: ResumeAnalysis): string[] {
  const strengths: string[] = []

  // Quality-based strengths
  if (analysis.quality.score >= 80) {
    strengths.push('Excellent overall resume quality and structure')
  } else if (analysis.quality.score >= 60) {
    strengths.push('Good resume structure and organization')
  }

  // Experience-based strengths
  if (analysis.experience.totalYears >= 5) {
    strengths.push(`Strong professional background with ${analysis.experience.totalYears}+ years of experience`)
  }

  // Skills-based strengths
  if (analysis.skills.technical.length >= 5) {
    strengths.push('Comprehensive technical skill set demonstrated')
  }
  if (analysis.skills.frameworks.length >= 3) {
    strengths.push('Experience with multiple modern frameworks and technologies')
  }

  // Section completeness
  if (analysis.sections.summary) {
    strengths.push('Clear professional summary provided')
  }
  if (analysis.sections.projects) {
    strengths.push('Project experience highlighted effectively')
  }

  // Contact information
  if (analysis.pii.fields.email && analysis.pii.fields.phone) {
    strengths.push('Complete contact information provided')
  }

  return strengths
}

function generateImprovementsFromAnalysis(analysis: ResumeAnalysis): string[] {
  const improvements: string[] = []

  // Quality-based improvements
  if (analysis.quality.score < 60) {
    improvements.push('Consider improving overall resume structure and formatting')
  }
  if (analysis.quality.completeness < 20) {
    improvements.push('Add more comprehensive contact and background information')
  }

  // Experience improvements
  if (analysis.experience.totalYears === 0) {
    improvements.push('Include specific dates and duration for work experience')
  }
  if (analysis.experience.roles.length === 0) {
    improvements.push('Add detailed job titles and company information')
  }

  // Skills improvements
  if (analysis.skills.technical.length < 3) {
    improvements.push('Expand technical skills section with specific technologies')
  }
  if (analysis.skills.soft.length === 0) {
    improvements.push('Consider adding soft skills and leadership abilities')
  }

  // Section improvements
  if (!analysis.sections.summary) {
    improvements.push('Add a professional summary or objective statement')
  }
  if (!analysis.sections.projects) {
    improvements.push('Include a projects section to showcase practical experience')
  }
  if (!analysis.sections.achievements) {
    improvements.push('Add achievements and quantifiable accomplishments')
  }

  // Contact improvements
  if (!analysis.pii.fields.name) {
    improvements.push('Ensure your full name is clearly visible at the top')
  }
  if (!analysis.pii.fields.email) {
    improvements.push('Include a professional email address')
  }

  return improvements
}
/**
 * G
enerate strengths from enhanced processing data
 */
function generateStrengthsFromEnhancedData(processingResult: PDFProcessingResult): string[] {
  const { extractedData, metadata } = processingResult
  const strengths: string[] = []

  // Technical skills assessment
  if (extractedData.skills.technical.length >= 5) {
    strengths.push(`Strong technical skill set with ${extractedData.skills.technical.length} technologies`)
  }

  // Experience assessment
  const totalYears = calculateTotalExperience(extractedData)
  if (totalYears >= 3) {
    strengths.push(`Solid professional experience spanning ${totalYears} years`)
  }

  // Education assessment
  if (extractedData.education.length > 0) {
    const degrees = extractedData.education.map(edu => edu.degree).join(', ')
    strengths.push(`Strong educational background: ${degrees}`)
  }

  // Projects assessment
  if (extractedData.projects.length >= 2) {
    strengths.push(`Demonstrates practical experience with ${extractedData.projects.length} documented projects`)
  }

  // Frameworks and tools
  if (extractedData.skills.frameworks.length >= 3) {
    strengths.push('Experience with modern frameworks and development tools')
  }

  // Certifications
  if (extractedData.skills.certifications.length > 0) {
    strengths.push(`Professional certifications: ${extractedData.skills.certifications.join(', ')}`)
  }

  // Contact completeness
  const contactFields = Object.values(extractedData.personalInfo).filter(Boolean).length
  if (contactFields >= 3) {
    strengths.push('Complete professional contact information provided')
  }

  return strengths.length > 0 ? strengths : ['Resume successfully processed with AI enhancement']
}

/**
 * Generate improvements from enhanced processing data
 */
function generateImprovementsFromEnhancedData(processingResult: PDFProcessingResult): string[] {
  const { extractedData } = processingResult
  const improvements: string[] = []

  // Technical skills gaps
  if (extractedData.skills.technical.length < 3) {
    improvements.push('Consider expanding technical skills section with specific technologies')
  }

  // Experience gaps
  const totalYears = calculateTotalExperience(extractedData)
  if (totalYears < 1) {
    improvements.push('Include more detailed work experience with specific dates and achievements')
  }

  // Missing sections
  if (!extractedData.personalInfo.summary) {
    improvements.push('Add a professional summary to highlight key qualifications')
  }

  if (extractedData.projects.length === 0) {
    improvements.push('Include a projects section to showcase practical experience')
  }

  if (extractedData.achievements.length === 0) {
    improvements.push('Add quantifiable achievements and accomplishments')
  }

  // Soft skills
  if (extractedData.skills.soft.length === 0) {
    improvements.push('Consider adding soft skills and leadership abilities')
  }

  // Contact information gaps
  if (!extractedData.personalInfo.email) {
    improvements.push('Ensure professional email address is clearly visible')
  }

  if (!extractedData.personalInfo.linkedin && !extractedData.personalInfo.github) {
    improvements.push('Add professional social profiles (LinkedIn, GitHub)')
  }

  // Skill proficiency
  const skillsWithoutProficiency = extractedData.skills.technical.filter(skill => !skill.proficiency)
  if (skillsWithoutProficiency.length > 0) {
    improvements.push('Consider indicating proficiency levels for technical skills')
  }

  return improvements.length > 0 ? improvements : ['Consider adding more quantifiable achievements']
}

/**
 * Calculate total years of experience
 */
function calculateTotalExperience(extractedData: ExtractedData): number {
  return extractedData.experience.reduce((total, exp) => {
    if (exp.duration) {
      const yearMatch = exp.duration.match(/(\d+)\s*year/i)
      const monthMatch = exp.duration.match(/(\d+)\s*month/i)
      
      let years = yearMatch ? parseInt(yearMatch[1]) : 0
      const months = monthMatch ? parseInt(monthMatch[1]) : 0
      
      years += months / 12
      return total + years
    }
    return total
  }, 0)
}