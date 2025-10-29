import type { Answer, InterviewSession, Candidate } from '@prisma/client'
import { z } from 'zod'

export const RubricDTO = z.object({
  accuracy: z.number(),
  completeness: z.number(),
  relevance: z.number(),
  timeliness: z.number(),
  total: z.number(),
  rationale: z.string(),
})
export type RubricDTOType = z.infer<typeof RubricDTO>

export const CandidateDTO = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  resumeFile: z.string().nullable().optional(),
  resumeMime: z.string().nullable().optional(),
  resumeSize: z.number().nullable().optional(),
  resumeText: z.string().nullable().optional(),
  finalScore: z.number().min(0).max(100).nullable().optional(),
  summary: z.string().nullable().optional(),
  strengths: z.array(z.string()).optional().nullable(),
  gap: z.string().nullable().optional(),
  // AI-extracted resume analysis
  skills: z
    .object({
      technical: z.array(z.string()).optional(),
      soft: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
      frameworks: z.array(z.string()).optional(),
      tools: z.array(z.string()).optional(),
      certifications: z.array(z.string()).optional(),
      domains: z.array(z.string()).optional(),
    })
    .nullable()
    .optional(),
  experienceYears: z.number().nullable().optional(),
  seniorityLevel: z.enum(["entry", "mid", "senior", "lead", "executive"]).nullable().optional(),
  qualityScore: z.number().min(0).max(100).nullable().optional(),
  aiSummary: z.string().nullable().optional(),
  aiStrengths: z.array(z.string()).nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type CandidateDTOType = z.infer<typeof CandidateDTO>

export const AnswerDTO = z.object({
  id: z.string(),
  sessionId: z.string(),
  questionIndex: z.number(),
  difficulty: z.string(),
  question: z.string(),
  answerText: z.string().nullable().optional(),
  durationMs: z.number(),
  timeTakenMs: z.number().nullable().optional(),
  rubric: z.any().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
})
export type AnswerDTOType = z.infer<typeof AnswerDTO>

export const SessionDTO = z.object({
  id: z.string(),
  candidateId: z.string(),
  stage: z.string(),
  currentIndex: z.number(),
  plan: z.array(z.object({
    index: z.number(),
    difficulty: z.string(),
    targetDurationMs: z.number(),
  })),
  createdAt: z.string(),
  updatedAt: z.string(),
  answers: z.array(AnswerDTO).optional(),
})
export type SessionDTOType = z.infer<typeof SessionDTO>

const StrengthsSchema = z.array(z.string())

function parseStrengths(strengthsJson: string | null): string[] | null {
  if (!strengthsJson) return null
  try {
    const parsed = JSON.parse(strengthsJson)
    const result = StrengthsSchema.safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function toOptionalIsoString(value: Date | string | null | undefined): string | undefined {
  if (value == null) return undefined
  return toIsoString(value)
}

function parseRubric(rubricJson: string | null): RubricDTOType | undefined {
  if (!rubricJson) return undefined
  try {
    const parsed = JSON.parse(rubricJson)
    const result = RubricDTO.safeParse(parsed)
    return result.success ? result.data : undefined
  } catch {
    return undefined
  }
}

const PlanSchema = SessionDTO.shape.plan

type SessionRecord = InterviewSession & { answers?: Answer[] }

function parsePlan(planJson: string | null | undefined) {
  if (!planJson) return []
  try {
    const parsed = JSON.parse(planJson)
    const result = PlanSchema.safeParse(parsed)
    return result.success ? result.data : []
  } catch {
    return []
  }
}

function parseSkills(skillsJson: string | null) {
  if (!skillsJson) return null
  try {
    const parsed = JSON.parse(skillsJson)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch {
    return null
  }
}

function parseAIStrengths(aiStrengthsJson: string | null): string[] | null {
  if (!aiStrengthsJson) return null
  try {
    const parsed = JSON.parse(aiStrengthsJson)
    const result = z.array(z.string()).safeParse(parsed)
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function toCandidateDTO(db: Candidate): CandidateDTOType {
  const strengths = parseStrengths(db.strengthsJson ?? null)
  const skills = parseSkills((db as any).skillsJson ?? null)
  const aiStrengths = parseAIStrengths((db as any).aiStrengthsJson ?? null)
  
  return CandidateDTO.parse({
    ...db,
    strengths,
    skills,
    experienceYears: (db as any).experienceYears ?? undefined,
    seniorityLevel: (db as any).seniorityLevel ?? undefined,
    qualityScore: (db as any).qualityScore ?? undefined,
    aiSummary: (db as any).aiSummary ?? undefined,
    aiStrengths,
    createdAt: toIsoString(db.createdAt),
    updatedAt: toIsoString(db.updatedAt),
  })
}

export function toAnswerDTO(db: Answer): AnswerDTOType {
  return AnswerDTO.parse({
    ...db,
    rubric: parseRubric(db.rubricJson ?? null),
    submittedAt: toOptionalIsoString(db.submittedAt),
  })
}

export function toSessionDTO(db: SessionRecord, withAnswers = false): SessionDTOType {
  const plan = parsePlan(db.planJson)
  const answers = withAnswers ? (db.answers ?? []).map((a) => toAnswerDTO(a)) : undefined
  return SessionDTO.parse({
    ...db,
    plan,
    answers,
    createdAt: toIsoString(db.createdAt),
    updatedAt: toIsoString(db.updatedAt),
  })
}
