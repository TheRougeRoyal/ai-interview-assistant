/**
 * Enhanced entity management with normalization and optimistic updates
 */

import { createSlice, PayloadAction, createEntityAdapter } from '@reduxjs/toolkit'
import type {
  NormalizedEntities,
  EntityCollections,
  CandidateEntity,
  SessionEntity,
  AnswerEntity,
  UserEntity,
  ScoreEntity,
  EntityActionPayload,
  CollectionActionPayload,
  OptimisticUpdate,
  OptimisticActionPayload
} from './types'
import { generateCorrelationId } from '@/lib/errors/correlation'

/**
 * Entity adapters for normalized state management
 */
export const candidateAdapter = createEntityAdapter<CandidateEntity>({
  sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
})

export const sessionAdapter = createEntityAdapter<SessionEntity>({
  sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
})

export const answerAdapter = createEntityAdapter<AnswerEntity>({
  sortComparer: (a, b) => a.questionIndex - b.questionIndex
})

export const userAdapter = createEntityAdapter<UserEntity>({
  sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
})

export const scoreAdapter = createEntityAdapter<ScoreEntity>({
  sortComparer: (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
})

/**
 * Initial state for entities
 */
const initialEntitiesState: NormalizedEntities = {
  candidates: {},
  sessions: {},
  answers: {},
  users: {},
  scores: {}
}

/**
 * Initial state for collections
 */
const initialCollectionsState: EntityCollections = {
  candidateIds: [],
  sessionIds: [],
  answerIds: [],
  userIds: [],
  scoreIds: []
}

/**
 * Entities slice for normalized entity management
 */
export const entitiesSlice = createSlice({
  name: 'entities',
  initialState: initialEntitiesState,
  reducers: {
    // Candidate operations
    setCandidates: (state, action: PayloadAction<CandidateEntity[]>) => {
      state.candidates = {}
      action.payload.forEach(candidate => {
        state.candidates[candidate.id] = candidate
      })
    },
    
    addCandidate: (state, action: PayloadAction<EntityActionPayload<CandidateEntity>>) => {
      const { entity } = action.payload
      state.candidates[entity.id] = entity
    },
    
    updateCandidate: (state, action: PayloadAction<EntityActionPayload<Partial<CandidateEntity> & { id: string }>>) => {
      const { entity } = action.payload
      if (state.candidates[entity.id]) {
        state.candidates[entity.id] = { ...state.candidates[entity.id], ...entity }
      }
    },
    
    removeCandidate: (state, action: PayloadAction<string>) => {
      delete state.candidates[action.payload]
    },
    
    // Session operations
    setSessions: (state, action: PayloadAction<SessionEntity[]>) => {
      state.sessions = {}
      action.payload.forEach(session => {
        state.sessions[session.id] = session
      })
    },
    
    addSession: (state, action: PayloadAction<EntityActionPayload<SessionEntity>>) => {
      const { entity } = action.payload
      state.sessions[entity.id] = entity
    },
    
    updateSession: (state, action: PayloadAction<EntityActionPayload<Partial<SessionEntity> & { id: string }>>) => {
      const { entity } = action.payload
      if (state.sessions[entity.id]) {
        state.sessions[entity.id] = { ...state.sessions[entity.id], ...entity }
      }
    },
    
    removeSession: (state, action: PayloadAction<string>) => {
      delete state.sessions[action.payload]
    },
    
    // Answer operations
    setAnswers: (state, action: PayloadAction<AnswerEntity[]>) => {
      state.answers = {}
      action.payload.forEach(answer => {
        state.answers[answer.id] = answer
      })
    },
    
    addAnswer: (state, action: PayloadAction<EntityActionPayload<AnswerEntity>>) => {
      const { entity } = action.payload
      state.answers[entity.id] = entity
    },
    
    updateAnswer: (state, action: PayloadAction<EntityActionPayload<Partial<AnswerEntity> & { id: string }>>) => {
      const { entity } = action.payload
      if (state.answers[entity.id]) {
        state.answers[entity.id] = { ...state.answers[entity.id], ...entity }
      }
    },
    
    removeAnswer: (state, action: PayloadAction<string>) => {
      delete state.answers[action.payload]
    },
    
    // User operations
    setUsers: (state, action: PayloadAction<UserEntity[]>) => {
      state.users = {}
      action.payload.forEach(user => {
        state.users[user.id] = user
      })
    },
    
    addUser: (state, action: PayloadAction<EntityActionPayload<UserEntity>>) => {
      const { entity } = action.payload
      state.users[entity.id] = entity
    },
    
    updateUser: (state, action: PayloadAction<EntityActionPayload<Partial<UserEntity> & { id: string }>>) => {
      const { entity } = action.payload
      if (state.users[entity.id]) {
        state.users[entity.id] = { ...state.users[entity.id], ...entity }
      }
    },
    
    removeUser: (state, action: PayloadAction<string>) => {
      delete state.users[action.payload]
    },
    
    // Score operations
    setScores: (state, action: PayloadAction<ScoreEntity[]>) => {
      state.scores = {}
      action.payload.forEach(score => {
        state.scores[score.id] = score
      })
    },
    
    addScore: (state, action: PayloadAction<EntityActionPayload<ScoreEntity>>) => {
      const { entity } = action.payload
      state.scores[entity.id] = entity
    },
    
    updateScore: (state, action: PayloadAction<EntityActionPayload<Partial<ScoreEntity> & { id: string }>>) => {
      const { entity } = action.payload
      if (state.scores[entity.id]) {
        state.scores[entity.id] = { ...state.scores[entity.id], ...entity }
      }
    },
    
    removeScore: (state, action: PayloadAction<string>) => {
      delete state.scores[action.payload]
    },
    
    // Batch operations
    batchUpdateEntities: (state, action: PayloadAction<{
      candidates?: Partial<Record<string, Partial<CandidateEntity>>>
      sessions?: Partial<Record<string, Partial<SessionEntity>>>
      answers?: Partial<Record<string, Partial<AnswerEntity>>>
      users?: Partial<Record<string, Partial<UserEntity>>>
      scores?: Partial<Record<string, Partial<ScoreEntity>>>
    }>) => {
      const { candidates, sessions, answers, users, scores } = action.payload
      
      if (candidates) {
        Object.entries(candidates).forEach(([id, updates]) => {
          if (state.candidates[id] && updates) {
            state.candidates[id] = { ...state.candidates[id], ...updates }
          }
        })
      }
      
      if (sessions) {
        Object.entries(sessions).forEach(([id, updates]) => {
          if (state.sessions[id] && updates) {
            state.sessions[id] = { ...state.sessions[id], ...updates }
          }
        })
      }
      
      if (answers) {
        Object.entries(answers).forEach(([id, updates]) => {
          if (state.answers[id] && updates) {
            state.answers[id] = { ...state.answers[id], ...updates }
          }
        })
      }
      
      if (users) {
        Object.entries(users).forEach(([id, updates]) => {
          if (state.users[id] && updates) {
            state.users[id] = { ...state.users[id], ...updates }
          }
        })
      }
      
      if (scores) {
        Object.entries(scores).forEach(([id, updates]) => {
          if (state.scores[id] && updates) {
            state.scores[id] = { ...state.scores[id], ...updates }
          }
        })
      }
    },
    
    // Clear operations
    clearEntities: (state) => {
      state.candidates = {}
      state.sessions = {}
      state.answers = {}
      state.users = {}
      state.scores = {}
    }
  }
})

/**
 * Collections slice for managing ordered entity lists
 */
export const collectionsSlice = createSlice({
  name: 'collections',
  initialState: initialCollectionsState,
  reducers: {
    setCollection: (state, action: PayloadAction<CollectionActionPayload>) => {
      const { entityType, ids } = action.payload
      const collectionKey = `${entityType.slice(0, -1)}Ids` as keyof EntityCollections
      ;(state as any)[collectionKey] = ids
    },
    
    addToCollection: (state, action: PayloadAction<CollectionActionPayload & { id: string }>) => {
      const { entityType, id, append = true } = action.payload
      const collectionKey = `${entityType.slice(0, -1)}Ids` as keyof EntityCollections
      const collection = (state as any)[collectionKey] as string[]
      
      if (!collection.includes(id)) {
        if (append) {
          collection.push(id)
        } else {
          collection.unshift(id)
        }
      }
    },
    
    removeFromCollection: (state, action: PayloadAction<{ entityType: keyof NormalizedEntities; id: string }>) => {
      const { entityType, id } = action.payload
      const collectionKey = `${entityType.slice(0, -1)}Ids` as keyof EntityCollections
      const collection = (state as any)[collectionKey] as string[]
      const index = collection.indexOf(id)
      if (index !== -1) {
        collection.splice(index, 1)
      }
    },
    
    reorderCollection: (state, action: PayloadAction<{
      entityType: keyof NormalizedEntities
      fromIndex: number
      toIndex: number
    }>) => {
      const { entityType, fromIndex, toIndex } = action.payload
      const collectionKey = `${entityType.slice(0, -1)}Ids` as keyof EntityCollections
      const collection = (state as any)[collectionKey] as string[]
      
      if (fromIndex >= 0 && fromIndex < collection.length && toIndex >= 0 && toIndex < collection.length) {
        const [removed] = collection.splice(fromIndex, 1)
        collection.splice(toIndex, 0, removed)
      }
    },
    
    clearCollection: (state, action: PayloadAction<keyof NormalizedEntities>) => {
      const entityType = action.payload
      const collectionKey = `${entityType.slice(0, -1)}Ids` as keyof EntityCollections
      ;(state as any)[collectionKey] = []
    },
    
    clearAllCollections: (state) => {
      state.candidateIds = []
      state.sessionIds = []
      state.answerIds = []
      state.userIds = []
      state.scoreIds = []
    }
  }
})

/**
 * Optimistic updates slice
 */
export const optimisticSlice = createSlice({
  name: 'optimistic',
  initialState: [] as OptimisticUpdate[],
  reducers: {
    addOptimisticUpdate: (state, action: PayloadAction<OptimisticActionPayload>) => {
      const update: OptimisticUpdate = {
        ...action.payload,
        timestamp: Date.now()
      }
      state.push(update)
    },
    
    removeOptimisticUpdate: (state, action: PayloadAction<string>) => {
      return state.filter(update => update.id !== action.payload)
    },
    
    clearOptimisticUpdates: () => {
      return []
    },
    
    revertOptimisticUpdate: (state, action: PayloadAction<string>) => {
      const updateIndex = state.findIndex(update => update.id === action.payload)
      if (updateIndex !== -1) {
        state.splice(updateIndex, 1)
      }
    }
  }
})

// Export actions
export const {
  setCandidates,
  addCandidate,
  updateCandidate,
  removeCandidate,
  setSessions,
  addSession,
  updateSession,
  removeSession,
  setAnswers,
  addAnswer,
  updateAnswer,
  removeAnswer,
  setUsers,
  addUser,
  updateUser,
  removeUser,
  setScores,
  addScore,
  updateScore,
  removeScore,
  batchUpdateEntities,
  clearEntities
} = entitiesSlice.actions

export const {
  setCollection,
  addToCollection,
  removeFromCollection,
  reorderCollection,
  clearCollection,
  clearAllCollections
} = collectionsSlice.actions

export const {
  addOptimisticUpdate,
  removeOptimisticUpdate,
  clearOptimisticUpdates,
  revertOptimisticUpdate
} = optimisticSlice.actions

// Export reducers
export const entitiesReducer = entitiesSlice.reducer
export const collectionsReducer = collectionsSlice.reducer
export const optimisticReducer = optimisticSlice.reducer