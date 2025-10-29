/**
 * Enhanced authentication repository using the base repository pattern
 */

import { User, UserSession, Prisma, PrismaClient } from '@prisma/client'
import { AbstractBaseRepository, type PrismaTransaction } from './base'
import { Repository, RepositoryNames } from './factory'
import bcrypt from 'bcryptjs'

/**
 * User DTO interface
 */
export interface UserDTO {
  id: string
  email: string
  name?: string
  phone?: string
  role: string
  createdAt: string
  updatedAt: string
}

/**
 * User session DTO interface
 */
export interface UserSessionDTO {
  id: string
  userId: string
  token: string
  expiresAt: string
  createdAt: string
  updatedAt: string
}

/**
 * User create input interface
 */
export interface CreateUserInput {
  email: string
  password: string
  name?: string
  phone?: string
  role: string
}

/**
 * User update input interface
 */
export interface UpdateUserInput {
  email?: string
  name?: string
  phone?: string
  role?: string
  password?: string
}

/**
 * User where input interface
 */
export interface UserWhereInput extends Prisma.UserWhereInput {}

/**
 * Session create input interface
 */
export interface CreateSessionInput {
  userId: string
  token: string
  expiresAt: Date
}

/**
 * Login credentials interface
 */
export interface LoginCredentials {
  email: string
  password: string
}

/**
 * Enhanced authentication repository
 */
@Repository(RepositoryNames.USERS)
export class AuthRepository extends AbstractBaseRepository<
  UserDTO,
  CreateUserInput,
  UpdateUserInput,
  UserWhereInput
