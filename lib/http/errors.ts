import { normalizeError } from '@/lib/ai/gateway'

/** Create a JSON response with status code and body */
export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/** Handle API errors with proper status codes and normalized error format */
export function handleApiError(e: unknown): Response {
  const error = normalizeError(e)
  
  let status: number
  
  switch (error.code) {
    case 'SCHEMA_VALIDATION_FAILED':
      status = 422
      break
    case 'OPENAI_ERROR':
      status = 502
      break
    case 'RATE_LIMIT':
      status = 429
      break
    default:
      status = 500
      break
  }
  
  return json(status, {
    error: {
      code: error.code,
      message: error.message,
    },
  })
}
