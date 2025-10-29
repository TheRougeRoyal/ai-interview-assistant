import { headers } from 'next/headers'

/** Token bucket for rate limiting */
interface TokenBucket {
  tokens: number
  lastRefill: number
}

/** In-memory storage for rate limit buckets per IP + route */
const buckets = new Map<string, TokenBucket>()

/** Rate limit configuration: 100 requests per minute per route for development */
const TOKENS_PER_MINUTE = 100
const REFILL_INTERVAL_MS = 60 * 1000 // 1 minute
const TOKENS_PER_REFILL = TOKENS_PER_MINUTE

/** Get client IP address from request headers */
async function getClientIP(req: Request): Promise<string> {
  const headersList = await headers()
  const forwardedFor = headersList.get('x-forwarded-for')
  
  if (forwardedFor) {
    // Take the first IP if there are multiple
    return forwardedFor.split(',')[0].trim()
  }
  
  // Fallback to other headers or request IP
  return headersList.get('x-real-ip') ?? 
         headersList.get('cf-connecting-ip') ?? 
         'unknown'
}

/** Refill tokens in bucket based on elapsed time */
function refillBucket(bucket: TokenBucket): void {
  const now = Date.now()
  const timeSinceLastRefill = now - bucket.lastRefill
  
  if (timeSinceLastRefill >= REFILL_INTERVAL_MS) {
    const intervalsElapsed = Math.floor(timeSinceLastRefill / REFILL_INTERVAL_MS)
    const tokensToAdd = intervalsElapsed * TOKENS_PER_REFILL
    
    bucket.tokens = Math.min(TOKENS_PER_MINUTE, bucket.tokens + tokensToAdd)
    bucket.lastRefill = now
  }
}

/** Enforce rate limit for a request - throws if limit exceeded */
export async function rateLimit(req: Request, key: string): Promise<void> {
  const clientIP = await getClientIP(req)
  const bucketKey = `${clientIP}:${key}`
  
  // Get or create bucket for this IP + route combination
  let bucket = buckets.get(bucketKey)
  if (!bucket) {
    bucket = {
      tokens: TOKENS_PER_MINUTE,
      lastRefill: Date.now(),
    }
    buckets.set(bucketKey, bucket)
  }
  
  // Refill tokens based on elapsed time
  refillBucket(bucket)
  
  // Check if request is allowed
  if (bucket.tokens <= 0) {
    throw {
      code: 'RATE_LIMIT',
      message: `Rate limit exceeded. Maximum ${TOKENS_PER_MINUTE} requests per minute per route.`,
    }
  }
  
  // Consume one token
  bucket.tokens--
}
