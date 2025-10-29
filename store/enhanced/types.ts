/**
 * Enhanced Redux state types with normalization and error handling
 */

import type { ApiError } from '@/lib/errors'

/**
 * Base entity interface
 */
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

/**
 * Normalized entities structure
 */
export interface NormalizedEntities {
  candidates: Record<string, CandidateEntity>
  sessions: Record<string, SessionEntity>
  answers: Record<string, AnswerEntity>
  users: Record<string, UserEntity>
  scores: Record<string, ScoreEntity>
}

/**
 * Entity collections (ordered lists of IDs)
 */
export interface EntityCollections {
  candidateIds: string[]
  sessionIds: string[]
  answerIds: string[]
  userIds: string[]
  scoreIds: string[]
}

/**
 * Loading states for different operations
 */
export interface LoadingStates {
  candidates: {
    list: boolean
    create: boolean
    update: boolean
    delete: boolean
    search: boolean
  }
  sessions: {
    list: boolean
    create: boolean
    update: boolean
    delete: boolean
  }
  answers: {
    create: boolean
    update: boolean
    delete: boolean
  }
  auth: {
    login: boolean
    register: boolean
    logout: boolean
    refresh: boolean
  }
}

/**
 * Error states for different operations
 */
export interface ErrorStates {
  candidates: {
    list: ApiError | null
    create: ApiError | null
    update: ApiError | null
    delete: ApiError | null
    search: ApiError | null
  }
  sessions: {
    list: ApiError | null
    create: ApiError | null
    update: ApiError | null
    delete: ApiError | null
  }
  answers: {
    create: ApiError | null
    update: ApiError | null
    delete: ApiError | null
  }
  auth: {
    login: ApiError | null
    register: ApiError | null
    logout: ApiError | null
    refresh: ApiError | null
  }
  global: ApiError | null
}

/**
 * Optimistic update tracking
 */
export interface OptimisticUpdate {
  id: string
  type: 'create' | 'update' | 'delete'
  entityType: keyof NormalizedEntities
  entityId: string
  timestamp: number
  originalData?: any
  optimisticData?: any
}

/**
 * Cache metadata
 */
export interface CacheMetadata {
  lastFetched: number
  isStale: boolean
  ttl: number // Time to live in milliseconds
}

/**
 * UI state for selections and interactions
 */
export interface UISelections {
  selectedCandidateIds: string[]
  selectedSessionIds: string[]
  selectedAnswerIds: string[]
  currentCandidateId: string | null
  currentSessionId: string | null
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number
  limit: number
  total: number
  hasMore: boolean
  cursor?: string
}

/**
 * Filter and search state
 */
export interface FilterState {
  candidates: {
    search: string
    sortBy: 'name' | 'email' | 'finalScore' | 'createdAt'
    sortOrder: 'asc' | 'desc'
    filters: {
      scoreRange?: { min: number; max: number }
      dateRange?: { start: string; end: string }
      status?: 'completed' | 'in_progress' | 'not_started'
    }
  }
  sessions: {
    search: string
    sortBy: 'createdAt' | 'updatedAt' | 'stage'
    sortOrder: 'asc' | 'desc'
    filters: {
      stage?: string
      candidateId?: string
      dateRange?: { start: string; end: string }
    }
  }
}

/**
 * Enhanced root state structure
 */
export interface EnhancedRootState {
  // Normalized entities
  entities: NormalizedEntities

  // Entity collections (ordered IDs)
  collections: EntityCollections

  // Loading states
  loading: LoadingStates

  // Error states
  errors: ErrorStates

  // UI state
  ui: {
    selections: UISelections
    pagination: Record<string, PaginationState>
    filters: FilterState
    theme: 'light' | 'dark' | 'system'
    modals: Record<string, boolean>
    toasts: Array<{
      id: string
      type: 'success' | 'error' | 'warning' | 'info'
      message: string
      timestamp: number
    }>
  }

  // Cache metadata
  cache: Record<string, CacheMetadata>

  // Optimistic updates
  optimistic: OptimisticUpdate[]

  // Legacy state (for backward compatibility)
  legacy: {
    auth: any
    session: any
    resume: any
  }
}

/**
 * Entity definitions
 */
export interface CandidateEntity extends BaseEntity {
  name: string
  email: string
  phone?: string
  resumeFile?: string
  resumeMime?: string
  resumeSize?: number
  resumeText?: string
  finalScore?: number
  summary?: string
  strengths?: string[]
  gap?: string
  skills?: {
    technical?: string[]
    soft?: string[]
    languages?: string[]
    frameworks?: string[]
    tools?: string[]
    certifications?: string[]
    domains?: string[]
  }
  experienceYears?: number
  seniorityLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive'
  qualityScore?: number
  aiSummary?: string
  aiStrengths?: string[]
  sessionIds: string[]
}

export interface SessionEntity extends BaseEntity {
  candidateId: string
  stage: string
  currentIndex: number
  plan: Array<{
    index: number
    difficulty: string
    targetDurationMs: number
  }>
  answerIds: string[]
}

export interface AnswerEntity extends BaseEntity {
  sessionId: string
  questionIndex: number
  difficulty: string
  question: string
  answerText?: string
  durationMs: number
  timeTakenMs?: number
  rubric?: {
    accuracy: number
    completeness: number
    relevance: number
    timeliness: number
    total: number
    rationale: string
  }
  submittedAt?: string
  scoreIds: string[]
}

export interface UserEntity extends BaseEntity {
  email: string
  name?: string
  phone?: string
  role: string
  sessionIds: string[]
}

export interface ScoreEntity extends BaseEntity {
  answerId: string
  reviewerId: string
  score: number
  feedback?: string
}

/**
 * Action payload types
 */
export interface EntityActionPayload<T = any> {
  entity: T
  correlationId?: string
  optimistic?: boolean
}

export interface CollectionActionPayload {
  entityType: keyof NormalizedEntities
  ids: string[]
  append?: boolean
  correlationId?: string
}

export interface OptimisticActionPayload {
  id: string
  type: 'create' | 'update' | 'delete'
  entityType: keyof NormalizedEntities
  entityId: string
  optimisticData?: any
  originalData?: any
}

/**
 * Selector types
 */
export type EntitySelector<T> = (state: EnhancedRootState) => T | undefined
export type CollectionSelector<T> = (state: EnhancedRootState) => T[]
export type LoadingSelector = (state: EnhancedRootState) => boolean
export type ErrorSelector = (state: EnhancedRootState) => ApiError | null