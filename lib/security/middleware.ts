/**
 * Security Middleware
 * Centralized security middleware for Next.js
 */

import { NextRequest, NextResponse } from 'next/server';
import { addSecurityHeaders, addCORSHeaders, handlePreflightRequest } from './headers';
import { rateLimit, RateLimits, rateLimitByIP } from './rate-limit';
import { validateRequestSize, MAX_JSON_SIZE } from '../validation/security-schemas';

/**
 * Routes that require rate limiting
 */
const rateLimitedRoutes: Record<string, ReturnType<typeof rateLimit>> = {
  '/api/auth/login': rateLimit(RateLimits.auth),
  '/api/auth/register': rateLimit(RateLimits.auth),
  '/api/auth/refresh': rateLimit(RateLimits.api),
  '/api/process-resume': rateLimit(RateLimits.fileUpload),
  '/api/parse-resume': rateLimit(RateLimits.fileUpload),
  '/api/generate-question': rateLimit(RateLimits.aiGeneration),
  '/api/score-answer': rateLimit(RateLimits.aiGeneration),
};

/**
 * Apply security middleware
 */
export function securityMiddleware(request: NextRequest): NextResponse | null {
  // Handle preflight requests
  const preflightResponse = handlePreflightRequest(request);
  if (preflightResponse) {
    return addSecurityHeaders(preflightResponse);
  }
  
  // Check request size for non-file uploads
  const contentLength = parseInt(request.headers.get('content-length') || '0');
  if (
    contentLength > 0 &&
    !request.url.includes('/process-resume') &&
    !request.url.includes('/parse-resume')
  ) {
    const sizeValidation = validateRequestSize(contentLength);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { error: sizeValidation.error },
        { status: 413 }
      );
    }
  }
  
  // Apply rate limiting
  const pathname = new URL(request.url).pathname;
  for (const [route, limiter] of Object.entries(rateLimitedRoutes)) {
    if (pathname.startsWith(route)) {
      const rateLimitResponse = limiter(request);
      if (rateLimitResponse) {
        return addSecurityHeaders(rateLimitResponse);
      }
    }
  }
  
  // Apply general API rate limiting
  if (pathname.startsWith('/api/')) {
    const apiLimiter = rateLimit(RateLimits.api);
    const rateLimitResponse = apiLimiter(request);
    if (rateLimitResponse) {
      return addSecurityHeaders(rateLimitResponse);
    }
  }
  
  return null; // Allow request to proceed
}

/**
 * Wrap response with security headers
 */
export function wrapWithSecurity(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  let secureResponse = addSecurityHeaders(response);
  secureResponse = addCORSHeaders(request, secureResponse);
  return secureResponse;
}

/**
 * Check if request is from allowed origin
 */
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // Same-origin requests don't have Origin header
  
  // In development, allow localhost
  if (process.env.NODE_ENV !== 'production') {
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return true;
    }
  }
  
  // Check against allowed origins
  const allowedOrigins = [
    'https://ai-interview-assistant.vercel.app',
    'https://ai-interview-assistant.com',
  ];
  
  return allowedOrigins.includes(origin);
}

/**
 * Validate API key (if using API key authentication)
 */
export function validateAPIKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;
  
  const validKeys = process.env.API_KEYS?.split(',') || [];
  return validKeys.includes(apiKey);
}

/**
 * IP allowlist/blocklist
 */
const IP_BLOCKLIST = new Set<string>([
  // Add blocked IPs here
]);

const IP_ALLOWLIST = new Set<string>([
  // Add allowed IPs for restricted routes
]);

/**
 * Check if IP is blocked
 */
export function isIPBlocked(request: NextRequest): boolean {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (!ip) return false;
  
  const clientIP = ip.split(',')[0].trim();
  return IP_BLOCKLIST.has(clientIP);
}

/**
 * Check if IP is allowed for restricted routes
 */
export function isIPAllowed(request: NextRequest, requireAllowlist: boolean = false): boolean {
  if (!requireAllowlist) return true;
  
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (!ip) return false;
  
  const clientIP = ip.split(',')[0].trim();
  return IP_ALLOWLIST.has(clientIP);
}

/**
 * CSRF token validation
 */
export function validateCSRFToken(request: NextRequest): boolean {
  // Skip for GET requests
  if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'OPTIONS') {
    return true;
  }
  
  const token = request.headers.get('x-csrf-token');
  const cookie = request.cookies.get('csrf-token')?.value;
  
  if (!token || !cookie || token !== cookie) {
    return false;
  }
  
  return true;
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}
