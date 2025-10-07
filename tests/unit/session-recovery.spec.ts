import { describe, it, expect, beforeEach, vi } from 'vitest'
import { selectIsResumable, selectRemainingMsForIndex } from '@/store/slices/session'
import type { SessionState } from '@/store/slices/session'

const createSessionState = (overrides: Partial<SessionState> = {}): { session: SessionState } => ({
  session: {
    version: 1,
    stage: 'collecting_profile',
    profile: { name: '', email: '', phone: '' },
    plan: [],
    currentIndex: 0,
    questions: {},
    timers: {},
    answers: {},
    ...overrides
  }
})

const mockNow = vi.fn()
vi.stubGlobal('Date', {
  now: mockNow
})

describe('Session Recovery Selectors', () => {
  beforeEach(() => {
    mockNow.mockReturnValue(1000000)
  })

  describe('selectIsResumable', () => {
    it('returns false when stage is not interviewing', () => {
      const state = createSessionState({
        stage: 'collecting_profile',
        questions: { 0: { prompt: 'Test?', difficulty: 'easy', targetDurationMs: 20000 } },
      })

      expect(selectIsResumable(state)).toBe(false)
    })

    it('returns false when no questions exist', () => {
      const state = createSessionState({
        stage: 'interviewing',
      })

      expect(selectIsResumable(state)).toBe(false)
    })

    it('returns true when question exists but no answer', () => {
      const state = createSessionState({
        stage: 'interviewing',
        questions: { 0: { prompt: 'Test?', difficulty: 'easy', targetDurationMs: 20000 } },
      })

      expect(selectIsResumable(state)).toBe(true)
    })

    it('returns true when question exists with draft but not submitted', () => {
      const state = createSessionState({
        stage: 'interviewing',
        questions: { 0: { prompt: 'Test?', difficulty: 'easy', targetDurationMs: 20000 } },
        answers: { 0: { text: 'Draft answer' } }
      })

      expect(selectIsResumable(state)).toBe(true)
    })

    it('returns false when all answered questions are submitted', () => {
      const state = createSessionState({
        stage: 'interviewing',
        questions: { 0: { prompt: 'Test?', difficulty: 'easy', targetDurationMs: 20000 } },
        answers: { 0: { text: 'Final answer', submittedAt: 999000, timeTakenMs: 15000 } }
      })

      expect(selectIsResumable(state)).toBe(false)
    })
  })

  describe('selectRemainingMsForIndex', () => {
    it('returns 0 when no timer exists for index', () => {
      const state = createSessionState()

      expect(selectRemainingMsForIndex(state, 0)).toBe(0)
    })

    it('calculates remaining time correctly', () => {
      const startedAt = 990000
      const durationMs = 20000
      
      const state = createSessionState({
        timers: { 0: { startedAt, durationMs } }
      })

      expect(selectRemainingMsForIndex(state, 0)).toBe(10000)
    })

    it('returns 0 when time has expired', () => {
      const startedAt = 970000
      const durationMs = 20000
      
      const state = createSessionState({
        timers: { 0: { startedAt, durationMs } }
      })

      expect(selectRemainingMsForIndex(state, 0)).toBe(0)
    })

    it('handles edge case of exactly expired timer', () => {
      const startedAt = 980000
      const durationMs = 20000
      
      const state = createSessionState({
        timers: { 0: { startedAt, durationMs } }
      })

      expect(selectRemainingMsForIndex(state, 0)).toBe(0)
    })
  })
})