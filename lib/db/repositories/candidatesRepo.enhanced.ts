/**
 * Enhanced candidates repository using the base repository pattern
 */

import { Candidate, Prisma, PrismaClient } from '@prisma/client'
import { AbstractBaseRepository, type PrismaTransaction } from './base'
import { Repository, RepositoryNames } from './factory'
import { toCandidateDTO, type CandidateDTOType } from '../dto'

/**
 * Candidate create input interface
 */
export interface CreateCandidateInput {
  name: string
  email: string
  phone?: string
  resumeFile?: string
  resumeMime?: string
  resumeSize?: number
  resumeText?: string
}

/**
 * Candidate update input interface
 */
export interface UpdateCandidateInput {
  name?: string
  email?: string
  phone?: string
  resumeFile?: string
  resumeMime?: string
  resumeSize?: number
  resumeText?: string
  finalScore?: number
  summary?: string
  strengthsJson?: string
  gap?: string
  skillsJson?: string
  experienceYears?: number
  seniorityLevel?: string
  qualityScore?: number
  aiSummary?: string
  aiStrengthsJson?: string
}

/**
 * Candidate where input interface
 */
export interface CandidateWhereInput extends Prisma.CandidateWhereInput {}

/**
 * Candidate list parameters
 */
export interface ListCandidatesParams {
  q?: string
  sortBy?: 'finalScore' | 'createdAt' | 'name'
  order?: 'asc' | 'desc'
  limit?: number
  cursor?: string
  includeStrengths?: boolean
  includeSkills?: boolean
  includeSessions?: boolean
}

/**
 * Resume analysis input
 */
export interface ResumeAnalysisInput {
  id: string
  skills: {
    technical?: string[]
    soft?: string[]
    languages?: string[]
    frameworks?: string[]
    tools?: string[]
    certifications?: string[]
    domains?: string[]
  }
  experienceYears: number
  seniorityLevel: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  qualityScore: number
  aiSummary: string
  aiStrengths: string[]
}

/**
 * Candidate finalization input
 */
export interface FinalizeCandidateInput {
  id: string
  finalScore: number
  summary: string
  strengths: string[]
  gap: string
}

/**
 * Enhanced candidates repository
 */
@Repository(RepositoryNames.CANDIDATES)
export class CandidatesRepository extends AbstractBaseRepository<
  CandidateDTOType,
  CreateCandidateInput,
  UpdateCandidateInput,
  CandidateWhereInput
