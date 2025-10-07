import { json, handleApiError } from '@/lib/http/errors'

/** Health check endpoint - returns AI vendor and model information */
export async function GET() {
  try {
    return json(200, {
      ok: true,
      vendor: process.env.AI_VENDOR ?? 'mock',
      model: process.env.AI_MODEL ?? 'gpt-4o-mini',
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return handleApiError(e)
  }
}