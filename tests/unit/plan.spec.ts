import { describe, it, expect } from 'vitest'
import { getTargetDurationForIndex } from '@/store/slices/session'

describe('getTargetDurationForIndex', () => {
  it('returns correct durations for indices 0..5', () => {
    const expected = [20000, 20000, 60000, 60000, 120000, 120000]
    for (let i = 0; i < 6; i++) {
      expect(getTargetDurationForIndex(i)).toBe(expected[i])
    }
  })
})
