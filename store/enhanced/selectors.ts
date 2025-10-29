/**
 * Enhanced selectors with memoization and denormalization
 */

import { createSelector } from '@reduxjs/toolkit'
import type {
  EnhancedRootState,
  CandidateEntity,
  SessionEntity,
  AnswerEntity,
  UserEntity,
  ScoreEntity,
  EntitySelector,
  CollectionSelector,
  LoadingSelector,
  ErrorSelector
} from './types'

// Type guard for enhanced root state
const isEnhancedRootState = (state: any): state is EnhancedRootState => {
  return state && 
         typeof state === 'object' && 
         'entities' in state && 
         'collections' in state &&
         'loading' in state &&
         'errors' in state &&
         'ui' in state
}

/**
 * Base selectors for entities and collections
 */
export const selectEntities = (state: any) => {
  if (!isEnhancedRootState(state)) return { candidates: {}, sessions: {}, answers: {}, users: {}, scores: {} }
  return state.entities
}

export const selectCollections = (state: any) => {
  if (!isEnhancedRootState(state)) return { candidateIds: [], sessionIds: [], answerIds: [], userIds: [], scoreIds: [] }
  return state.collections
}

export const selectLoading = (state: any) => {
  if (!isEnhancedRootState(state)) return {
    candidates: { list: false, create: false, update: false, delete: false, search: false },
    sessions: { list: false, create: false, update: false, delete: false },
    answers: { create: false, update: false, delete: false },
    auth: { login: false, register: false, logout: false, refresh: false }
  }
  return state.loading
}

export const selectErrors = (state: any) => {
  if (!isEnhancedRootState(state)) return {
    candidates: { list: null, create: null, update: null, delete: null, search: null },
    sessions: { list: null, create: null, update: null, delete: null },
    answers: { create: null, update: null, delete: null },
    auth: { login: null, register: null, logout: null, refresh: null },
    global: null
  }
  return state.errors
}

export const selectUI = (state: any) => {
  if (!isEnhancedRootState(state)) return {
    selections: { selectedCandidateIds: [], selectedSessionIds: [], selectedAnswerIds: [], currentCandidateId: null, currentSessionId: null },
    pagination: {},
    filters: {
      candidates: { search: '', sortBy: 'createdAt' as const, sortOrder: 'desc' as const, filters: {} },
      sessions: { search: '', sortBy: 'createdAt' as const, sortOrder: 'desc' as const, filters: {} }
    },
    theme: 'system' as const,
    modals: {},
    toasts: []
  }
  return state.ui
}

export const selectCache = (state: any) => {
  if (!isEnhancedRootState(state)) return {}
  return state.cache
}

export const selectOptimistic = (state: any) => {
  if (!isEnhancedRootState(state)) return []
  return state.optimistic
}

/**
 * Entity selectors
 */
export const selectCandidates = createSelector(
  [selectEntities],
  (entities) => entities.candidates
)

export const selectSessions = createSelector(
  [selectEntities],
  (entities) => entities.sessions
)

export const selectAnswers = createSelector(
  [selectEntities],
  (entities) => entities.answers
)

export const selectUsers = createSelector(
  [selectEntities],
  (entities) => entities.users
)

export const selectScores = createSelector(
  [selectEntities],
  (entities) => entities.scores
)

/**
 * Individual entity selectors
 */
export const selectCandidateById = (id: string): EntitySelector<CandidateEntity> =>
  createSelector(
    [selectCandidates],
    (candidates) => candidates[id]
  )

export const selectSessionById = (id: string): EntitySelector<SessionEntity> =>
  createSelector(
    [selectSessions],
    (sessions) => sessions[id]
  )

export const selectAnswerById = (id: string): EntitySelector<AnswerEntity> =>
  createSelector(
    [selectAnswers],
    (answers) => answers[id]
  )

export const selectUserById = (id: string): EntitySelector<UserEntity> =>
  createSelector(
    [selectUsers],
    (users) => users[id]
  )

export const selectScoreById = (id: string): EntitySelector<ScoreEntity> =>
  createSelector(
    [selectScores],
    (scores) => scores[id]
  )

/**
 * Collection selectors with denormalization
 */
export const selectCandidateList: CollectionSelector<CandidateEntity> = createSelector(
  [selectCandidates, selectCollections],
  (candidates, collections) =>
    collections.candidateIds
      .map(id => candidates[id])
      .filter(Boolean)
)

