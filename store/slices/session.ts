import { indexToDifficulty, difficultyToDurationMs } from '@/lib/interview/plan'
export function getTargetDurationForIndex(i: number): number {
  return difficultyToDurationMs(indexToDifficulty(i))
}
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../index';

export type InterviewStage = 'collecting_profile' | 'interviewing' | 'completed'

export interface SessionState {
  version: number
  stage: InterviewStage
  profile: {
    name?: string
    email?: string
    phone?: string
  }
  resumeMeta?: {
    filename: string
    size: number
    mime: string
  }
  // Parsed resume analysis summary (skills/sections minimal subset)
  resumeAnalysis?: {
    skills?: {
      technical?: string[]
      soft?: string[]
      languages?: string[]
      frameworks?: string[]
      tools?: string[]
    }
    sections?: {
      summary?: string
      experience?: string
      education?: string
      skills?: string
    }
    qualityScore?: number
  }
  plan: Array<{
    index: number
    difficulty: 'easy' | 'medium' | 'hard'
    targetDurationMs: number
  }>
  currentIndex: number
  questions: Record<number, {
    prompt: string
    difficulty: 'easy' | 'medium' | 'hard'
    targetDurationMs: number
  }>
  timers: Record<number, {
    startedAt: number
    durationMs: number
  }>
  answers: Record<number, {
    text: string
    submittedAt?: number
    timeTakenMs?: number
    rubric?: {
      accuracy: number
      completeness: number
      relevance: number
      timeliness: number
      total: number
      rationale: string
    }
  }>
  resumeText?: string
  resumeConfidence?: number
  candidateId?: string
  sessionId?: string
  persistError?: string
  finalResults?: {
    finalScore: number
    summary: string
    strengths: string[]
    gaps: string[]
  }
}

const initialState: SessionState = {
  version: 1,
  stage: 'collecting_profile',
  profile: {},
  resumeMeta: undefined,
  resumeText: undefined,
  resumeAnalysis: undefined,
  plan: [],
  currentIndex: 0,
  questions: {},
  timers: {},
  answers: {},
}

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setStage: (state, action: PayloadAction<InterviewStage>) => {
      state.stage = action.payload
    },
    updateProfile: (state, action: PayloadAction<Partial<SessionState['profile']>>) => {
      state.profile = { ...state.profile, ...action.payload }
    },
    setProfileFields: (state, action: PayloadAction<Partial<SessionState['profile']>>) => {
      state.profile = { ...state.profile, ...action.payload }
    },
    beginInterview: (state, action: PayloadAction<{ plan: SessionState['plan'] }>) => {
      // Preserve profile, resumeMeta, resumeText, and IDs
      const profileToKeep = state.profile
      const resumeMetaToKeep = state.resumeMeta
      const resumeTextToKeep = state.resumeText
      const resumeConfidenceToKeep = state.resumeConfidence
      const resumeAnalysisToKeep = state.resumeAnalysis
      const candidateIdToKeep = state.candidateId
      const sessionIdToKeep = state.sessionId
      
      // Reset interview state - IMPORTANT: currentIndex MUST start at 0
      state.stage = 'interviewing'
      state.currentIndex = 0  // Always start from question 1 (index 0)
      state.plan = action.payload.plan
      state.questions = {}
      state.timers = {}
      state.answers = {}
      state.finalResults = undefined
      
      // Restore preserved values
      state.profile = profileToKeep
      state.resumeMeta = resumeMetaToKeep
      state.resumeText = resumeTextToKeep
      state.resumeConfidence = resumeConfidenceToKeep
      state.resumeAnalysis = resumeAnalysisToKeep
      state.candidateId = candidateIdToKeep
      state.sessionId = sessionIdToKeep
    },
    setPlan: (state, action: PayloadAction<SessionState['plan']>) => {
      state.plan = action.payload
    },
    setCurrentIndex: (state, action: PayloadAction<number>) => {
      state.currentIndex = action.payload
    },
    setQuestion: (state, action: PayloadAction<{ index: number; data: { prompt: string; difficulty: 'easy' | 'medium' | 'hard'; targetDurationMs: number } }>) => {
      const { index, data } = action.payload
      state.questions[index] = data
    },
    setTimer: (state, action: PayloadAction<{ index: number; startedAt: number; durationMs: number }>) => {
      const { index, startedAt, durationMs } = action.payload
      state.timers[index] = { startedAt, durationMs }
    },
    setAnswerDraft: (state, action: PayloadAction<{ index: number; text: string }>) => {
      const { index, text } = action.payload
      if (!state.answers[index]) {
        state.answers[index] = { text }
      } else {
        state.answers[index].text = text
      }
    },
    finalizeAnswer: (state, action: PayloadAction<{ index: number; submittedAt: number; timeTakenMs: number; rubric: { accuracy: number; completeness: number; relevance: number; timeliness: number; total: number; rationale: string } }>) => {
      const { index, submittedAt, timeTakenMs, rubric } = action.payload
      if (state.answers[index]) {
        state.answers[index].submittedAt = submittedAt
        state.answers[index].timeTakenMs = timeTakenMs
        state.answers[index].rubric = rubric
      }
    },
    advanceIndex: (state) => {
      state.currentIndex = Math.min(state.currentIndex + 1, 5)
    },
    completeInterview: (state, action: PayloadAction<{ finalScore: number; summary: string; strengths: string[]; gaps: string[] }>) => {
      state.finalResults = action.payload
      state.stage = 'completed'
    },
    resetInterview: (state, action: PayloadAction<{ keepProfile?: boolean }>) => {
      const { keepProfile = true } = action.payload
      const profileToKeep = keepProfile ? state.profile : { name: '', email: '', phone: '' }
      const resumeMetaToKeep = keepProfile ? state.resumeMeta : undefined
      const resumeTextToKeep = keepProfile ? state.resumeText : undefined
      const resumeConfidenceToKeep = keepProfile ? state.resumeConfidence : undefined
      
      return {
        ...initialState,
        profile: profileToKeep,
        resumeMeta: resumeMetaToKeep,
        resumeText: resumeTextToKeep,
        resumeConfidence: resumeConfidenceToKeep,
      }
    },
    setResumeData: (state, action: PayloadAction<{ text: string; confidence: number }>) => {
      state.resumeText = action.payload.text
      state.resumeConfidence = action.payload.confidence
    },
    setResumeText: (state, action: PayloadAction<string>) => {
      state.resumeText = action.payload
    },
    setResumeMeta: (state, action: PayloadAction<{ filename: string; size: number; mime: string }>) => {
      state.resumeMeta = action.payload
    },
    setResumeAnalysis: (state, action: PayloadAction<SessionState['resumeAnalysis']>) => {
      state.resumeAnalysis = action.payload
    },
    setIds: (state, action: PayloadAction<{ candidateId?: string; sessionId?: string }>) => {
      if (action.payload.candidateId) state.candidateId = action.payload.candidateId
      if (action.payload.sessionId) state.sessionId = action.payload.sessionId
    },
    markPersistError: (state, action: PayloadAction<string>) => {
      state.persistError = action.payload
    },
    clearPersistError: (state) => {
      state.persistError = undefined
    },
    resetSession: () => initialState,
  },
})

