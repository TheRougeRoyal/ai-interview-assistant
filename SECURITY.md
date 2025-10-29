# Security Implementation Guide

## Overview

This document describes the security measures implemented in the AI Interview Assistant application as part of Task 8 (Enhance security and authentication).

## Components

### 8.1 Enhanced Authentication System

#### JWT Token Management (`lib/auth/jwt.ts`)

- **Access Tokens**: Short-lived (15 minutes) tokens for API authentication
- **Refresh Tokens**: Long-lived (7 days) tokens for obtaining new access tokens
- **Token Pair Generation**: Secure generation of both tokens simultaneously
- **Token Verification**: Validation with issuer and audience claims
- **Token Refresh**: Automatic refresh mechanism using refresh tokens

**Usage:**
```typescript
import { generateTokenPair, verifyAccessToken, refreshAccessToken } from '@/lib/auth/jwt';

// Generate tokens on login
const tokens = await generateTokenPair(userId, email, role);

// Verify access token
const payload = await verifyAccessToken(accessToken);

// Refresh tokens
const newTokens = await refreshAccessToken(refreshToken);
```

#### Session Management (`lib/auth/session-manager.ts`)

- **Session Storage**: Database-backed session storage with Prisma
- **Session Tracking**: IP address and user agent tracking
- **Activity Monitoring**: Last activity timestamp updates
- **Session Limits**: Enforce maximum concurrent sessions per user (default: 5)
- **Automatic Cleanup**: Remove expired and inactive sessions

**Features:**
- Create/read/update/delete sessions
- Session refresh with new tokens
- Bulk session operations (delete all user sessions)
- Cleanup expired sessions (cron job recommended)
- Cleanup inactive sessions (30 days default)

#### Role-Based Access Control (`lib/auth/rbac.ts`)

- **Permission System**: Fine-grained permissions for different roles
- **Role Definitions**: Interviewer and Interviewee roles with distinct permissions
- **Resource Ownership**: Check if user can access specific resources
- **Permission Helpers**: requirePermission, hasPermission, hasAllPermissions

**Permissions:**
- Interviewee: view/edit own profile, upload resume, start interview, submit answers, view results
- Interviewer: view all candidates, score answers, generate questions, export reports, view analytics

**Usage:**
```typescript
import { hasPermission, Permission, requirePermission } from '@/lib/auth/rbac';

// Check permission
if (hasPermission(userRole, Permission.VIEW_ALL_CANDIDATES)) {
  // Allow access
}

// Require permission (throws error if not authorized)
requirePermission(Permission.SCORE_ANSWERS)(userRole);
```

#### API Routes

- **POST /api/auth/token**: Login and obtain JWT tokens
- **POST /api/auth/refresh**: Refresh access token using refresh token
- **POST /api/auth/logout**: Logout and invalidate session

### 8.2 Input Validation (`lib/validation/security-schemas.ts`)

#### Security-Enhanced Schemas

All input validation uses Zod schemas with additional security measures:

**Email Validation:**
- RFC 5322 compliant regex
- Length limits (5-255 characters)
- Lowercase transformation
- Trim whitespace

**Password Requirements:**
- Minimum 8 characters, maximum 128
- Must contain: lowercase, uppercase, number, special character
- No common passwords (extend with password strength library)

**File Upload Validation:**
- Maximum size: 10MB (configurable)
- Allowed types: PDF, DOC, DOCX
- Filename sanitization
- Extension verification
- Path traversal prevention

**Text Content:**
- XSS prevention through sanitization
- Length limits (10,000 characters default)
- Remove dangerous characters (<, >, javascript:, event handlers)

**Request Limits:**
- Maximum JSON body size: 1MB
- Maximum file size: 10MB
- Request timeout: 30 seconds
- Pagination limits: max 100 items per page

#### Sanitization Functions

```typescript
import { sanitizeString, sanitizeFilename, validateFile } from '@/lib/validation/security-schemas';

// Sanitize user input
const clean = sanitizeString(userInput);

// Sanitize filename
const safeFilename = sanitizeFilename(uploadedFile.name);

// Validate file upload
const validation = validateFile(file, {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['application/pdf'],
  allowedExtensions: ['.pdf'],
});
```

### 8.3 Security Headers and Protection

#### Security Headers (`lib/security/headers.ts`)

**Content Security Policy (CSP):**
- Prevents XSS attacks
- Nonce-based script execution
- Strict dynamic loading
- Frame ancestors blocked
- Upgrade insecure requests

**Other Headers:**
- `X-Content-Type-Options`: nosniff
- `X-Frame-Options`: DENY
- `X-XSS-Protection`: 1; mode=block
- `Strict-Transport-Security`: HSTS with preload
- `Referrer-Policy`: strict-origin-when-cross-origin
- `Permissions-Policy`: Restrict camera, microphone, geolocation

**CORS Configuration:**
- Environment-based allowed origins
- Production: specific domains only
- Development: localhost allowed
- Credentials support
- Preflight caching (24 hours)

#### Rate Limiting (`lib/security/rate-limit.ts`)

**Multi-tier Rate Limiting:**
- Per-IP rate limiting for anonymous users
- Per-user rate limiting for authenticated users
- Separate limits for different endpoint types

**Rate Limit Configurations:**

