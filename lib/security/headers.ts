/**
 * Security Headers Middleware
 * Adds security headers to all responses
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Content Security Policy configuration
 */
function getCSPHeader(nonce: string): string {
  const cspDirectives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.openai.com https://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];
  
  return cspDirectives.join('; ');
}

/**
 * Generate a random nonce for CSP
 */
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Add security headers to response
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  const nonce = generateNonce();
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', getCSPHeader(nonce));
  
  // Prevent XSS attacks
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // HTTPS enforcement
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  
  // Remove server information
  response.headers.delete('X-Powered-By');
  
  // Store nonce for use in HTML
  response.headers.set('X-Nonce', nonce);
  
  return response;
}

/**
 * CORS configuration
 */
export interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders?: string[];
  credentials: boolean;
  maxAge?: number;
}

const productionOrigins = [
  'https://ai-interview-assistant.vercel.app',
  'https://ai-interview-assistant.com',
];

const developmentOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export const corsConfig: CORSConfig = {
  allowedOrigins:
    process.env.NODE_ENV === 'production'
      ? productionOrigins
      : [...productionOrigins, ...developmentOrigins],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  credentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Add CORS headers to response
 */
export function addCORSHeaders(
  request: NextRequest,
  response: NextResponse,
  config: CORSConfig = corsConfig
): NextResponse {
  const origin = request.headers.get('origin');
  
  // Check if origin is allowed
  if (origin && config.allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (
    origin &&
    (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'))
  ) {
    // Allow localhost for development
    if (process.env.NODE_ENV !== 'production') {
      response.headers.set('Access-Control-Allow-Origin', origin);
    }
  }
  
  response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  
  if (config.exposedHeaders) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }
  
  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }
  
  if (config.maxAge) {
    response.headers.set('Access-Control-Max-Age', config.maxAge.toString());
  }
  
  return response;
}

/**
 * Handle preflight requests
 */
export function handlePreflightRequest(request: NextRequest): NextResponse | null {
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return addCORSHeaders(request, response);
  }
  return null;
}
