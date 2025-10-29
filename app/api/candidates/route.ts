import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { CreateCandidateInput } from '@/lib/http/validation'
import { createOrUpsertCandidate, listCandidates, updateCandidateWithResumeAnalysis } from '@/lib/db/repositories/candidatesRepo'
import { ask } from '@/lib/ai/gateway'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    await rateLimit(req, 'candidates:list')
    try {
      const { requireInterviewer: requireInterviewerServer } = await import('@/lib/auth/server')
      await requireInterviewerServer()
    } catch (cookieErr) {
      try {
        const { requireInterviewer: requireInterviewerHeader } = await import('@/lib/auth/middleware')
        const headerAuth = await requireInterviewerHeader(req)
        if ((headerAuth as any).error) {
          const status = (headerAuth as any).status || 401
          return json(status, { error: { code: 'UNAUTHORIZED', message: (headerAuth as any).error } })
        }
      } catch (bearerErr: any) {
        const msg = (bearerErr as any)?.message || (cookieErr as any)?.message || 'Authentication required'
        const status = String(msg).includes('Insufficient') ? 403 : 401
        return json(status, { error: { code: 'UNAUTHORIZED', message: msg } })
      }
    }
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
    const cursor = searchParams.get('cursor') || undefined
    const sortBy = (searchParams.get('sortBy') as 'finalScore' | 'createdAt') || undefined
    const order = (searchParams.get('order') as 'asc' | 'desc') || undefined
    const data = await listCandidates({ q, limit, cursor, sortBy, order })
  return json(200, data)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'candidates:create')
    let body: unknown
    try { body = await req.json() } catch { return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' }) }
    const parsed = CreateCandidateInput.parse(body)
    let candidate = await createOrUpsertCandidate(parsed)
    
    if (parsed.resumeText && parsed.resumeText.length > 50) {
      try {
        console.log(`Auto-processing resume for candidate ${candidate.id}`)
        const analysis = await ask('analyze_resume', { resumeText: parsed.resumeText })
        
        candidate = await updateCandidateWithResumeAnalysis({
          id: candidate.id,
          skills: analysis.skills,
          experienceYears: analysis.experience_years,
          seniorityLevel: analysis.seniority_level,
          qualityScore: analysis.quality_score,
          aiSummary: analysis.summary,
          aiStrengths: analysis.strengths
        })
        
        console.log(`Resume auto-processed for candidate ${candidate.id}`)
      } catch (aiError) {
        console.error('Resume auto-processing failed:', aiError)
      }
    }
    
    return json(201, candidate)
  } catch (err) {
    return handleApiError(err)
  }
}
