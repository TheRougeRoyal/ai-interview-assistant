import { ask } from '@/lib/ai/gateway'
import { SummaryInput } from '@/lib/http/validation'
import { rateLimit } from '@/lib/http/rateLimit'
import { json, handleApiError } from '@/lib/http/errors'

/** Generate interview summary from multiple rubric scores */
export async function POST(req: Request) {
  try {
    // Rate limiting: 10 requests per minute per IP
    await rateLimit(req, 'summary')
    
    // Parse and validate request body
    const body = await req.json()
    const validatedInput = SummaryInput.parse(body)
    
    // Call AI gateway to generate summary
    const result = await ask('summary', validatedInput)
    
    // Transform gap (string) to gaps (string[]) to match expected API response
    return json(200, {
      ...result,
      gaps: [result.gap]
    })
  } catch (e) {
    return handleApiError(e)
  }
}
