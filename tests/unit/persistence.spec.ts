import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db/client'
import { createOrUpsertCandidate, finalizeCandidate, listCandidates } from '@/lib/db/repositories/candidatesRepo'
import { createSession, upsertAnswer, getSessionFull } from '@/lib/db/repositories/sessionsRepo'

beforeAll(async () => {
})

describe.skip('persistence layer', () => {
  it('candidate -> session -> answer upsert idempotent -> finalize -> list', async () => {
    const uniqueEmail = `alice-${Date.now()}@example.com`
    const candidate = await createOrUpsertCandidate({ name: 'Alice Test', email: uniqueEmail })
    expect(candidate.id).toBeTruthy()

    const plan = Array.from({ length: 6 }, (_, i) => ({ index: i, difficulty: i < 2 ? 'easy' : i < 4 ? 'medium' : 'hard', targetDurationMs: i < 2 ? 20000 : i < 4 ? 60000 : 120000 }))
    const session = await createSession({ candidateId: candidate.id, stage: 'collecting_profile', plan })
    expect(session.candidateId).toBe(candidate.id)

    const a1 = await upsertAnswer({ sessionId: session.id, questionIndex: 0, payload: { difficulty: 'easy', question: 'Explain event loop', durationMs: 20000 } })
    const a2 = await upsertAnswer({ sessionId: session.id, questionIndex: 0, payload: { difficulty: 'easy', question: 'Explain event loop', durationMs: 20000 } })
    expect(a1.id).toEqual(a2.id)

    const full = await getSessionFull(session.id)
    expect(full?.answers?.length).toBe(1)

    const finalized = await finalizeCandidate({ id: candidate.id, finalScore: 92, summary: 'Great performer', strengths: ['Communication'], gap: 'None' })
    expect(finalized.finalScore).toBe(92)

  const list = await listCandidates({ sortBy: 'finalScore', order: 'desc', limit: 50 })
  expect(list.items.some((c: any) => c.id === candidate.id)).toBe(true)
  })
})

afterAll(async () => {
  await prisma.$disconnect()
})
