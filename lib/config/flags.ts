import { z } from 'zod'

const toBool = (v: unknown, def = false) => {
  if (typeof v === 'boolean') return v
  if (typeof v !== 'string') return def
  const s = v.trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(s)
}

const FlagsSchema = z.object({
  // Client-visible flags MUST be prefixed with NEXT_PUBLIC_
  NEXT_PUBLIC_FEATURE_ENHANCED_UI: z.string().optional(),
  NEXT_PUBLIC_FEATURE_SESSION_RECOVERY: z.string().optional(),
  NEXT_PUBLIC_FEATURE_STRICT_TIMERS: z.string().optional(),
  NEXT_PUBLIC_FEATURE_MOCK_AI: z.string().optional(),

  // Server-side flags
  FEATURE_RATE_LIMITING: z.string().optional(),
  FEATURE_CSP_REPORTS: z.string().optional(),
})

export type FeatureFlags = {
  enhancedUI: boolean
  sessionRecovery: boolean
  strictTimers: boolean
  mockAI: boolean
  rateLimiting: boolean
  cspReports: boolean
}

let cached: FeatureFlags | null = null

export function getFlags(): FeatureFlags {
  if (cached) return cached

  const parsed = FlagsSchema.safeParse(process.env)
  if (!parsed.success) {
    // Non-fatal: default to safe values
    cached = {
      enhancedUI: false,
      sessionRecovery: false,
      strictTimers: true,
      mockAI: false,
      rateLimiting: true,
      cspReports: false,
    }
    return cached
  }

  const env = parsed.data
  cached = {
    enhancedUI: toBool(env.NEXT_PUBLIC_FEATURE_ENHANCED_UI, false),
    sessionRecovery: toBool(env.NEXT_PUBLIC_FEATURE_SESSION_RECOVERY, true),
    strictTimers: toBool(env.NEXT_PUBLIC_FEATURE_STRICT_TIMERS, true),
    mockAI: toBool(env.NEXT_PUBLIC_FEATURE_MOCK_AI, false),
    rateLimiting: toBool(env.FEATURE_RATE_LIMITING, true),
    cspReports: toBool(env.FEATURE_CSP_REPORTS, false),
  }
  return cached
}

export const flags = getFlags()
