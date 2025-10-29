/**
 * Tests for the enhanced candidates repository
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { CandidatesRepository } from '../candidatesRepo.enhanced'
import { MemoryTransport } from '@/lib/logging'

// Mock the Prisma client
vi.mock('../client', () => ({
  prisma: {
    candidate: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn()
    }
  }
}))

// Mock the DTO functions
vi.mock('../../dto', () => ({
  toCandidateDTO: vi.fn((record) => ({
    id: record.id,
    name: record.name,
    email: record.email,
    phone: record.phone,
    resumeText: record.resumeText,
    finalScore: record.finalScore,
    summary: record.summary,
    strengths: record.strengthsJson ? JSON.parse(record.strengthsJson) : null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  })),
  toSessionDTO: vi.fn()
}))

describe('CandidatesRepository', () => {
  let repository: CandidatesRepository
  let memoryTransport: MemoryTransport
  let mockPrisma: any

  beforeEach(() => {
    repository = new CandidatesRepository()
    memoryTransport = new MemoryTransport()
    
    // Get the mocked prisma client
    mockPrisma = require('../client').prisma
    
    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    memoryTransport.clear()
  })

  describe('Create Operations', () => {
    it('should create a new candidate', async () => {
      const mockCandidate = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        resumeText: 'Sample resume text',
        strengthsJson: '[]',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.candidate.create.mockResolvedValue(mockCandidate)

      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        resumeText: 'Sample resume text'
      }

      const result = await repository.create(input)

      expect(mockPrisma.candidate.create).toHaveBeenCalledWith({
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          resumeText: 'Sample resume text',
          strengthsJson: '[]'
        }
      })

      expect(result.name).toBe('John Doe')
      expect(result.email).toBe('john@example.com')
    })

    it('should create or upsert candidate', async () => {
      const existingCandidate = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        strengthsJson: '[]',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const updatedCandidate = {
        ...existingCandidate,
        name: 'John Updated'
      }

      mockPrisma.candidate.findUnique.mockResolvedValue(existingCandidate)
      mockPrisma.candidate.update.mockResolvedValue(updatedCandidate)

      const input = {
        name: 'John Updated',
        email: 'john@example.com',
        phone: '+1234567890'
      }

      const result = await repository.createOrUpsert(input)

      expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })

      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
        data: {
          name: 'John Updated',
          phone: '+1234567890'
        }
      })

      expect(result.name).toBe('John Updated')
    })

    it('should create new candidate when upsert finds no existing record', async () => {
      const newCandidate = {
        id: '1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        strengthsJson: '[]',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.candidate.findUnique.mockResolvedValue(null)
      mockPrisma.candidate.create.mockResolvedValue(newCandidate)

      const input = {
        name: 'Jane Doe',
        email: 'jane@example.com'
      }

      const result = await repository.createOrUpsert(input)

      expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
        where: { email: 'jane@example.com' }
      })

      expect(mockPrisma.candidate.create).toHaveBeenCalledWith({
        data: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          strengthsJson: '[]'
        }
      })

      expect(result.name).toBe('Jane Doe')
    })
  })

  describe('List Operations', () => {
    it('should list candidates with default parameters', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.listCandidates()

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }],
        take: 21, // limit + 1
        skip: undefined,
        cursor: undefined,
        include: undefined
      })

      expect(result.items).toHaveLength(2)
      expect(result.hasMore).toBe(false)
      expect(result.nextCursor).toBeNull()
    })

    it('should list candidates with search query', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.listCandidates({
        q: 'John',
        sortBy: 'name',
        order: 'asc',
        limit: 10
      })

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'John' } },
            { email: { contains: 'John' } }
          ]
        },
        orderBy: [{ name: 'asc' }],
        take: 11,
        skip: undefined,
        cursor: undefined,
        include: undefined
      })

      expect(result.items).toHaveLength(1)
      expect(result.items[0].name).toBe('John Doe')
    })

    it('should list candidates with sessions included', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          finalScore: null,
          strengthsJson: '[]',
          sessions: [
            {
              id: 'session-1',
              stage: 'interviewing',
              answers: [{ id: 'answer-1' }],
              createdAt: new Date()
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.listCandidates({
        includeSessions: true
      })

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ createdAt: 'desc' }],
        take: 21,
        skip: undefined,
        cursor: undefined,
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

      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toHaveProperty('status', 'in_progress')
      expect(result.items[0]).toHaveProperty('sessions')
    })
  })

  describe('Search Operations', () => {
    it('should search candidates by name or email', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.search('john', 5)

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'john' } },
            { email: { contains: 'john' } }
          ]
        },
        take: 5,
        orderBy: { createdAt: 'desc' }
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
    })

    it('should find candidate by email', async () => {
      const mockCandidate = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        strengthsJson: '[]',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.candidate.findUnique.mockResolvedValue(mockCandidate)

      const result = await repository.findByEmail('john@example.com')

      expect(mockPrisma.candidate.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' }
      })

      expect(result?.email).toBe('john@example.com')
    })
  })

  describe('Update Operations', () => {
    it('should update candidate with resume analysis', async () => {
      const mockCandidate = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        skillsJson: '{"technical":["JavaScript","TypeScript"]}',
        experienceYears: 5,
        seniorityLevel: 'mid',
        qualityScore: 85,
        aiSummary: 'Experienced developer',
        aiStrengthsJson: '["Problem solving","Communication"]',
        strengthsJson: '[]',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.candidate.update.mockResolvedValue(mockCandidate)

      const input = {
        id: '1',
        skills: {
          technical: ['JavaScript', 'TypeScript']
        },
        experienceYears: 5,
        seniorityLevel: 'mid' as const,
        qualityScore: 85,
        aiSummary: 'Experienced developer',
        aiStrengths: ['Problem solving', 'Communication']
      }

      const result = await repository.updateWithResumeAnalysis(input)

      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          skillsJson: JSON.stringify(input.skills),
          experienceYears: 5,
          seniorityLevel: 'mid',
          qualityScore: 85,
          aiSummary: 'Experienced developer',
          aiStrengthsJson: JSON.stringify(input.aiStrengths)
        }
      })

      expect(result.id).toBe('1')
    })

    it('should finalize candidate with score and summary', async () => {
      const mockCandidate = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        finalScore: 90,
        summary: 'Excellent candidate',
        strengthsJson: '["Technical skills","Communication"]',
        gap: 'Needs more experience with cloud platforms',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockPrisma.candidate.update.mockResolvedValue(mockCandidate)

      const input = {
        id: '1',
        finalScore: 90,
        summary: 'Excellent candidate',
        strengths: ['Technical skills', 'Communication'],
        gap: 'Needs more experience with cloud platforms'
      }

      const result = await repository.finalize(input)

      expect(mockPrisma.candidate.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          finalScore: 90,
          summary: 'Excellent candidate',
          strengthsJson: JSON.stringify(input.strengths),
          gap: 'Needs more experience with cloud platforms'
        }
      })

      expect(result.id).toBe('1')
    })
  })

  describe('Advanced Queries', () => {
    it('should find candidates by score range', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          finalScore: 85,
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.findByScoreRange(80, 90)

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {
          finalScore: {
            gte: 80,
            lte: 90
          }
        },
        orderBy: { finalScore: 'desc' }
      })

      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('John Doe')
    })

    it('should get top candidates by score', async () => {
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          finalScore: 95,
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: '2',
          name: 'Jane Doe',
          email: 'jane@example.com',
          finalScore: 90,
          strengthsJson: '[]',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.getTopCandidates(5)

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {
          NOT: { finalScore: null }
        },
        orderBy: { finalScore: 'desc' },
        take: 5
      })

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('John Doe')
    })

    it('should find candidates by date range', async () => {
      const startDate = new Date('2023-01-01')
      const endDate = new Date('2023-12-31')
      
      const mockCandidates = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          strengthsJson: '[]',
          createdAt: new Date('2023-06-15'),
          updatedAt: new Date()
        }
      ]

      mockPrisma.candidate.findMany.mockResolvedValue(mockCandidates)

      const result = await repository.findByDateRange(startDate, endDate)

      expect(mockPrisma.candidate.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      expect(result).toHaveLength(1)
    })
  })
})