export const selectSessionList: CollectionSelector<SessionEntity> = createSelector(
  [selectSessions, selectCollections],
  (sessions, collections) =>
    collections.sessionIds
      .map(id => sessions[id])
      .filter(Boolean)
)

export const selectAnswerList: CollectionSelector<AnswerEntity> = createSelector(
  [selectAnswers, selectCollections],
  (answers, collections) =>
    collections.answerIds
      .map(id => answers[id])
      .filter(Boolean)
)

export const selectUserList: CollectionSelector<UserEntity> = createSelector(
  [selectUsers, selectCollections],
  (users, collections) =>
    collections.userIds
      .map(id => users[id])
      .filter(Boolean)
)

export const selectScoreList: CollectionSelector<ScoreEntity> = createSelector(
  [selectScores, selectCollections],
  (scores, collections) =>
    collections.scoreIds
      .map(id => scores[id])
      .filter(Boolean)
)

/**
 * Denormalized selectors with relationships
 */
export const selectCandidateWithSessions = (candidateId: string) =>
  createSelector(
    [selectCandidateById(candidateId), selectSessions],
    (candidate, sessions) => {
      if (!candidate) return null
      
      const candidateSessions = candidate.sessionIds
        .map(id => sessions[id])
        .filter(Boolean)
      
      return {
        ...candidate,
        sessions: candidateSessions
      }
    }
  )

export const selectSessionWithAnswers = (sessionId: string) =>
  createSelector(
    [selectSessionById(sessionId), selectAnswers],
    (session, answers) => {
      if (!session) return null
      
      const sessionAnswers = session.answerIds
        .map(id => answers[id])
        .filter(Boolean)
        .sort((a, b) => a.questionIndex - b.questionIndex)
      
      return {
        ...session,
        answers: sessionAnswers
      }
    }
  )

export const selectAnswerWithScores = (answerId: string) =>
  createSelector(
    [selectAnswerById(answerId), selectScores],
    (answer, scores) => {
      if (!answer) return null
      
      const answerScores = answer.scoreIds
        .map(id => scores[id])
        .filter(Boolean)
      
      return {
        ...answer,
        scores: answerScores
      }
    }
  )

/**
 * Filtered and sorted selectors
 */
export const selectFilteredCandidates = createSelector(
  [selectCandidateList, selectUI],
  (candidates, ui) => {
    const { filters, search, sortBy, sortOrder } = ui.filters.candidates
    
    let filtered = candidates
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(candidate =>
        candidate.name.toLowerCase().includes(searchLower) ||
        candidate.email.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply score range filter
    if (filters.scoreRange) {
      const { min, max } = filters.scoreRange
      filtered = filtered.filter(candidate =>
        candidate.finalScore !== undefined &&
        candidate.finalScore >= min &&
        candidate.finalScore <= max
      )
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      const startDate = new Date(start)
      const endDate = new Date(end)
      filtered = filtered.filter(candidate => {
        const candidateDate = new Date(candidate.createdAt)
        return candidateDate >= startDate && candidateDate <= endDate
      })
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'name':
          aValue = a.name
          bValue = b.name
          break
        case 'email':
          aValue = a.email
          bValue = b.email
          break
        case 'finalScore':
          aValue = a.finalScore || 0
          bValue = b.finalScore || 0
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }
    })
    
    return filtered
  }
)

export const selectFilteredSessions = createSelector(
  [selectSessionList, selectUI],
  (sessions, ui) => {
    const { filters, search, sortBy, sortOrder } = ui.filters.sessions
    
    let filtered = sessions
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(session =>
        session.stage.toLowerCase().includes(searchLower)
      )
    }
    
    // Apply stage filter
    if (filters.stage) {
      filtered = filtered.filter(session => session.stage === filters.stage)
    }
    
    // Apply candidate filter
    if (filters.candidateId) {
      filtered = filtered.filter(session => session.candidateId === filters.candidateId)
    }
    
    // Apply date range filter
    if (filters.dateRange) {
      const { start, end } = filters.dateRange
      const startDate = new Date(start)
      const endDate = new Date(end)
      filtered = filtered.filter(session => {
        const sessionDate = new Date(session.createdAt)
        return sessionDate >= startDate && sessionDate <= endDate
      })
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any
      
      switch (sortBy) {
        case 'stage':
          aValue = a.stage
          bValue = b.stage
          break
        case 'updatedAt':
          aValue = new Date(a.updatedAt).getTime()
          bValue = new Date(b.updatedAt).getTime()
          break
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt).getTime()
          bValue = new Date(b.createdAt).getTime()
          break
      }
      
      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      } else {
        return sortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue
      }
    })
    
    return filtered
  }
)

