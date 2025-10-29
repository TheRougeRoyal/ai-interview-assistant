/**
 * Enhanced sessions repository using the base repository pattern
 */

import { InterviewSession, Answer, Prisma, PrismaClient } from '@prisma/client'
import { AbstractBaseRepository, type PrismaTransaction } from './base'
import { Repository, RepositoryNames } from './factory'
import { toSessionDTO, toAnswerDTO, type SessionDTOType, type AnswerDTOType } from '../dto'

/**
 * Session create input interface
 */
export interface CreateSessionInput {
  candidateId: string
  stage: string
  plan: Array<{
    index: number
    difficulty: string
    targetDurationMs: number
  }>
}

/**
 * Session update input interface
 */
export interface UpdateSessionInput {
  stage?: string
  currentIndex?: number
  planJson?: string
}

/**
 * Session where input interface
 */
export interface SessionWhereInput extends Prisma.InterviewSessionWhereInput {}

/**
 * Answer create/update input interface
 */
export interface UpsertAnswerInput {
  sessionId: string
  questionIndex: number
  difficulty: string
  question: string
  answerText?: string
  durationMs: number
  timeTakenMs?: number
  rubric?: any
  submittedAt?: string
}

/**
 * Enhanced sessions repository
 */
@Repository(RepositoryNames.SESSIONS)
export class SessionsRepository extends AbstractBaseRepository<
  SessionDTOType,
  CreateSessionInput,
  UpdateSessionInput,
  SessionWhereInput