> {
  constructor() {
    super('Candidate', {
      enableLogging: true,
      enablePerformanceTracking: true
    })
  }

  /**
   * Get Prisma delegate
   */
  protected getDelegate(client?: PrismaClient | PrismaTransaction) {
    return (client || this.prisma).candidate
  }

  /**
   * Get Prisma client (for accessing in methods)
   */
  private get prisma() {
    const { prisma } = require('../client')
    return prisma
  }

  /**
   * Transform database record to domain model
   */
  protected toDomainModel(record: Candidate): CandidateDTOType {
    return toCandidateDTO(record)
  }

  /**
   * Transform create input to Prisma create input
   */
  protected toPrismaCreateInput(input: CreateCandidateInput): Prisma.CandidateCreateInput {
    return {
      name: input.name,
      email: input.email,
      phone: input.phone,
      resumeFile: input.resumeFile,
      resumeMime: input.resumeMime,
      resumeSize: input.resumeSize,
      resumeText: input.resumeText,
      strengthsJson: '[]' // Default empty array
    }
  }

  /**
   * Transform update input to Prisma update input
   */
  protected toPrismaUpdateInput(input: UpdateCandidateInput): Prisma.CandidateUpdateInput {
    return {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.resumeFile !== undefined && { resumeFile: input.resumeFile }),
      ...(input.resumeMime !== undefined && { resumeMime: input.resumeMime }),
      ...(input.resumeSize !== undefined && { resumeSize: input.resumeSize }),
      ...(input.resumeText !== undefined && { resumeText: input.resumeText }),
      ...(input.finalScore !== undefined && { finalScore: input.finalScore }),
      ...(input.summary !== undefined && { summary: input.summary }),
      ...(input.strengthsJson !== undefined && { strengthsJson: input.strengthsJson }),
      ...(input.gap !== undefined && { gap: input.gap }),
      ...(input.skillsJson !== undefined && { skillsJson: input.skillsJson }),
      ...(input.experienceYears !== undefined && { experienceYears: input.experienceYears }),
      ...(input.seniorityLevel !== undefined && { seniorityLevel: input.seniorityLevel }),
      ...(input.qualityScore !== undefined && { qualityScore: input.qualityScore }),
      ...(input.aiSummary !== undefined && { aiSummary: input.aiSummary }),
      ...(input.aiStrengthsJson !== undefined && { aiStrengthsJson: input.aiStrengthsJson })
    }
  }

  /**
   * Create or upsert candidate by email
   */
  async createOrUpsert(input: CreateCandidateInput): Promise<CandidateDTOType> {
    return this.executeOperation('createOrUpsert', async () => {
      const delegate = this.getDelegate()
      
      // Check if candidate exists
      const existing = await delegate.findUnique({ where: { email: input.email } })
      
      if (existing) {
        // Update existing candidate
        const updated = await delegate.update({
          where: { email: input.email },
          data: this.toPrismaUpdateInput(input)
        })
        return this.toDomainModel(updated)
      } else {
        // Create new candidate
        const created = await delegate.create({
          data: this.toPrismaCreateInput(input)
        })
        return this.toDomainModel(created)
      }
    })
  }

  /**
   * List candidates with advanced filtering and pagination
   */
  async listCandidates(params: ListCandidatesParams = {}) {
    const {
      q,
      sortBy = 'createdAt',
      order = 'desc',
      limit = 20,
      cursor,
      includeStrengths = false,
      includeSkills = false,
      includeSessions = false
    } = params

    return this.executeOperation('listCandidates', async () => {
      const delegate = this.getDelegate()
      
      // Build where clause
      const where: Prisma.CandidateWhereInput = q ? {
        OR: [
          { name: { contains: q } },
          { email: { contains: q } }
        ]
      } : {}

      // Build order by clause
      const orderBy: Prisma.CandidateOrderByWithRelationInput[] = 
        sortBy === 'finalScore' 
          ? [{ finalScore: order }, { createdAt: 'desc' }]
          : [{ [sortBy]: order }]

      // Build include clause
      const include: Prisma.CandidateInclude = {
        ...(includeSessions && {
          sessions: {
            orderBy: { createdAt: 'desc' },
            include: {
              answers: {
                orderBy: { questionIndex: 'asc' }
              }
            }
          }
        })
      }

      // Execute query
      const candidates = await delegate.findMany({
        where,
        orderBy,
        take: limit + 1,
        skip: cursor ? 1 : undefined,
        cursor: cursor ? { id: cursor } : undefined,
        include: Object.keys(include).length > 0 ? include : undefined
      })

      const hasMore = candidates.length > limit
      const items = candidates.slice(0, limit).map((candidate: any) => {
        const candidateDTO = this.toDomainModel(candidate)
        
        // Add computed status if sessions are included
        if (includeSessions && (candidate as any).sessions) {
          const sessions = (candidate as any).sessions
          let status = 'not_started'
          
          if (candidate.finalScore != null) {
            status = 'completed'
          } else if (sessions.length > 0) {
            const session = sessions[0] // newest first
            const answersCount = session.answers?.length || 0
            if (session.stage === 'completed') {
              status = 'completed'
            } else if (answersCount === 0) {
              status = 'not_started'
            } else {
              status = 'in_progress'
            }
          }
          
          return {
            ...candidateDTO,
            status,
            sessions: sessions.map((s: any) => ({
              id: s.id,
              answers: s.answers || [],
              createdAt: s.createdAt.toISOString()
            }))
          }
        }
        
        return candidateDTO
      })

      return {
        items,
        nextCursor: hasMore ? candidates[limit].id : null,
        hasMore,
        totalCount: -1 // Not calculated for performance
      }
    })
  }

  /**
   * Get candidate with sessions
   */
  async getCandidateWithSessions(id: string) {
    return this.executeOperation('getCandidateWithSessions', async () => {
      const delegate = this.getDelegate()
      
      const candidate = await delegate.findUnique({
        where: { id },
        include: {
          sessions: {
            include: {
              answers: true
            }
          }
        }
      })

      if (!candidate) {
        return null
      }

      const candidateData = this.toDomainModel(candidate)
      const { toSessionDTO } = require('../dto')
      const sessions = (candidate as any).sessions.map((session: any) => 
        toSessionDTO(session, true)
      )

      return {
        ...candidateData,
        sessions
      }
    })
  }

  /**
   * Update candidate with resume analysis
   */
  async updateWithResumeAnalysis(input: ResumeAnalysisInput): Promise<CandidateDTOType> {
    return this.executeOperation('updateWithResumeAnalysis', async () => {
      const delegate = this.getDelegate()
      
      const updated = await delegate.update({
        where: { id: input.id },
        data: {
          skillsJson: JSON.stringify(input.skills),
          experienceYears: input.experienceYears,
          seniorityLevel: input.seniorityLevel,
          qualityScore: input.qualityScore,
          aiSummary: input.aiSummary,
          aiStrengthsJson: JSON.stringify(input.aiStrengths)
        }
      })

      return this.toDomainModel(updated)
    })
  }

  /**
   * Finalize candidate with final score and summary
   */
  async finalize(input: FinalizeCandidateInput): Promise<CandidateDTOType> {
    return this.executeOperation('finalize', async () => {
      const delegate = this.getDelegate()
      
      const updated = await delegate.update({
        where: { id: input.id },
        data: {
          finalScore: input.finalScore,
          summary: input.summary,
          strengthsJson: JSON.stringify(input.strengths),
          gap: input.gap
        }
      })

      return this.toDomainModel(updated)
    })
  }

  /**
   * Find candidates by email
   */
  async findByEmail(email: string): Promise<CandidateDTOType | null> {
    return this.findUnique({ email })
  }

  /**
   * Search candidates by name or email
   */
  async search(query: string, limit: number = 10): Promise<CandidateDTOType[]> {
    return this.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get candidates by score range
   */
  async findByScoreRange(minScore: number, maxScore: number): Promise<CandidateDTOType[]> {
    return this.findMany({
      where: {
        finalScore: {
          gte: minScore,
          lte: maxScore
        }
      },
      orderBy: { finalScore: 'desc' }
    })
  }

  /**
   * Get top candidates by score
   */
  async getTopCandidates(limit: number = 10): Promise<CandidateDTOType[]> {
    return this.findMany({
      where: {
        NOT: { finalScore: null }
      },
      orderBy: { finalScore: 'desc' },
      take: limit
    })
  }

  /**
   * Get candidates created in date range
   */
  async findByDateRange(startDate: Date, endDate: Date): Promise<CandidateDTOType[]> {
    return this.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  }
}