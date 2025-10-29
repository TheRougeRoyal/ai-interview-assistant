import { vi } from 'vitest'

process.env.AI_VENDOR = process.env.AI_VENDOR ?? 'mock'
process.env.AI_MODEL = process.env.AI_MODEL ?? 'gpt-4o-mini'
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'file:./dev.test.db'

import 'cross-fetch/polyfill'

// Make React available globally for files compiled with the automatic JSX runtime
import * as React from 'react'
(globalThis as any).React = React

// Mock navigator for browser APIs
Object.defineProperty(globalThis, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'Mozilla/5.0 (Node.js) Vitest',
  },
  writable: true,
  configurable: true,
})

// Mock window.addEventListener for online/offline events
const eventListeners = new Map<string, Set<EventListener>>()
Object.defineProperty(globalThis, 'addEventListener', {
  value: (event: string, listener: EventListener) => {
    if (!eventListeners.has(event)) {
      eventListeners.set(event, new Set())
    }
    eventListeners.get(event)!.add(listener)
  },
  writable: true,
})

Object.defineProperty(globalThis, 'removeEventListener', {
  value: (event: string, listener: EventListener) => {
    eventListeners.get(event)?.delete(listener)
  },
  writable: true,
})

// Helper to trigger network events in tests
;(globalThis as any).__triggerNetworkEvent = (online: boolean) => {
  ;(globalThis.navigator as any).onLine = online
  const event = new Event(online ? 'online' : 'offline')
  eventListeners.get(online ? 'online' : 'offline')?.forEach(listener => {
    listener(event)
  })
}

import * as rate from '../lib/http/rateLimit'
vi.spyOn(rate, 'rateLimit').mockResolvedValue(undefined as unknown as void)

import * as gw from '../lib/ai/gateway'
vi.spyOn(gw, 'ask').mockImplementation(async (task: string, payload: any) => {
  if (task === 'generate_question') {
    return { 
      prompt: 'Mock question', 
      difficulty: 'easy', 
      targetDurationMs: 20000 
    } as any
  }
  if (task === 'score') {
    return { 
      questionIndex: payload.questionIndex || 0,
      accuracy: 70, 
      completeness: 70, 
      relevance: 70, 
      timeliness: 70, 
      total: 70,
      rationale: 'Mock scoring rationale' 
    } as any
  }
  if (task === 'summary') {
    return { 
      finalScore: 70, 
      summary: 'Mock interview summary', 
      strengths: ['accuracy', 'completeness'], 
      gaps: ['timeliness'] 
    } as any
  }
  throw new Error(`Unknown task: ${task}`)
})

vi.spyOn(console, 'error').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})