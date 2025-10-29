import { z } from 'zod'

/** Rubric scoring schema for individual answer evaluation */
export const RubricSchema = z.object({
  accuracy: z.number().min(0).max(100),
  completeness: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  timeliness: z.number().min(0).max(100),
  total: z.number().min(0).max(100),
  rationale: z.string().min(10).max(500),
})

/** Input validation for question generation endpoint */
export const GenerateQuestionInput = z.object({
  difficulty: z.enum(['easy', 'medium', 'hard']),
  role: z.string().min(2).max(40),
  resumeContext: z.string().max(800).optional(),
})

/** Input validation for answer scoring endpoint */
export const ScoreAnswerInput = z.object({
  questionIndex: z.number().int().min(0).max(5),
  question: z.string().min(8).max(400),
  answer: z.string().max(4000), // Allow empty answers (user might not respond)
  durationMs: z.number().int().positive().max(10 * 60 * 1000), // Max 10 minutes
  timeTakenMs: z.number().int().min(0),
  difficulty: z.enum(['easy','medium','hard']),
  resumeContext: z.string().max(800).optional(),
}).refine(v => v.timeTakenMs <= v.durationMs, {
  path: ['timeTakenMs'],
  message: 'must be ≤ durationMs'
})

/** Input validation for summary generation endpoint */
export const SummaryInput = z.object({
  rubrics: z.array(RubricSchema).min(1).max(20),
})

// Persistence Layer Schemas (Prompt D)
export const CreateCandidateInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  resumeMeta: z.object({ filename: z.string(), mime: z.string(), size: z.number().int().nonnegative() }).optional(),
  resumeText: z.string().optional(),
})

export const CreateSessionInput = z.object({
  candidateId: z.string().min(10),
  plan: z.array(z.object({ index: z.number().int().min(0).max(5), difficulty: z.enum(['easy','medium','hard']), targetDurationMs: z.number().int().positive() })).length(6),
})

export const UpdateProgressInput = z.object({
  stage: z.enum(['collecting_profile','interviewing','completed']).optional(),
  currentIndex: z.number().int().min(0).max(5).optional(),
}).refine(d => d.stage || d.currentIndex !== undefined, 'no-op')

export const UpsertAnswerInput = z.object({
  sessionId: z.string(),
  questionIndex: z.number().int().min(0).max(5),
  difficulty: z.enum(['easy','medium','hard']),
  question: z.string().min(8),
  answerText: z.string().optional(),
  durationMs: z.number().int().positive(),
  timeTakenMs: z.number().int().min(0).optional(),
  rubric: RubricSchema.optional(),
  submittedAt: z.string().datetime().optional(),
})

export const FinalizeCandidateInput = z.object({
  id: z.string(),
  finalScore: z.number().int().min(0).max(100),
  summary: z.string().min(10),
  strengths: z.array(z.string()).min(1).max(3),
  gap: z.string().min(3),
})

// Export TypeScript types
export type RubricSchemaT = z.infer<typeof RubricSchema>
export type GenerateQuestionInputT = z.infer<typeof GenerateQuestionInput>
export type ScoreAnswerInputT = z.infer<typeof ScoreAnswerInput>
export type SummaryInputT = z.infer<typeof SummaryInput>
export type CreateCandidateInputT = z.infer<typeof CreateCandidateInput>
export type CreateSessionInputT = z.infer<typeof CreateSessionInput>
export type UpdateProgressInputT = z.infer<typeof UpdateProgressInput>
export type UpsertAnswerInputT = z.infer<typeof UpsertAnswerInput>
export type FinalizeCandidateInputT = z.infer<typeof FinalizeCandidateInput>