/**
 * Loading state selectors
 */
export const selectCandidatesLoading: LoadingSelector = createSelector(
  [selectLoading],
  (loading) => loading.candidates.list
)

export const selectCandidateCreating: LoadingSelector = createSelector(
  [selectLoading],
  (loading) => loading.candidates.create
)

export const selectSessionsLoading: LoadingSelector = createSelector(
  [selectLoading],
  (loading) => loading.sessions.list
)

export const selectAuthLoading: LoadingSelector = createSelector(
  [selectLoading],
  (loading) => loading.auth.login || loading.auth.register
)

/**
 * Error state selectors
 */
export const selectCandidatesError: ErrorSelector = createSelector(
  [selectErrors],
  (errors) => errors.candidates.list
)

export const selectCandidateCreateError: ErrorSelector = createSelector(
  [selectErrors],
  (errors) => errors.candidates.create
)

export const selectSessionsError: ErrorSelector = createSelector(
  [selectErrors],
  (errors) => errors.sessions.list
)

export const selectAuthError: ErrorSelector = createSelector(
  [selectErrors],
  (errors) => errors.auth.login || errors.auth.register
)

export const selectGlobalError: ErrorSelector = createSelector(
  [selectErrors],
  (errors) => errors.global
)

/**
 * UI state selectors
 */
export const selectSelectedCandidates = createSelector(
  [selectUI, selectCandidates],
  (ui, candidates) =>
    ui.selections.selectedCandidateIds
      .map(id => candidates[id])
      .filter(Boolean)
)

export const selectCurrentCandidate = createSelector(
  [selectUI, selectCandidates],
  (ui, candidates) =>
    ui.selections.currentCandidateId ? candidates[ui.selections.currentCandidateId] : null
)

export const selectCurrentSession = createSelector(
  [selectUI, selectSessions],
  (ui, sessions) =>
    ui.selections.currentSessionId ? sessions[ui.selections.currentSessionId] : null
)

/**
 * Cache selectors
 */
export const selectCacheMetadata = (key: string) =>
  createSelector(
    [selectCache],
    (cache) => cache[key]
  )

export const selectIsStale = (key: string) =>
  createSelector(
    [selectCacheMetadata(key)],
    (metadata) => {
      if (!metadata) return true
      return metadata.isStale || (Date.now() - metadata.lastFetched) > metadata.ttl
    }
  )

/**
 * Optimistic update selectors
 */
export const selectOptimisticUpdates = createSelector(
  [selectOptimistic],
  (optimistic) => optimistic
)

export const selectOptimisticUpdatesByEntity = (entityType: string, entityId: string) =>
  createSelector(
    [selectOptimistic],
    (optimistic) =>
      optimistic.filter(update => 
        update.entityType === entityType && update.entityId === entityId
      )
  )

/**
 * Statistics selectors
 */
export const selectCandidateStats = createSelector(
  [selectCandidateList],
  (candidates) => {
    const total = candidates.length
    const completed = candidates.filter(c => c.finalScore !== undefined).length
    const inProgress = candidates.filter(c => c.sessionIds.length > 0 && c.finalScore === undefined).length
    const notStarted = total - completed - inProgress
    
    const averageScore = completed > 0 
      ? candidates
          .filter(c => c.finalScore !== undefined)
          .reduce((sum, c) => sum + (c.finalScore || 0), 0) / completed
      : 0
    
    return {
      total,
      completed,
      inProgress,
      notStarted,
      averageScore: Math.round(averageScore * 100) / 100
    }
  }
)

export const selectSessionStats = createSelector(
  [selectSessionList],
  (sessions) => {
    const total = sessions.length
    const byStage = sessions.reduce((acc, session) => {
      acc[session.stage] = (acc[session.stage] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    return {
      total,
      byStage
    }
  }
)