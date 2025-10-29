# Environment Variables Configuration Guide

This document describes all environment variables used across different deployment stages.

## 📋 Quick Start

Copy the appropriate example file for your environment:

```bash
# Development
cp .env.example .env.local

# Staging
cp .env.staging.example .env.staging

# Production
cp .env.production.example .env.production
```

## 🔐 Required Variables (All Environments)

### Database
```env
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```
- **Development**: Local PostgreSQL or SQLite
- **Staging**: Cloud database (e.g., Supabase, Railway)
- **Production**: Managed PostgreSQL (e.g., AWS RDS, Google Cloud SQL)

### Authentication & Security
```env
JWT_SECRET="your-secret-key-min-32-chars"
SESSION_SECRET="your-session-secret-min-32-chars"
NEXTAUTH_SECRET="your-nextauth-secret"
NEXTAUTH_URL="https://your-domain.com"
```

**Generate secrets:**
```bash
# JWT Secret
openssl rand -base64 32

# Session Secret
openssl rand -base64 32

# NextAuth Secret
openssl rand -base64 32
```

### AI Configuration
```env
AI_VENDOR="openai"  # or "mock" for testing
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"  # or "gpt-4", "gpt-3.5-turbo"
```

## 🌍 Environment-Specific Variables

### Development (.env.local)
```env
# App
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Database
DATABASE_URL="file:./prisma/dev.db"  # SQLite for local dev

# AI (use mock to avoid API costs)
AI_VENDOR="mock"
MOCK_MODE="true"

# Debug
DEBUG="true"
LOG_LEVEL="debug"
```

### Staging (.env.staging)
```env
# App
NODE_ENV="staging"
NEXT_PUBLIC_APP_URL="https://staging.your-domain.com"

# Database (cloud)
DATABASE_URL="postgresql://..."

# AI (real API)
AI_VENDOR="openai"
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"

# Security
JWT_SECRET="..."
SESSION_SECRET="..."
ALLOWED_ORIGINS="https://staging.your-domain.com"

# Feature Flags
FEATURE_AI_SCORING="true"
FEATURE_RESUME_PARSING="true"
FEATURE_SESSION_RECORDING="true"

# Monitoring
LOG_LEVEL="info"
SENTRY_DSN="https://...@sentry.io/..."
```

### Production (.env.production)
```env
# App
NODE_ENV="production"
NEXT_PUBLIC_APP_URL="https://your-domain.com"

# Database (production)
DATABASE_URL="postgresql://..."

# AI
AI_VENDOR="openai"
OPENAI_API_KEY="sk-..."
AI_MODEL="gpt-4o-mini"

# Security
JWT_SECRET="..."
SESSION_SECRET="..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="https://your-domain.com"
ALLOWED_ORIGINS="https://your-domain.com"
API_KEYS="key1,key2,key3"  # Comma-separated

# Rate Limiting (Redis recommended)
REDIS_URL="redis://:password@host:6379"

# Feature Flags
FEATURE_AI_SCORING="true"
FEATURE_RESUME_PARSING="true"
FEATURE_SESSION_RECORDING="false"

# Monitoring & Logging
LOG_LEVEL="warn"
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ENVIRONMENT="production"

# Email (for notifications)
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASSWORD="..."
SMTP_FROM="noreply@your-domain.com"
```

## 🎯 Optional Variables

### Supabase Authentication
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
```

### Redis Cache
```env
REDIS_URL="redis://:password@host:6379"
REDIS_TTL="3600"  # Cache TTL in seconds
```

### File Upload
```env
MAX_FILE_SIZE="10485760"  # 10MB in bytes
ALLOWED_FILE_TYPES="pdf,doc,docx"
UPLOAD_DIR="./uploads"
```

### Email Notifications
```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASSWORD="your-app-password"
SMTP_FROM="noreply@your-domain.com"
```

### Analytics & Monitoring
```env
# Google Analytics
NEXT_PUBLIC_GA_ID="G-XXXXXXXXXX"

# Sentry Error Tracking
SENTRY_DSN="https://...@sentry.io/..."
SENTRY_ENVIRONMENT="production"
SENTRY_TRACES_SAMPLE_RATE="0.1"

# LogRocket
LOGROCKET_APP_ID="your-app-id"
```

### Feature Flags
```env
FEATURE_AI_SCORING="true"
FEATURE_RESUME_PARSING="true"
FEATURE_SESSION_RECORDING="false"
FEATURE_EMAIL_NOTIFICATIONS="false"
FEATURE_EXPORT_REPORTS="true"
FEATURE_BULK_UPLOAD="false"
```

## 🔒 Security Best Practices

1. **Never commit `.env` files to Git**
   - Already in `.gitignore`
   - Use `.env.example` for documentation

2. **Use strong secrets**
   - Minimum 32 characters
   - Generate with `openssl rand -base64 32`

3. **Rotate secrets regularly**
   - Production: Every 90 days
   - Staging: Every 180 days

4. **Use environment-specific values**
   - Different databases per environment
   - Different API keys per environment

5. **Validate on startup**
   - Use Zod schemas to validate env vars
   - See `lib/config/env.ts` for validation

## 🚀 Deployment Platforms

### Vercel
Set environment variables in Project Settings → Environment Variables:
- Production: `main` branch
- Preview: `develop` branch
- Development: Local only

### Docker
Use `.env` file or pass via `docker-compose.yml`:
```yaml
environment:
  - DATABASE_URL=${DATABASE_URL}
  - JWT_SECRET=${JWT_SECRET}
```

### Kubernetes
Use ConfigMaps for non-sensitive data:
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NODE_ENV: production
  AI_VENDOR: openai
```

Use Secrets for sensitive data:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  DATABASE_URL: <base64-encoded>
  JWT_SECRET: <base64-encoded>
```

## 📝 Validation

Environment variables are validated on application startup using Zod schemas in `lib/config/env.ts`.

Missing or invalid variables will prevent the application from starting.

## 🆘 Troubleshooting

### Missing DATABASE_URL
```bash
# Check your .env.local file exists
ls -la .env.local

# Ensure DATABASE_URL is set
cat .env.local | grep DATABASE_URL
```

### Invalid JWT_SECRET
```bash
# Generate new secret
openssl rand -base64 32

# Add to .env.local
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### CORS Errors
```bash
# Ensure ALLOWED_ORIGINS matches your frontend URL
echo "ALLOWED_ORIGINS=http://localhost:3000" >> .env.local
```

## 📚 References

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Docker Environment Variables](https://docs.docker.com/compose/environment-variables/)
