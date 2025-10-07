import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { UpdateProgressInput } from '@/lib/http/validation'
import { getSessionFull, updateSessionProgress } from '@/lib/db/repositories/sessionsRepo'

// Force dynamic rendering for real-time session data
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(_req, 'sessions:get')
    const { id } = await params
    const session = await getSessionFull(id)
  if (!session) return json(404, { error: { code: 'NOT_FOUND', message: 'session not found' } })
  return json(200, session)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(req, 'sessions:update')
    let body: unknown
    try { body = await req.json() } catch { return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' }) }
    const parsed = UpdateProgressInput.parse(body)
    const { id } = await params
    const session = await updateSessionProgress({ id, stage: parsed.stage, currentIndex: parsed.currentIndex })
    return json(200, session)
  } catch (err) {
    return handleApiError(err)
  }
}
