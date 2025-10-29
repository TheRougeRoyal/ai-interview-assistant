import { ask } from '@/lib/ai/gateway'
import { updateCandidateWithResumeAnalysis } from '@/lib/db/repositories/candidatesRepo'

export interface ResumeProcessingResult {
  success: boolean
  candidateId: string
  analysis?: {
    skills: {
      technical: string[]
      soft: string[]
      languages: string[]
      frameworks: string[]
      tools: string[]
      certifications?: string[]
      domains?: string[]
    }
    experienceYears: number
    seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
    qualityScore: number
    summary: string
    strengths: string[]
  }
  error?: string
}

/**
 * Enhanced AI-powered resume processing service
 * Extracts and categorizes skills, analyzes experience, and provides insights
 */
export class AIResumeProcessor {
  
  /**
   * Process resume text using AI to extract structured information
   */
  async processResumeText(candidateId: string, resumeText: string): Promise<ResumeProcessingResult> {
    try {
      console.log(`Starting AI resume processing for candidate ${candidateId}`)
      
      // Validate input
      if (!resumeText || resumeText.length < 50) {
        return {
          success: false,
          candidateId,
          error: 'Resume text too short for meaningful analysis'
        }
      }
      
      // Use AI to analyze the resume
      const analysis = await ask('analyze_resume', { resumeText })
      
      // Update candidate record with analysis
      await updateCandidateWithResumeAnalysis({
        id: candidateId,
        skills: analysis.skills,
        experienceYears: analysis.experience_years,
        seniorityLevel: analysis.seniority_level,
        qualityScore: analysis.quality_score,
        aiSummary: analysis.summary,
        aiStrengths: analysis.strengths
      })
      
      console.log(`Resume processing completed for candidate ${candidateId}`)
      console.log(`- Skills extracted: ${Object.values(analysis.skills).flat().length} total`)
      console.log(`- Experience: ${analysis.experience_years} years (${analysis.seniority_level})`)
      console.log(`- Quality score: ${analysis.quality_score}/100`)
      
      return {
        success: true,
        candidateId,
        analysis: {
          skills: analysis.skills,
          experienceYears: analysis.experience_years,
          seniorityLevel: analysis.seniority_level,
          qualityScore: analysis.quality_score,
          summary: analysis.summary,
          strengths: analysis.strengths
        }
      }
      
    } catch (error) {
      console.error(`Resume processing failed for candidate ${candidateId}:`, error)
      return {
        success: false,
        candidateId,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      }
    }
  }
  
  /**
   * Batch process multiple resumes
   */
  async batchProcessResumes(candidates: Array<{ id: string; resumeText: string }>): Promise<ResumeProcessingResult[]> {
    const results: ResumeProcessingResult[] = []
    
    for (const candidate of candidates) {
      const result = await this.processResumeText(candidate.id, candidate.resumeText)
      results.push(result)
      
      // Add small delay to avoid overwhelming the AI service
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    return results
  }
  
  /**
   * Generate interview context from skills analysis
   */
  generateInterviewContext(analysis: {
    skills: { technical: string[]; frameworks: string[]; tools: string[] }
    experienceYears: number
    seniorityLevel: string
  }): string {
    const allTechSkills = [
      ...analysis.skills.technical,
      ...analysis.skills.frameworks,
      ...analysis.skills.tools
    ].slice(0, 10) // Limit to top 10 for context
    
    return `Candidate profile: ${analysis.experienceYears} years experience, ${analysis.seniorityLevel} level. Key technologies: ${allTechSkills.join(', ')}.`
  }
  
  /**
   * Validate resume quality and suggest improvements
   */
  validateResumeQuality(qualityScore: number): {
    isAcceptable: boolean
    feedback: string[]
    recommendations: string[]
  } {
    const feedback: string[] = []
    const recommendations: string[] = []
    
    if (qualityScore < 40) {
      feedback.push('Resume quality is below acceptable standards')
      recommendations.push('Consider reformatting for better structure and clarity')
      recommendations.push('Add more specific technical details and achievements')
    } else if (qualityScore < 70) {
      feedback.push('Resume quality is adequate but could be improved')
      recommendations.push('Add more quantified achievements and impact metrics')
      recommendations.push('Ensure consistent formatting and clear section headers')
    } else {
      feedback.push('Resume quality meets professional standards')
    }
    
    return {
      isAcceptable: qualityScore >= 40,
      feedback,
      recommendations
    }
  }
}

// Export singleton instance
export const aiResumeProcessor = new AIResumeProcessor()