/**
 * JWT Token Management
 * Provides utilities for secure JWT token generation, validation, and refresh
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { UserRole } from './server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'default-secret-change-in-production'
);
const JWT_ISSUER = 'ai-interview-assistant';
const JWT_AUDIENCE = 'ai-interview-assistant-users';

// Token expiration times
const ACCESS_TOKEN_EXPIRATION = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRATION = '7d'; // 7 days

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds until access token expires
}

/**
 * Generate a JWT access token
 */
export async function generateAccessToken(
  userId: string,
  email: string,
  role: UserRole
): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    role,
    type: 'access',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(ACCESS_TOKEN_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate a JWT refresh token
 */
export async function generateRefreshToken(
  userId: string,
  email: string,
  role: UserRole
): Promise<string> {
  const token = await new SignJWT({
    userId,
    email,
    role,
    type: 'refresh',
  } as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(REFRESH_TOKEN_EXPIRATION)
    .sign(JWT_SECRET);

  return token;
}

/**
 * Generate both access and refresh tokens
 */
export async function generateTokenPair(
  userId: string,
  email: string,
  role: UserRole
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId, email, role),
    generateRefreshToken(userId, email, role),
  ]);

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60, // 15 minutes in seconds
  };
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    return payload as unknown as TokenPayload;
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token);
  
  if (!payload || payload.type !== 'access') {
    return null;
  }
  
  return payload;
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<TokenPayload | null> {
  const payload = await verifyToken(token);
  
  if (!payload || payload.type !== 'refresh') {
    return null;
  }
  
  return payload;
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenPair | null> {
  const payload = await verifyRefreshToken(refreshToken);
  
  if (!payload) {
    return null;
  }
  
  // Generate new token pair
  return generateTokenPair(payload.userId, payload.email, payload.role);
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}

/**
 * Check if a token is expired (without verifying signature)
 * Useful for deciding whether to attempt refresh
 */
export function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    // Decode base64 payload in both browser and Node
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = typeof atob === 'function'
      ? atob(b64)
      : Buffer.from(b64, 'base64').toString('utf8');
    const payload = JSON.parse(json);
    const exp = payload.exp;
    
    if (!exp) return true;
    
    return Date.now() >= exp * 1000;
  } catch {
    return true;
  }
}
