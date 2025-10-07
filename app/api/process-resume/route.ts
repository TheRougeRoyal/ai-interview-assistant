import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { z } from 'zod'
import { ask } from '@/lib/ai/gateway'
import { getCandidate, updateCandidateWithResumeAnalysis } from '@/lib/db/repositories/candidatesRepo'

const ProcessResumeInput = z.object({
  candidateId: z.string(),
  resumeText: z.string().min(50, 'Resume text too short for analysis')
})

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'resume:process')
    
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' })
    }
    
    const parsed = ProcessResumeInput.parse(body)
    const { candidateId, resumeText } = parsed
    
    // Check if candidate exists
    const candidate = await getCandidate(candidateId)
    
    if (!candidate) {
      return json(404, { error: { code: 'NOT_FOUND', message: 'Candidate not found' } })
    }
    
    // Use AI to analyze the resume
    console.log(`Processing resume for candidate ${candidateId}`)
    const analysis = await ask('analyze_resume', { resumeText })
    
    // Update candidate with AI analysis results
    const updatedCandidate = await updateCandidateWithResumeAnalysis({
      id: candidateId,
      skills: analysis.skills,
      experienceYears: analysis.experience_years,
      seniorityLevel: analysis.seniority_level,
      qualityScore: analysis.quality_score,
      aiSummary: analysis.summary,
      aiStrengths: analysis.strengths
    })
    
    console.log(`Resume processed successfully for candidate ${candidateId}`)
    
    return json(200, {
      candidate: updatedCandidate,
      analysis: {
        skills: analysis.skills,
        experienceYears: analysis.experience_years,
        seniorityLevel: analysis.seniority_level,
        qualityScore: analysis.quality_score,
        summary: analysis.summary,
        strengths: analysis.strengths
      }
    })
    
  } catch (err) {
    console.error('Resume processing error:', err)
    return handleApiError(err)
  }
}

// GET endpoint to check processing status
export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, 'resume:status')
    
    const { searchParams } = new URL(req.url)
    const candidateId = searchParams.get('candidateId')
    
    if (!candidateId) {
      return handleApiError({ code: 'MISSING_PARAMS', message: 'candidateId is required' })
    }
    
    const candidate = await getCandidate(candidateId)
    
    if (!candidate) {
      return json(404, { error: { code: 'NOT_FOUND', message: 'Candidate not found' } })
    }
    
    const hasAIAnalysis = !!candidate.skills
    const hasResumeText = !!candidate.resumeText
    
    return json(200, {
      candidateId,
      hasResumeText,
      hasAIAnalysis,
      lastProcessed: candidate.updatedAt,
      status: hasAIAnalysis ? 'completed' : hasResumeText ? 'ready' : 'missing_resume'
    })
    
  } catch (err) {
    return handleApiError(err)
  }
}