> {
  constructor() {
    super('User', {
      enableLogging: true,
      enablePerformanceTracking: true
    })
  }

  /**
   * Get Prisma delegate
   */
  protected getDelegate(client?: PrismaClient | PrismaTransaction) {
    return (client || this.prisma).user
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
  protected toDomainModel(record: User): UserDTO {
    return {
      id: record.id,
      email: record.email,
      name: record.name || undefined,
      phone: record.phone || undefined,
      role: record.role,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString()
    }
  }

  /**
   * Transform create input to Prisma create input
   */
  protected toPrismaCreateInput(input: CreateUserInput): Prisma.UserCreateInput {
    return {
      email: input.email,
      password: input.password, // Will be hashed before calling this
      name: input.name,
      phone: input.phone,
      role: input.role
    }
  }

  /**
   * Transform update input to Prisma update input
   */
  protected toPrismaUpdateInput(input: UpdateUserInput): Prisma.UserUpdateInput {
    return {
      ...(input.email !== undefined && { email: input.email }),
      ...(input.name !== undefined && { name: input.name }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.role !== undefined && { role: input.role }),
      ...(input.password !== undefined && { password: input.password }) // Will be hashed before calling this
    }
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12)
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword)
  }

  /**
   * Create user with hashed password
   */
  async createUser(input: CreateUserInput): Promise<UserDTO> {
    return this.executeOperation('createUser', async () => {
      const hashedPassword = await this.hashPassword(input.password)
      const delegate = this.getDelegate()
      
      const user = await delegate.create({
        data: {
          ...input,
          password: hashedPassword
        }
      })

      return this.toDomainModel(user)
    })
  }

  /**
   * Update user with optional password hashing
   */
  async updateUser(id: string, input: UpdateUserInput): Promise<UserDTO> {
    return this.executeOperation('updateUser', async () => {
      const updateData = { ...input }
      
      if (input.password) {
        updateData.password = await this.hashPassword(input.password)
      }

      const delegate = this.getDelegate()
      const user = await delegate.update({
        where: { id },
        data: updateData
      })

      return this.toDomainModel(user)
    })
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<UserDTO | null> {
    return this.findUnique({ email })
  }

  /**
   * Authenticate user with email and password
   */
  async authenticate(credentials: LoginCredentials): Promise<UserDTO | null> {
    return this.executeOperation('authenticate', async () => {
      const delegate = this.getDelegate()
      
      const user = await delegate.findUnique({
        where: { email: credentials.email }
      })

      if (!user) {
        return null
      }

      const isValidPassword = await this.verifyPassword(credentials.password, user.password)
      
      if (!isValidPassword) {
        return null
      }

      return this.toDomainModel(user)
    })
  }

  /**
   * Create user session
   */
  async createSession(input: CreateSessionInput): Promise<UserSessionDTO> {
    return this.executeOperation('createSession', async () => {
      const sessionDelegate = this.prisma.userSession
      
      const session = await sessionDelegate.create({
        data: {
          userId: input.userId,
          token: input.token,
          expiresAt: input.expiresAt
        }
      })

      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      }
    })
  }

  /**
   * Find session by token
   */
  async findSessionByToken(token: string): Promise<UserSessionDTO | null> {
    return this.executeOperation('findSessionByToken', async () => {
      const sessionDelegate = this.prisma.userSession
      
      const session = await sessionDelegate.findUnique({
        where: { token }
      })

      if (!session) {
        return null
      }

      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      }
    })
  }

  /**
   * Find valid session by token (not expired)
   */
  async findValidSessionByToken(token: string): Promise<UserSessionDTO | null> {
    return this.executeOperation('findValidSessionByToken', async () => {
      const sessionDelegate = this.prisma.userSession
      
      const session = await sessionDelegate.findFirst({
        where: {
          token,
          expiresAt: { gt: new Date() }
        }
      })

      if (!session) {
        return null
      }

      return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      }
    })
  }

  /**
   * Delete session by token
   */
  async deleteSession(token: string): Promise<void> {
    return this.executeOperation('deleteSession', async () => {
      const sessionDelegate = this.prisma.userSession
      
      await sessionDelegate.deleteMany({
        where: { token }
      })
    })
  }

  /**
   * Delete all sessions for user
   */
  async deleteUserSessions(userId: string): Promise<void> {
    return this.executeOperation('deleteUserSessions', async () => {
      const sessionDelegate = this.prisma.userSession
      
      await sessionDelegate.deleteMany({
        where: { userId }
      })
    })
  }

  /**
   * Delete expired sessions
   */
  async deleteExpiredSessions(): Promise<number> {
    return this.executeOperation('deleteExpiredSessions', async () => {
      const sessionDelegate = this.prisma.userSession
      
      const result = await sessionDelegate.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      })

      return result.count
    })
  }

  /**
   * Get user with sessions
   */
  async getUserWithSessions(id: string): Promise<(UserDTO & { sessions: UserSessionDTO[] }) | null> {
    return this.executeOperation('getUserWithSessions', async () => {
      const delegate = this.getDelegate()
      
      const user = await delegate.findUnique({
        where: { id },
        include: { sessions: true }
      })

      if (!user) {
        return null
      }

      const sessions = (user as any).sessions.map((session: UserSession) => ({
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString()
      }))

      return {
        ...this.toDomainModel(user),
        sessions
      }
    })
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: string): Promise<UserDTO[]> {
    return this.findMany({
      where: { role },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get active users (with valid sessions)
   */
  async getActiveUsers(): Promise<UserDTO[]> {
    return this.executeOperation('getActiveUsers', async () => {
      const delegate = this.getDelegate()
      
      const users = await delegate.findMany({
        where: {
          sessions: {
            some: {
              expiresAt: { gt: new Date() }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      return users.map((user: any) => this.toDomainModel(user))
    })
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    return this.executeOperation('changePassword', async () => {
      const delegate = this.getDelegate()
      
      // Get user with password
      const user = await delegate.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return false
      }

      // Verify old password
      const isValidOldPassword = await this.verifyPassword(oldPassword, user.password)
      
      if (!isValidOldPassword) {
        return false
      }

      // Hash new password and update
      const hashedNewPassword = await this.hashPassword(newPassword)
      
      await delegate.update({
        where: { id: userId },
        data: { password: hashedNewPassword }
      })

      return true
    })
  }

  /**
   * Reset user password (admin function)
   */
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    return this.executeOperation('resetPassword', async () => {
      const hashedPassword = await this.hashPassword(newPassword)
      
      await this.update(userId, { password: hashedPassword })
      
      // Invalidate all existing sessions
      await this.deleteUserSessions(userId)
    })
  }
}