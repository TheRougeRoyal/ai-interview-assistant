import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { FinalizeCandidateInput } from '@/lib/http/validation'
import { finalizeCandidate, getCandidate } from '@/lib/db/repositories/candidatesRepo'

// Force dynamic rendering for real-time candidate data
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(_req, 'candidate:get')
    // Hybrid auth: interviewer only (try cookie-based, fall back to bearer token)
    try {
      const { requireInterviewer: requireInterviewerServer } = await import('@/lib/auth/server')
      await requireInterviewerServer()
    } catch (cookieErr) {
      try {
        const { requireInterviewer: requireInterviewerHeader } = await import('@/lib/auth/middleware')
        const headerAuth = await requireInterviewerHeader(_req)
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
    const { id } = await params
    const candidate = await getCandidate(id)
  if (!candidate) return json(404, { error: { code: 'NOT_FOUND', message: 'candidate not found' } })
  return json(200, candidate)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(req, 'candidate:finalize')
    // Allow interviewee to finalize via cookie session or bearer token
    try {
      const { requireInterviewee: requireIntervieweeServer } = await import('@/lib/auth/server')
      await requireIntervieweeServer()
    } catch (cookieErr) {
      try {
        const { requireInterviewee: requireIntervieweeHeader } = await import('@/lib/auth/middleware')
        const headerAuth = await requireIntervieweeHeader(req)
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
    let body: unknown
    try { body = await req.json() } catch { return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' }) }
    const { id } = await params
    const parsed = FinalizeCandidateInput.parse({ ...(body as any), id })
    const candidate = await finalizeCandidate(parsed)
    // Notify subscribers that a candidate was finalized
    try {
      const { emitter } = await import('@/lib/utils/emitter')
      emitter.emit('candidate:finalized', { candidateId: candidate.id })
    } catch (emitErr) {
      console.error('Failed to emit candidate:finalized event', emitErr)
    }
    return json(200, candidate)
  } catch (err) {
    return handleApiError(err)
  }
}