| Endpoint Type | Window | Max Requests |
|--------------|--------|--------------|
| Authentication | 15 min | 5 |
| General API | 1 min | 60 |
| File Upload | 1 min | 5 |
| AI Generation | 1 min | 10 |
| Strict Operations | 1 hour | 10 |

**Features:**
- In-memory store (use Redis in production)
- Automatic cleanup of expired entries
- Custom key generators
- Tiered limits for auth/anon users
- Standard rate limit headers (X-RateLimit-*)

**Usage:**
```typescript
import { rateLimit, RateLimits } from '@/lib/security/rate-limit';

// Apply rate limit to route
const limiter = rateLimit(RateLimits.auth);
const response = limiter(request);
if (response) return response; // Rate limit exceeded
```

#### Security Middleware (`lib/security/middleware.ts`)

Centralized middleware that applies all security measures:

1. CORS and preflight handling
2. Request size validation
3. Route-specific rate limiting
4. Security headers injection
5. IP blocking/allowing
6. CSRF token validation (for state-changing requests)

**Middleware Flow:**
```
Request → Preflight Check → Size Validation → Rate Limiting → 
Security Headers → CORS → IP Validation → CSRF → Route Handler
```

## Database Schema Updates

Updated `UserSession` model in `prisma/schema.prisma`:

```prisma
model UserSession {
  id             String   @id @default(cuid())
  userId         String
  token          String   @unique
  refreshToken   String   @unique
  expiresAt      DateTime
  lastActivityAt DateTime @default(now())
  ipAddress      String?
  userAgent      String?
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
  @@index([refreshToken])
  @@index([userId])
  @@index([expiresAt])
}
```

## Environment Variables

Add these to your `.env` file:

```bash
# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your-secure-random-secret-here

# API Keys (comma-separated for multiple keys)
API_KEYS=key1,key2,key3

# CORS Origins (production)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Node Environment
NODE_ENV=production
```

## Migration Steps

1. **Install Dependencies:**
```bash
npm install jose
```

2. **Update Database Schema:**
```bash
npx prisma db push
# or for production:
npx prisma migrate deploy
```

3. **Set Environment Variables:**
```bash
# Generate JWT secret
openssl rand -base64 32

# Add to .env
echo "JWT_SECRET=<your-generated-secret>" >> .env
```

4. **Update Middleware:**
Add security middleware to your root `middleware.ts` file.

5. **Test Security:**
- Run security tests
- Test rate limiting
- Verify CORS configuration
- Check CSP headers

## Security Best Practices

### Production Checklist

- [ ] Set strong `JWT_SECRET` (32+ characters, random)
- [ ] Use Redis for rate limiting store
- [ ] Enable HTTPS only
- [ ] Configure proper CORS origins
- [ ] Set up session cleanup cron job
- [ ] Monitor rate limit violations
- [ ] Implement audit logging
- [ ] Regular security audits
- [ ] Keep dependencies updated
- [ ] Use environment-specific configurations

### Session Management

- Maximum 5 concurrent sessions per user
- 15-minute access token expiration
- 7-day refresh token expiration
- Automatic cleanup of expired sessions
- Track IP and user agent for fraud detection

### Rate Limiting

- Use Redis in production for distributed rate limiting
- Monitor rate limit metrics
- Adjust limits based on usage patterns
- Implement exponential backoff for repeated violations
- Log rate limit violations for security monitoring

### CORS Configuration

- Never use `*` for allowed origins in production
- Explicitly list allowed domains
- Use credentials: true only when necessary
- Set appropriate maxAge for preflight caching

### Input Validation

- Always validate and sanitize user input
- Use Zod schemas for all API endpoints
- Implement file type verification
- Limit file sizes appropriately
- Sanitize filenames before storage

## Testing

### Security Tests

```bash
# Run security-focused tests
npm run test:security

# Test rate limiting
npm run test:rate-limit

# Test authentication flow
npm run test:auth
```

### Manual Testing

1. **Authentication:**
   - Login with valid credentials
   - Attempt login with invalid credentials (should be rate limited after 5 attempts)
   - Refresh tokens
   - Logout and verify session deletion

2. **Rate Limiting:**
   - Make rapid requests to test rate limits
   - Verify 429 responses with Retry-After headers
   - Test different endpoint types

3. **CORS:**
   - Test from allowed origin
   - Test from disallowed origin (should be blocked)
   - Verify preflight requests

4. **Input Validation:**
   - Submit invalid data to endpoints
   - Test file upload with oversized files
   - Test XSS payloads (should be sanitized)

## Monitoring

### Metrics to Track

- Failed login attempts
- Rate limit violations
- Session creation/deletion
- Token refresh frequency
- CORS violations
- Invalid input attempts

### Alerts

Set up alerts for:
- Unusual number of failed logins
- Rate limit violations from single IP
- Suspicious session activity
- Large number of token refreshes

## Support

For security concerns or vulnerabilities, please contact: security@example.com

## Changelog

- **v1.0.0** (2025-10-26): Initial security implementation
  - JWT token management
  - Session management with cleanup
  - RBAC with fine-grained permissions
  - Comprehensive input validation
  - Security headers (CSP, CORS, etc.)
  - Multi-tier rate limiting
  - Security middleware integration
