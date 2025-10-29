import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { getCandidateWithSessions } from '@/lib/db/repositories/candidatesRepo'

// Force dynamic rendering for real-time candidate data
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(_req, 'candidate:full')
    const { id } = await params
    const candidate = await getCandidateWithSessions(id)
    if (!candidate) return json(404, { error: { code: 'NOT_FOUND', message: 'candidate not found' } })
    return json(200, candidate)
  } catch (err) {
    return handleApiError(err)
  }
}