import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { CreateSessionInput } from '@/lib/http/validation'
import { createSession } from '@/lib/db/repositories/sessionsRepo'

// Force dynamic rendering for real-time session data
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'sessions:create')
    let body: unknown
    try { body = await req.json() } catch { return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' }) }
    const parsed = CreateSessionInput.parse(body)
    const session = await createSession({ candidateId: parsed.candidateId, stage: 'collecting_profile', plan: parsed.plan })
    return json(201, session)
  } catch (err) {
    return handleApiError(err)
  }
}