> {
  constructor() {
    super('InterviewSession', {
      enableLogging: true,
      enablePerformanceTracking: true
    })
  }

  /**
   * Get Prisma delegate
   */
  protected getDelegate(client?: PrismaClient | PrismaTransaction) {
    return (client || this.prisma).interviewSession
  }

  /**
   * Get Prisma client
   */
  private get prisma() {
    const { prisma } = require('../client')
    return prisma
  }

  /**
   * Transform database record to domain model
   */
  protected toDomainModel(record: InterviewSession & { answers?: Answer[] }): SessionDTOType {
    return toSessionDTO(record, !!record.answers)
  }

  /**
   * Transform create input to Prisma create input
   */
  protected toPrismaCreateInput(input: CreateSessionInput): Prisma.InterviewSessionCreateInput {
    return {
      stage: input.stage,
      currentIndex: 0,
      planJson: JSON.stringify(input.plan),
      Candidate: {
        connect: { id: input.candidateId }
      }
    }
  }

  /**
   * Transform update input to Prisma update input
   */
  protected toPrismaUpdateInput(input: UpdateSessionInput): Prisma.InterviewSessionUpdateInput {
    return {
      ...(input.stage !== undefined && { stage: input.stage }),
      ...(input.currentIndex !== undefined && { currentIndex: input.currentIndex }),
      ...(input.planJson !== undefined && { planJson: input.planJson })
    }
  }

  /**
   * Create session with plan
   */
  async createSession(input: CreateSessionInput): Promise<SessionDTOType> {
    return this.create(input)
  }

  /**
   * Get session with answers
   */
  async getSessionWithAnswers(id: string): Promise<SessionDTOType | null> {
    return this.executeOperation('getSessionWithAnswers', async () => {
      const delegate = this.getDelegate()
      
      const session = await delegate.findUnique({
        where: { id },
        include: { answers: true }
      })

      return session ? this.toDomainModel(session) : null
    })
  }

  /**
   * Update session progress
   */
  async updateProgress(id: string, stage?: string, currentIndex?: number): Promise<SessionDTOType> {
    return this.update(id, { stage, currentIndex })
  }

  /**
   * Get sessions by candidate ID
   */
  async getSessionsByCandidate(candidateId: string, includeAnswers: boolean = false): Promise<SessionDTOType[]> {
    return this.executeOperation('getSessionsByCandidate', async () => {
      const delegate = this.getDelegate()
      
      const sessions = await delegate.findMany({
        where: { candidateId },
        orderBy: { createdAt: 'desc' },
        include: includeAnswers ? { answers: true } : undefined
      })

      return sessions.map((session: any) => this.toDomainModel(session))
    })
  }

  /**
   * Get active sessions (not completed)
   */
  async getActiveSessions(): Promise<SessionDTOType[]> {
    return this.findMany({
      where: {
        NOT: { stage: 'completed' }
      },
      orderBy: { updatedAt: 'desc' }
    })
  }

  /**
   * Get sessions by stage
   */
  async getSessionsByStage(stage: string): Promise<SessionDTOType[]> {
    return this.findMany({
      where: { stage },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get sessions created in date range
   */
  async getSessionsByDateRange(startDate: Date, endDate: Date): Promise<SessionDTOType[]> {
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

  /**
   * Complete session
   */
  async completeSession(id: string): Promise<SessionDTOType> {
    return this.update(id, { stage: 'completed' })
  }

  /**
   * Upsert answer for a session
   */
  async upsertAnswer(input: UpsertAnswerInput): Promise<AnswerDTOType> {
    return this.executeOperation('upsertAnswer', async () => {
      const answerDelegate = this.prisma.answer
      
      const answer = await answerDelegate.upsert({
        where: {
          sessionId_questionIndex: {
            sessionId: input.sessionId,
            questionIndex: input.questionIndex
          }
        },
        create: {
          sessionId: input.sessionId,
          questionIndex: input.questionIndex,
          difficulty: input.difficulty,
          question: input.question,
          answerText: input.answerText,
          durationMs: input.durationMs,
          timeTakenMs: input.timeTakenMs,
          rubricJson: input.rubric ? JSON.stringify(input.rubric) : undefined,
          submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined
        },
        update: {
          difficulty: input.difficulty,
          question: input.question,
          answerText: input.answerText,
          durationMs: input.durationMs,
          timeTakenMs: input.timeTakenMs,
          rubricJson: input.rubric ? JSON.stringify(input.rubric) : undefined,
          submittedAt: input.submittedAt ? new Date(input.submittedAt) : undefined
        }
      })

      return toAnswerDTO(answer)
    })
  }

  /**
   * Get answers for a session
   */
  async getAnswersBySession(sessionId: string): Promise<AnswerDTOType[]> {
    return this.executeOperation('getAnswersBySession', async () => {
      const answerDelegate = this.prisma.answer
      
      const answers = await answerDelegate.findMany({
        where: { sessionId },
        orderBy: { questionIndex: 'asc' }
      })

      return answers.map((answer: any) => toAnswerDTO(answer))
    })
  }

  /**
   * Get answer by session and question index
   */
  async getAnswer(sessionId: string, questionIndex: number): Promise<AnswerDTOType | null> {
    return this.executeOperation('getAnswer', async () => {
      const answerDelegate = this.prisma.answer
      
      const answer = await answerDelegate.findUnique({
        where: {
          sessionId_questionIndex: {
            sessionId,
            questionIndex
          }
        }
      })

      return answer ? toAnswerDTO(answer) : null
    })
  }

  /**
   * Delete answer
   */
  async deleteAnswer(sessionId: string, questionIndex: number): Promise<void> {
    return this.executeOperation('deleteAnswer', async () => {
      const answerDelegate = this.prisma.answer
      
      await answerDelegate.delete({
        where: {
          sessionId_questionIndex: {
            sessionId,
            questionIndex
          }
        }
      })
    })
  }

  /**
   * Get session statistics
   */
  async getSessionStats(sessionId: string): Promise<{
    totalQuestions: number
    answeredQuestions: number
    averageTimePerQuestion: number
    totalTimeSpent: number
    completionPercentage: number
  }> {
    return this.executeOperation('getSessionStats', async () => {
      const session = await this.getSessionWithAnswers(sessionId)
      
      if (!session) {
        throw new Error('Session not found')
      }

      const answers = session.answers || []
      const plan = session.plan || []
      
      const totalQuestions = plan.length
      const answeredQuestions = answers.length
      const totalTimeSpent = answers.reduce((sum, answer) => sum + (answer.timeTakenMs || 0), 0)
      const averageTimePerQuestion = answeredQuestions > 0 ? totalTimeSpent / answeredQuestions : 0
      const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

      return {
        totalQuestions,
        answeredQuestions,
        averageTimePerQuestion,
        totalTimeSpent,
        completionPercentage
      }
    })
  }

  /**
   * Get sessions with completion status
   */
  async getSessionsWithStatus(): Promise<Array<SessionDTOType & { 
    completionPercentage: number
    answeredQuestions: number
    totalQuestions: number
  }>> {
    return this.executeOperation('getSessionsWithStatus', async () => {
      const sessions = await this.findMany({
        include: { answers: true }
      })

      return sessions.map(session => {
        const answers = (session as any).answers || []
        const plan = session.plan || []
        
        const totalQuestions = plan.length
        const answeredQuestions = answers.length
        const completionPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

        return {
          ...session,
          completionPercentage,
          answeredQuestions,
          totalQuestions
        }
      })
    })
  }
}