import { ask } from '@/lib/ai/gateway'
import { rateLimit } from '@/lib/http/rateLimit'
import { json, handleApiError } from '@/lib/http/errors'
import { indexToDifficulty, difficultyToDurationMs } from '@/lib/interview/plan'
import { z } from 'zod'

const GenerateQuestionSchema = z.object({
  questionIndex: z.number().int().min(0).max(5),
  role: z.string().min(2).max(40),
  resumeContext: z.string().max(800).optional(),
})

export async function POST(req: Request) {
  try {
    await rateLimit(req, 'generate-question')
    const body = await req.json()
    const { questionIndex, role, resumeContext } = GenerateQuestionSchema.parse(body)
    const difficulty = indexToDifficulty(questionIndex)
    const targetDurationMs = difficultyToDurationMs(difficulty)
    const out = await ask('generate_question', { difficulty, role, resumeContext })
    return json(200, {
      prompt: out.prompt,
      targetDurationMs,
      difficulty,
    })
  } catch (e) {
    return handleApiError(e)
  }
}
