/**
 * Integration layer for connecting normalized state with existing Redux slices
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import type { EnhancedRootState, CandidateEntity, SessionEntity, AnswerEntity } from './types'
import { 
  setCandidates, 
  addCandidate, 
  updateCandidate,
  setSessions,
  addSession,
  updateSession,
  setAnswers,
  addAnswer,
  updateAnswer,
  setCollection,
  addToCollection
} from './entities'
import { fetchAPI } from '@/lib/http/apiClient'
import { generateCorrelationId } from '@/lib/errors/correlation'

/**
 * Async thunks for normalized state management
 */

// Candidate operations
export const fetchCandidates = createAsyncThunk(
  'candidates/fetchList',
  async (params: { page?: number; limit?: number; search?: string } = {}, { dispatch, getState }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const queryParams = new URLSearchParams()
      if (params.page) queryParams.set('page', params.page.toString())
      if (params.limit) queryParams.set('limit', params.limit.toString())
      if (params.search) queryParams.set('search', params.search)
      
      const response = await fetchAPI(`/api/candidates?${queryParams.toString()}`)
      
      // Normalize and store candidates
      const candidates: CandidateEntity[] = response.candidates.map((candidate: any) => ({
        ...candidate,
        sessionIds: candidate.sessions?.map((s: any) => s.id) || [],
        createdAt: candidate.createdAt || new Date().toISOString(),
        updatedAt: candidate.updatedAt || new Date().toISOString()
      }))
      
      dispatch(setCandidates(candidates))
      dispatch(setCollection({
        entityType: 'candidates',
        ids: candidates.map(c => c.id)
      }))
      
      return { candidates, total: response.total, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const createCandidate = createAsyncThunk(
  'candidates/create',
  async (candidateData: Partial<CandidateEntity>, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateData)
      })
      
      const candidate: CandidateEntity = {
        ...response.candidate,
        sessionIds: [],
        createdAt: response.candidate.createdAt || new Date().toISOString(),
        updatedAt: response.candidate.updatedAt || new Date().toISOString()
      }
      
      dispatch(addCandidate({ entity: candidate, correlationId }))
      dispatch(addToCollection({
        entityType: 'candidates',
        id: candidate.id,
        append: false // Add to beginning
      }))
      
      return { candidate, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const updateCandidateById = createAsyncThunk(
  'candidates/update',
  async ({ id, updates }: { id: string; updates: Partial<CandidateEntity> }, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI(`/api/candidates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const updatedCandidate = {
        ...response.candidate,
        updatedAt: new Date().toISOString()
      }
      
      dispatch(updateCandidate({ 
        entity: updatedCandidate,
        correlationId 
      }))
      
      return { candidate: updatedCandidate, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

// Session operations
export const fetchSessions = createAsyncThunk(
  'sessions/fetchList',
  async (params: { candidateId?: string; page?: number; limit?: number } = {}, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const queryParams = new URLSearchParams()
      if (params.candidateId) queryParams.set('candidateId', params.candidateId)
      if (params.page) queryParams.set('page', params.page.toString())
      if (params.limit) queryParams.set('limit', params.limit.toString())
      
      const response = await fetchAPI(`/api/sessions?${queryParams.toString()}`)
      
      const sessions: SessionEntity[] = response.sessions.map((session: any) => ({
        ...session,
        answerIds: session.answers?.map((a: any) => a.id) || [],
        createdAt: session.createdAt || new Date().toISOString(),
        updatedAt: session.updatedAt || new Date().toISOString()
      }))
      
      dispatch(setSessions(sessions))
      dispatch(setCollection({
        entityType: 'sessions',
        ids: sessions.map(s => s.id)
      }))
      
      return { sessions, total: response.total, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const createSession = createAsyncThunk(
  'sessions/create',
  async (sessionData: Partial<SessionEntity>, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      })
      
      const session: SessionEntity = {
        ...response.session,
        answerIds: [],
        createdAt: response.session.createdAt || new Date().toISOString(),
        updatedAt: response.session.updatedAt || new Date().toISOString()
      }
      
      dispatch(addSession({ entity: session, correlationId }))
      dispatch(addToCollection({
        entityType: 'sessions',
        id: session.id,
        append: false
      }))
      
      return { session, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const updateSessionById = createAsyncThunk(
  'sessions/update',
  async ({ id, updates }: { id: string; updates: Partial<SessionEntity> }, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI(`/api/sessions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const updatedSession = {
        ...response.session,
        updatedAt: new Date().toISOString()
      }
      
      dispatch(updateSession({ 
        entity: updatedSession,
        correlationId 
      }))
      
      return { session: updatedSession, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

// Answer operations
export const fetchAnswers = createAsyncThunk(
  'answers/fetchList',
  async (params: { sessionId: string }, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI(`/api/sessions/${params.sessionId}/answers`)
      
      const answers: AnswerEntity[] = response.answers.map((answer: any) => ({
        ...answer,
        scoreIds: answer.scores?.map((s: any) => s.id) || [],
        createdAt: answer.createdAt || new Date().toISOString(),
        updatedAt: answer.updatedAt || new Date().toISOString()
      }))
      
      dispatch(setAnswers(answers))
      dispatch(setCollection({
        entityType: 'answers',
        ids: answers.map(a => a.id)
      }))
      
      return { answers, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const createAnswer = createAsyncThunk(
  'answers/create',
  async (answerData: Partial<AnswerEntity>, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI('/api/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answerData)
      })
      
      const answer: AnswerEntity = {
        ...response.answer,
        scoreIds: [],
        createdAt: response.answer.createdAt || new Date().toISOString(),
        updatedAt: response.answer.updatedAt || new Date().toISOString()
      }
      
      dispatch(addAnswer({ entity: answer, correlationId }))
      dispatch(addToCollection({
        entityType: 'answers',
        id: answer.id,
        append: true // Answers are typically added in order
      }))
      
      return { answer, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

export const updateAnswerById = createAsyncThunk(
  'answers/update',
  async ({ id, updates }: { id: string; updates: Partial<AnswerEntity> }, { dispatch }) => {
    const correlationId = generateCorrelationId()
    
    try {
      const response = await fetchAPI(`/api/answers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const updatedAnswer = {
        ...response.answer,
        updatedAt: new Date().toISOString()
      }
      
      dispatch(updateAnswer({ 
        entity: updatedAnswer,
        correlationId 
      }))
      
      return { answer: updatedAnswer, correlationId }
    } catch (error) {
      throw { error, correlationId }
    }
  }
)

/**
 * Utility functions for state synchronization
 */

// Sync legacy session state with normalized state
export const syncSessionWithNormalizedState = createAsyncThunk(
  'integration/syncSession',
  async (sessionData: any, { dispatch, getState }) => {
    const state = getState() as EnhancedRootState
    
    // Create or update candidate if needed
    if (sessionData.candidateId && sessionData.profile) {
      const existingCandidate = state.entities.candidates[sessionData.candidateId]
      
      if (!existingCandidate) {
        const candidateEntity: CandidateEntity = {
          id: sessionData.candidateId,
          name: sessionData.profile.name || '',
          email: sessionData.profile.email || '',
          phone: sessionData.profile.phone,
          resumeText: sessionData.resumeText,
          sessionIds: sessionData.sessionId ? [sessionData.sessionId] : [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        dispatch(addCandidate({ entity: candidateEntity }))
        dispatch(addToCollection({
          entityType: 'candidates',
          id: candidateEntity.id
        }))
      }
    }
    
    // Create or update session if needed
    if (sessionData.sessionId) {
      const existingSession = state.entities.sessions[sessionData.sessionId]
      
      if (!existingSession) {
        const sessionEntity: SessionEntity = {
          id: sessionData.sessionId,
          candidateId: sessionData.candidateId || '',
          stage: sessionData.stage || 'collecting_profile',
          currentIndex: sessionData.currentIndex || 0,
          plan: sessionData.plan || [],
          answerIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        dispatch(addSession({ entity: sessionEntity }))
        dispatch(addToCollection({
          entityType: 'sessions',
          id: sessionEntity.id
        }))
      }
    }
    
    return { synced: true }
  }
)

// Convert legacy state to normalized entities
export const migrateLegacyState = (legacyState: any): {
  candidates: CandidateEntity[]
  sessions: SessionEntity[]
  answers: AnswerEntity[]
} => {
  const candidates: CandidateEntity[] = []
  const sessions: SessionEntity[] = []
  const answers: AnswerEntity[] = []
  
  // Extract candidate from session profile
  if (legacyState.session?.candidateId && legacyState.session?.profile) {
    const candidate: CandidateEntity = {
      id: legacyState.session.candidateId,
      name: legacyState.session.profile.name || '',
      email: legacyState.session.profile.email || '',
      phone: legacyState.session.profile.phone,
      resumeText: legacyState.session.resumeText,
      sessionIds: legacyState.session.sessionId ? [legacyState.session.sessionId] : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    candidates.push(candidate)
  }
  
  // Extract session
  if (legacyState.session?.sessionId) {
    const session: SessionEntity = {
      id: legacyState.session.sessionId,
      candidateId: legacyState.session.candidateId || '',
      stage: legacyState.session.stage || 'collecting_profile',
      currentIndex: legacyState.session.currentIndex || 0,
      plan: legacyState.session.plan || [],
      answerIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    sessions.push(session)
    
    // Extract answers from session
    if (legacyState.session.answers) {
      Object.entries(legacyState.session.answers).forEach(([index, answerData]: [string, any]) => {
        if (answerData && answerData.text) {
          const answer: AnswerEntity = {
            id: `${session.id}-${index}`,
            sessionId: session.id,
            questionIndex: parseInt(index),
            difficulty: legacyState.session.questions?.[index]?.difficulty || 'medium',
            question: legacyState.session.questions?.[index]?.prompt || '',
            answerText: answerData.text,
            durationMs: legacyState.session.questions?.[index]?.targetDurationMs || 300000,
            timeTakenMs: answerData.timeTakenMs,
            rubric: answerData.rubric,
            submittedAt: answerData.submittedAt ? new Date(answerData.submittedAt).toISOString() : undefined,
            scoreIds: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
          answers.push(answer)
          session.answerIds.push(answer.id)
        }
      })
    }
  }
  
  return { candidates, sessions, answers }
}