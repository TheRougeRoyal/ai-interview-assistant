import { describe, it, expect } from 'vitest'
import { selectProfile } from '@/store/slices/session'

describe('selectProfile selector', () => {
  it('returns a safe default when session undefined', () => {
    const state = {} as any
    const p = selectProfile(state)
    expect(p).toHaveProperty('name')
    expect(p).toHaveProperty('email')
    expect(p).toHaveProperty('phone')
  })

  it('returns profile from session when available', () => {
    const state = {
      session: {
        profile: {
          name: 'Test User',
          email: 'test@example.com',
          phone: '123-456-7890'
        }
      }
    } as any
    const p = selectProfile(state)
    expect(p.name).toBe('Test User')
    expect(p.email).toBe('test@example.com')
    expect(p.phone).toBe('123-456-7890')
  })

  it('handles partially defined profile', () => {
    const state = {
      session: {
        profile: {
          name: 'Partial User',
          // email and phone missing
        }
      }
    } as any
    const p = selectProfile(state)
    expect(p.name).toBe('Partial User')
    expect(p).toHaveProperty('email')
    expect(p).toHaveProperty('phone')
  })
})