import { prisma } from '../client'
import { toSessionDTO, toAnswerDTO } from '../dto'

interface CreateSessionArgs { candidateId: string; stage: string; plan: Array<{ index: number; difficulty: string; targetDurationMs: number }> }
export async function createSession(args: CreateSessionArgs) {
  const session = await prisma.interviewSession.create({ data: { candidateId: args.candidateId, stage: args.stage, currentIndex: 0, planJson: JSON.stringify(args.plan) } })
  return toSessionDTO(session)
}

export async function getSession(id: string) {
  const s = await prisma.interviewSession.findUnique({ where: { id } })
  if (!s) return null
  return toSessionDTO(s)
}

export async function getSessionFull(id: string) {
  const s = await prisma.interviewSession.findUnique({ where: { id }, include: { answers: true } })
  if (!s) return null
  return toSessionDTO(s, true)
}

interface UpdateProgressArgs { id: string; stage?: string; currentIndex?: number }
export async function updateSessionProgress(args: UpdateProgressArgs) {
  const s = await prisma.interviewSession.update({ where: { id: args.id }, data: { stage: args.stage, currentIndex: args.currentIndex } })
  return toSessionDTO(s)
}

interface UpsertAnswerArgs { sessionId: string; questionIndex: number; payload: { difficulty: string; question: string; answerText?: string; durationMs: number; timeTakenMs?: number; rubric?: any; submittedAt?: string } }
export async function upsertAnswer(args: UpsertAnswerArgs) {
  const a = await prisma.answer.upsert({
    where: { sessionId_questionIndex: { sessionId: args.sessionId, questionIndex: args.questionIndex } },
    create: { sessionId: args.sessionId, questionIndex: args.questionIndex, difficulty: args.payload.difficulty, question: args.payload.question, answerText: args.payload.answerText, durationMs: args.payload.durationMs, timeTakenMs: args.payload.timeTakenMs, rubricJson: args.payload.rubric ? JSON.stringify(args.payload.rubric) : undefined, submittedAt: args.payload.submittedAt ? new Date(args.payload.submittedAt) : undefined },
    update: { difficulty: args.payload.difficulty, question: args.payload.question, answerText: args.payload.answerText, durationMs: args.payload.durationMs, timeTakenMs: args.payload.timeTakenMs, rubricJson: args.payload.rubric ? JSON.stringify(args.payload.rubric) : undefined, submittedAt: args.payload.submittedAt ? new Date(args.payload.submittedAt) : undefined },
  })
  return toAnswerDTO(a)
}
