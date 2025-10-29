import { ask } from '@/lib/ai/gateway'
import { ScoreAnswerInput } from '@/lib/http/validation'
import { rateLimit } from '@/lib/http/rateLimit'
import { json, handleApiError } from '@/lib/http/errors'

export async function POST(req: Request) {
  try {
    await rateLimit(req, 'score-answer')
    
    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      console.error('Score answer: Invalid JSON body')
      return json(400, { error: { code: 'BAD_JSON', message: 'Invalid JSON body' } })
    }

    const validated = ScoreAnswerInput.parse(raw)
    console.log(`Scoring Q${validated.questionIndex}: "${validated.answer.substring(0, 50)}${validated.answer.length > 50 ? '...' : ''}"`)

    const { questionIndex, ...payload } = validated
    const result = await ask('score', payload)
    
    console.log(`Scored Q${questionIndex}: ${result.total}/100`)
    return json(200, { questionIndex, ...result })
  } catch (e) {
    console.error('Score answer error:', e)
    return handleApiError(e)
  }
}
