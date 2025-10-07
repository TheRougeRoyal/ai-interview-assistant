/**
 * Timer utility functions for interview questions
 */

export const nowMs = (): number => Date.now()

export const deadlineMs = (startedAt: number, durationMs: number): number => 
  startedAt + durationMs

export const remainingMs = (startedAt: number, durationMs: number): number => 
  Math.max(0, deadlineMs(startedAt, durationMs) - nowMs())

export const isExpired = (startedAt: number, durationMs: number): boolean => 
  remainingMs(startedAt, durationMs) <= 0
