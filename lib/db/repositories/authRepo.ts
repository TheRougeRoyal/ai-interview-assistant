import { prisma } from '@/lib/db/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export type UserRole = 'interviewer' | 'interviewee'

export interface CreateUserInput {
  email: string
  password: string
  role: UserRole
  name?: string
  phone?: string
}

export interface UserSession {
  id: string
  userId: string
  token: string
  expiresAt: Date
}

export async function createUser(input: CreateUserInput) {
  // Hash password
  const hashedPassword = await bcrypt.hash(input.password, 12)
  
  return await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      role: input.role,
      name: input.name,
      phone: input.phone,
    },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export async function getUserByEmail(email: string) {
  return await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export async function getUserById(id: string) {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
    }
  })
}

export async function createUserSession(userId: string): Promise<UserSession> {
  // Generate secure random token
  const token = crypto.randomBytes(32).toString('hex')
  
  // Set expiration to 7 days from now
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)
  
  return await prisma.userSession.create({
    data: {
      userId,
      token,
      expiresAt,
    }
  })
}

export async function getUserBySessionToken(token: string) {
  const session = await prisma.userSession.findUnique({
    where: { token },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
          phone: true,
          createdAt: true,
          updatedAt: true,
        }
      }
    }
  })
  
  if (!session || session.expiresAt < new Date()) {
    return null
  }
  
  return session.user
}

export async function deleteUserSession(token: string) {
  return await prisma.userSession.delete({
    where: { token }
  })
}

export async function deleteExpiredSessions() {
  return await prisma.userSession.deleteMany({
    where: {
      expiresAt: {
        lt: new Date()
      }
    }
  })
}