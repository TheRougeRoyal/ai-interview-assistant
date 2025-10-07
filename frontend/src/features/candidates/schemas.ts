import { z } from 'zod'

export const CandidateCreateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  resumeMeta: z.object({ filename: z.string(), mime: z.string(), size: z.number().int().nonnegative() }).optional(),
  resumeText: z.string().optional(),
})

export type CandidateCreateInput = z.infer<typeof CandidateCreateSchema>

