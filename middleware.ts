/**
 * Root Next.js Middleware
 * Applies security middleware: CORS, CSP headers, rate limiting, request size checks.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { securityMiddleware, wrapWithSecurity } from '@/lib/security/middleware'

export function middleware(request: NextRequest) {
  // Run centralized security checks that may short-circuit
  const blocked = securityMiddleware(request)
  if (blocked) return blocked

  // Continue request and attach security headers
  const response = NextResponse.next()
  return wrapWithSecurity(request, response)
}

export const config = {
  // Apply to API routes and app pages, skip static assets
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|map)$).*)',
  ],
}
