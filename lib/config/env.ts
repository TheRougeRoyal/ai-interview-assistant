import { z } from 'zod'

// Helpers
const toBool = (v: unknown, def = false) => {
  if (typeof v === 'boolean') return v
  if (typeof v !== 'string') return def
  const s = v.trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(s)
}

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AI
  AI_VENDOR: z.enum(['openai', 'deepseek', 'mock']).default('mock'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  OPENAI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  // Auth/Security
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be set (>=16 chars)'),
  SESSION_SECRET: z.string().min(16).optional(),
  API_KEYS: z.string().optional(),
  ALLOWED_ORIGINS: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  PORT: z.preprocess(
    v => (v === undefined || v === '' ? 3000 : Number(v)),
    z.number().int().positive()
  ),
  UPLOAD_MAX_MB: z.preprocess(
    v => (v === undefined || v === '' ? 10 : Number(v)),
    z.number().int().positive()
  ),
  MAX_TOKENS: z.preprocess(
    v => (v === undefined || v === '' ? 512 : Number(v)),
    z.number().int().positive()
  ),

  // Cache & Redis
  REDIS_URL: z.string().optional(),
  REDIS_TTL: z.preprocess(
    v => (v === undefined || v === '' ? 3600 : Number(v)),
    z.number().int().positive()
  ),

  // File Upload
  MAX_FILE_SIZE: z.preprocess(
    v => (v === undefined || v === '' ? 10485760 : Number(v)),
    z.number().int().positive()
  ),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx'),
  UPLOAD_DIR: z.string().default('./uploads'),

  // Logging & Monitoring
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional(),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_TRACES_SAMPLE_RATE: z.preprocess(
    v => (v === undefined || v === '' ? 0.1 : Number(v)),
    z.number().min(0).max(1)
  ),

  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.preprocess(
    v => (v === undefined || v === '' ? 587 : Number(v)),
    z.number().int().positive()
  ),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().email().optional(),

  // Feature Flags
  FEATURE_AI_SCORING: z.string().default('true'),
  FEATURE_RESUME_PARSING: z.string().default('true'),
  FEATURE_SESSION_RECORDING: z.string().default('false'),
  FEATURE_EMAIL_NOTIFICATIONS: z.string().default('false'),
  FEATURE_EXPORT_REPORTS: z.string().default('true'),
  FEATURE_BULK_UPLOAD: z.string().default('false'),

  // Legacy toggles
  MOCK_MODE: z.string().optional(),
  NEXT_PUBLIC_PERSIST_TO_API: z.string().optional(),
  NEXT_PUBLIC_SHOW_DEBUG: z.string().optional(),
})

export type AppEnv = z.infer<typeof EnvSchema> & {
  isDev: boolean
  isProd: boolean
  isTest: boolean
  isStaging: boolean
  persistToApi: boolean
  mockMode: boolean
  debugPanel: boolean
  apiKeys: string[]
  allowedOrigins: string[]
}

let cached: AppEnv | null = null

export function getEnv(): AppEnv {
  if (cached) return cached

  const parsed = EnvSchema.safeParse(process.env)
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map(i => `- ${i.path.join('.')}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }

  const base = parsed.data
  const env: AppEnv = {
    ...base,
    isDev: base.NODE_ENV === 'development',
    isProd: base.NODE_ENV === 'production',
    isTest: base.NODE_ENV === 'test',
    isStaging: base.NODE_ENV === 'staging',
    persistToApi: toBool(base.NEXT_PUBLIC_PERSIST_TO_API, false),
    mockMode: toBool(base.MOCK_MODE, base.AI_VENDOR === 'mock'),
    debugPanel: toBool(base.NEXT_PUBLIC_SHOW_DEBUG, false),
    apiKeys: (base.API_KEYS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    allowedOrigins: (base.ALLOWED_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  }

  cached = env
  return env
}

export const env = getEnv()

// Helper functions
export function isDevelopment(): boolean {
  return env.isDev
}

export function isProduction(): boolean {
  return env.isProd
}

export function isTest(): boolean {
  return env.isTest
}

export function isStaging(): boolean {
  return env.isStaging
}