export const {
  setStage,
  updateProfile,
  setProfileFields,
  beginInterview,
  setPlan,
  setCurrentIndex,
  setQuestion,
  setTimer,
  setAnswerDraft,
  finalizeAnswer,
  advanceIndex,
  completeInterview,
  resetInterview,
  setResumeData,
  setResumeText,
  setResumeMeta,
  setResumeAnalysis,
  setIds,
  markPersistError,
  clearPersistError,
  resetSession,
} = sessionSlice.actions

export const selectProfile = (s: RootState): { name: string; email: string; phone: string } => {
  const p = s.session?.profile ?? {}
  return {
    name: p.name ?? '',
    email: p.email ?? '',
    phone: p.phone ?? '',
  }
}
export const selectIsProfileComplete = (s: RootState) => {
  const p = s.session?.profile ?? {}
  return !!(p.name && p.email && p.phone)
}
export const selectResumeMeta = (s: RootState) => s.session?.resumeMeta
export const selectResumeText = (s: RootState) => s.session?.resumeText

export const selectHasCompleteProfile = (state: { session: SessionState }) => {
  if (!state.session || !state.session.profile) return false;
  const { name, email, phone } = state.session.profile;
  return !!(name?.trim() && email?.trim() && phone?.trim());
}
export const selectIds = (state: { session: SessionState }) => ({
  candidateId: state.session.candidateId,
  sessionId: state.session.sessionId
})
export const selectCurrentQuestion = (state: { session: SessionState }) => 
  state.session.questions[state.session.currentIndex]
export const selectCurrentTimer = (state: { session: SessionState }) => 
  state.session.timers[state.session.currentIndex]
export const selectCurrentAnswer = (state: { session: SessionState }) => 
  state.session.answers[state.session.currentIndex]

export const selectIsResumable = (state: { session: SessionState }): boolean => {
  if (!state.session) return false;
  const { stage, questions, answers } = state.session;
  if (stage !== 'interviewing') return false;
  for (let i = 0; i < 6; i++) {
    if (questions[i] && (!answers[i] || !answers[i].submittedAt)) {
      return true;
    }
  }
  return false;
}

export const selectRemainingMsForIndex = (state: { session: SessionState }, index: number): number => {
  // Safety check for undefined state during hydration
  if (!state?.session?.timers) return 0
  
  const timer = state.session.timers[index]
  if (!timer) return 0
  
  const elapsed = Date.now() - timer.startedAt
  return Math.max(0, timer.durationMs - elapsed)
}

export const selectCurrentIndex = (state: { session: SessionState }) => state.session.currentIndex

export const selectQuestionForIndex = (state: { session: SessionState }, index: number) => 
  state.session.questions[index]

export const selectTimerForIndex = (state: { session: SessionState }, index: number) => 
  state.session.timers[index]

export const selectAnswerDraftForIndex = (state: { session: SessionState }, index: number) => 
  state.session.answers[index]?.text || ''

export default sessionSlice.reducer

import { useAppSelector } from '../index'

/**
 * Custom hook to select the session profile from the store
 */
export const useSessionProfile = () =>
  useAppSelector(state => state.session.profile)
