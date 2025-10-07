import { NextRequest } from 'next/server'
import { rateLimit } from '@/lib/http/rateLimit'
import { handleApiError, json } from '@/lib/http/errors'
import { UpsertAnswerInput } from '@/lib/http/validation'
import { upsertAnswer } from '@/lib/db/repositories/sessionsRepo'

const IDEMPOTENCY_CACHE = new Map<string, { at: number }>()
const IDEMPOTENCY_TTL_MS = 60_000

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await rateLimit(req, 'answers:upsert')
    const key = req.headers.get('x-idempotency-key') || undefined
    if (key) {
      const existing = IDEMPOTENCY_CACHE.get(key)
      const now = Date.now()
      if (existing && (now - existing.at) < IDEMPOTENCY_TTL_MS) {
        IDEMPOTENCY_CACHE.set(key, { at: now })
      } else {
        IDEMPOTENCY_CACHE.set(key, { at: now })
      }
    }
    let body: unknown
    try { body = await req.json() } catch { return handleApiError({ code: 'BAD_JSON', message: 'Invalid JSON body' }) }
    const { id } = await params
    const parsed = UpsertAnswerInput.parse({ ...(body as any), sessionId: id })
    const answer = await upsertAnswer({ sessionId: id, questionIndex: parsed.questionIndex, payload: { difficulty: parsed.difficulty, question: parsed.question, answerText: parsed.answerText, durationMs: parsed.durationMs, timeTakenMs: parsed.timeTakenMs, rubric: parsed.rubric, submittedAt: parsed.submittedAt } })
    return json(201, answer)
  } catch (err) {
    return handleApiError(err)
  }
}
