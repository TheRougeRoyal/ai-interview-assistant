import { prisma } from '../client'
import { toCandidateDTO, toSessionDTO } from '../dto'

interface UpsertCandidateArgs {
  name: string
  email: string
  phone?: string
  resumeMeta?: { filename: string; mime: string; size: number }
  resumeText?: string
}

export async function createOrUpsertCandidate(input: UpsertCandidateArgs) {
  const { name, email, phone, resumeMeta, resumeText } = input
  const existing = await prisma.candidate.findUnique({ where: { email } })
  if (existing) {
    const updated = await prisma.candidate.update({ where: { email }, data: {
      name,
      phone,
      resumeFile: resumeMeta?.filename,
      resumeMime: resumeMeta?.mime,
      resumeSize: resumeMeta?.size,
      resumeText: resumeText ?? undefined,
    } })
    return toCandidateDTO(updated)
  }
  const created = await prisma.candidate.create({ data: {
    name,
    email,
    phone,
    resumeFile: resumeMeta?.filename,
    resumeMime: resumeMeta?.mime,
    resumeSize: resumeMeta?.size,
    resumeText: resumeText ?? undefined,
    strengthsJson: '[]',
  } })
  return toCandidateDTO(created)
}

interface ListParams {
  q?: string
  sortBy?: 'finalScore' | 'createdAt'
  order?: 'asc' | 'desc'
  limit?: number
  cursor?: string
}

export async function listCandidates(params: ListParams) {
  const { q, sortBy = 'createdAt', order = 'desc', limit = 20, cursor } = params
  const where = q ? { OR: [ { name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } } ] } : {}
  const candidates = await prisma.candidate.findMany({
    where,
    orderBy: sortBy === 'finalScore' ? [{ finalScore: order }, { createdAt: 'desc' }] : [{ createdAt: order }],
    take: limit + 1,
    skip: cursor ? 1 : undefined,
    cursor: cursor ? { id: cursor } : undefined,
    include: {
      sessions: {
        orderBy: { createdAt: 'desc' },
        include: {
          answers: {
            orderBy: { questionIndex: 'asc' }
          }
        }
      }
    }
  })
  const hasMore = candidates.length > limit
  const items = candidates.slice(0, limit).map(candidate => {
    const candidateDTO = toCandidateDTO(candidate)
    
    // Determine status based on final score, session stage and answers
    let status = 'not_started'
    if (candidate.finalScore != null) {
      status = 'completed'
    } else if (candidate.sessions.length > 0) {
      const session = candidate.sessions[0] // newest first due to orderBy above
      const answersCount = session.answers.length
      if (session.stage === 'completed') {
        status = 'completed'
      } else if (answersCount === 0) {
        status = 'not_started'
      } else {
        status = 'in_progress'
      }
    }
    
    // Include session summary for table display
    const sessions = candidate.sessions.length > 0 ? [{
      id: candidate.sessions[0].id,
      answers: candidate.sessions[0].answers,
      createdAt: candidate.sessions[0].createdAt.toISOString()
    }] : []
    
    return {
      ...candidateDTO,
      status,
      sessions
    }
  })
  return { items, nextCursor: hasMore ? candidates[limit].id : null }
}

export async function getCandidate(id: string) {
  const c = await prisma.candidate.findUnique({ where: { id } })
  if (!c) return null
  return toCandidateDTO(c)
}

export async function getCandidateWithSessions(id: string) {
  const c = await prisma.candidate.findUnique({ 
    where: { id },
    include: {
      sessions: {
        include: {
          answers: true
        }
      }
    }
  })
  if (!c) return null
  
  const candidateData = toCandidateDTO(c)
  const sessions = c.sessions.map(session => toSessionDTO(session, true))
  
  return {
    ...candidateData,
    sessions
  }
}

interface FinalizeArgs { id: string; finalScore: number; summary: string; strengths: string[]; gap: string }
export async function finalizeCandidate(args: FinalizeArgs) {
  const { id, finalScore, summary, strengths, gap } = args
  const c = await prisma.candidate.update({ where: { id }, data: { finalScore, summary, strengthsJson: JSON.stringify(strengths), gap } })
  return toCandidateDTO(c)
}

interface ProcessResumeArgs {
  id: string
  skills: {
    technical: string[]
    soft: string[]
    languages: string[]
    frameworks: string[]
    tools: string[]
    certifications?: string[]
    domains?: string[]
  }
  experienceYears: number
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  qualityScore: number
  aiSummary: string
  aiStrengths: string[]
}

export async function updateCandidateWithResumeAnalysis(args: ProcessResumeArgs) {
  const { id, skills, experienceYears, seniorityLevel, qualityScore, aiSummary, aiStrengths } = args
  const c = await prisma.candidate.update({
    where: { id },
    data: {
      skillsJson: JSON.stringify(skills),
      experienceYears,
      seniorityLevel,
      qualityScore,
      aiSummary,
      aiStrengthsJson: JSON.stringify(aiStrengths)
    }
  })
  return toCandidateDTO(c)
}
