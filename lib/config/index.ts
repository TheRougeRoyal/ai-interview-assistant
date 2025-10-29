/**
 * Application Configuration
 * Centralized configuration with environment-based defaults
 */

import { env } from './env';

/**
 * Application configuration
 */
export const config = {
  // Application Info
  app: {
    name: 'AI Interview Assistant',
    version: '1.0.0',
    url: env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: env.NODE_ENV,
  },
  
  // Server Configuration
  server: {
    port: env.PORT,
    hostname: '0.0.0.0',
  },
  
  // Database Configuration
  database: {
    url: env.DATABASE_URL,
    poolSize: env.isProd ? 10 : 5,
    connectionTimeout: 30000,
  },
  
  // AI Configuration
  ai: {
    vendor: env.AI_VENDOR,
    model: env.AI_MODEL,
    apiKey: env.OPENAI_API_KEY,
    mockMode: env.mockMode,
    timeout: 30000,
    maxRetries: 3,
    temperature: 0.7,
    maxTokens: env.MAX_TOKENS,
  },
  
  // Authentication Configuration
  auth: {
    jwtSecret: env.JWT_SECRET,
    sessionSecret: env.SESSION_SECRET,
    accessTokenExpiry: 15 * 60, // 15 minutes
    refreshTokenExpiry: 7 * 24 * 60 * 60, // 7 days
    maxSessions: 5,
    sessionTimeout: 24 * 60 * 60, // 24 hours
  },
  
  // Security Configuration
  security: {
    allowedOrigins: env.allowedOrigins,
    apiKeys: env.apiKeys,
    csrfEnabled: env.isProd,
    corsEnabled: true,
    helmetEnabled: env.isProd,
  },
  
  // Rate Limiting Configuration
  rateLimit: {
    enabled: true,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: env.isDev ? 1000 : 100, // requests per window
    auth: {
      windowMs: 15 * 60 * 1000,
      max: 5,
    },
    api: {
      windowMs: 60 * 1000,
      max: env.isDev ? 1000 : 60,
    },
    fileUpload: {
      windowMs: 60 * 1000,
      max: 5,
    },
  },
  
  // Cache Configuration
  cache: {
    enabled: true,
    redisUrl: env.REDIS_URL,
    ttl: env.REDIS_TTL,
    maxItems: 1000,
    checkPeriod: 60, // seconds
  },
  
  // File Upload Configuration
  fileUpload: {
    maxSize: env.MAX_FILE_SIZE,
    allowedTypes: env.ALLOWED_FILE_TYPES.split(',').map((t: string) => t.trim()),
    uploadDir: env.UPLOAD_DIR,
    tempDir: './tmp',
  },
  
  // Logging Configuration
  logging: {
    level: env.LOG_LEVEL,
    prettyPrint: env.isDev,
    redact: env.isProd ? ['password', 'token', 'apiKey', 'secret'] : [],
  },
  
  // Monitoring Configuration
  monitoring: {
    sentry: {
      enabled: !!env.SENTRY_DSN,
      dsn: env.SENTRY_DSN,
      environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
      tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
    },
  },
  
  // Email Configuration
  email: {
    enabled: env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASSWORD,
      },
    },
    from: env.SMTP_FROM || 'noreply@example.com',
  },
  
  // Interview Configuration
  interview: {
    questionTimeLimit: 2 * 60 * 1000, // 2 minutes per question
    totalTimeLimit: 30 * 60 * 1000, // 30 minutes total
    minQuestions: 3,
    maxQuestions: 10,
    defaultQuestions: 6,
    difficulties: ['easy', 'medium', 'hard'] as const,
  },
  
  // Pagination Configuration
  pagination: {
    defaultPageSize: 10,
    maxPageSize: 100,
  },
  
  // Session Configuration
  session: {
    autoSaveInterval: 30000, // 30 seconds
    recoveryEnabled: true,
    maxRecoveryAge: 24 * 60 * 60 * 1000, // 24 hours
  },
} as const;

/**
 * Validate configuration
 */
export function validateConfig(): void {
  // Validate AI configuration
  if (config.ai.vendor === 'openai' && !config.ai.apiKey && !config.ai.mockMode) {
    throw new Error('OPENAI_API_KEY is required when AI_VENDOR=openai and MOCK_MODE=false');
  }
  
  // Validate email configuration
  if (config.email.enabled && !config.email.smtp.host) {
    throw new Error('SMTP configuration is required when email is enabled');
  }
  
  // Validate security configuration
  if (env.isProd && config.security.allowedOrigins.includes('*')) {
    console.warn('⚠️  Warning: CORS configured to allow all origins in production');
  }
}

/**
 * Print configuration (safe - no secrets)
 */
export function printFullConfig(): void {
  console.log('🔧 Full Application Configuration:');
  console.log('');
  console.log('App:', {
    name: config.app.name,
    version: config.app.version,
    environment: config.app.environment,
  });
  console.log('');
  console.log('Server:', config.server);
  console.log('');
  console.log('AI:', {
    vendor: config.ai.vendor,
    model: config.ai.model,
    mockMode: config.ai.mockMode,
  });
  console.log('');
  console.log('Cache:', {
    enabled: config.cache.enabled,
    ttl: config.cache.ttl,
  });
  console.log('');
  console.log('Rate Limiting:', {
    enabled: config.rateLimit.enabled,
    max: config.rateLimit.max,
  });
  console.log('');
}

export default config;
