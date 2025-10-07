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
    const body = await req.json() as AssessResumeRequest
    const { resumeText, analysis } = body

    if (!resumeText) {
      return json(400, { error: 'Resume text is required' })
    }

    let strengths: string[] = []
    let improvements: string[] = []

    // If we have enhanced analysis from Adobe PDF processing, use it
    if (analysis) {
      // Generate assessment based on structured data
      strengths = generateStrengthsFromAnalysis(analysis)
      improvements = generateImprovementsFromAnalysis(analysis)
      
      // Use structured analysis only for now
      // TODO: Add AI enhancement when assess_resume task is implemented in gateway
      console.log('Using structured analysis with quality score:', analysis.quality.score)
    } else {
      // Fallback to basic assessment without AI for now
      strengths = [
        'Resume content is present and readable',
        'Basic information successfully extracted'
      ]
      improvements = [
        'Consider adding more specific technical details',
        'Include quantifiable achievements and metrics',
        'Ensure all sections are clearly structured'
      ]
    }

    return json(200, { 
      strengths: [...new Set(strengths)].slice(0, 5), // Dedupe and limit
      improvements: [...new Set(improvements)].slice(0, 5)
    })
  } catch (err) {
    return handleApiError(err)
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