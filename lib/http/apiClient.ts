const PERSIST_TO_API = process.env.NEXT_PUBLIC_PERSIST_TO_API === 'true'

interface CreateCandidateInput {
  name: string
  email: string
  phone: string
  resumeMeta?: {
    filename: string
    size: number
    mime: string
  }
  resumeText?: string
}

interface CreateSessionInput {
  candidateId: string
  plan: Array<{
    index: number
    difficulty: 'easy' | 'medium' | 'hard'
    targetDurationMs: number
  }>
}

interface UpsertAnswerInput {
  questionIndex: number
  difficulty: string
  question: string
  answerText?: string
  durationMs: number
  timeTakenMs?: number
  rubric?: {
    accuracy: number
    completeness: number
    relevance: number
    timeliness: number
    total: number
    rationale: string
  }
  submittedAt: string
}

interface FinalizeCandidateInput {
  id: string
  finalScore: number
  summary: string
  strengths: string[]
  gap: string
}

export class APIError extends Error {
  constructor(public code: number, message: string) {
    super(message)
    this.name = 'APIError'
  }
}

export async function fetchAPI(url: string, options: RequestInit = {}) {
  // Try to attach Supabase access token when available (browser only)
  let authHeader: Record<string, string> = {}
  if (typeof window !== 'undefined') {
    try {
      const { getSupabaseBrowserClient } = await import('@/lib/supabase/client')
      const supabase = getSupabaseBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = data?.session?.access_token
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` }
      }
    } catch {
      // ignore if supabase not configured
    }
  }
  let response: Response
  try {
    response = await fetch(url, {
      // Always include credentials for cookie-based auth from browser
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
        ...options.headers,
      },
      ...options,
    })
  } catch (e) {
    // Network error (e.g., tab regain causing cancelled fetch, offline, CORS)
    throw new APIError(0, 'Network error')
  }

  if (!response.ok) {
    let errorBody: any = null
    try {
      errorBody = await response.json()
    } catch {
      try {
        const text = await response.text()
        errorBody = { message: text || 'Request failed' }
      } catch {
        errorBody = { message: 'Request failed' }
      }
    }
    // Prefer top-level message, then nested error.message, then fallback
    const message =
      (errorBody && typeof errorBody === 'object' && 'message' in errorBody && (errorBody as any).message) ||
      (errorBody && typeof errorBody === 'object' && 'error' in errorBody && (errorBody as any).error?.message) ||
      'Request failed'

    throw new APIError(response.status, message)
  }

  return response.json()
}

export async function createCandidate(input: CreateCandidateInput) {
  if (!PERSIST_TO_API) {
    return {
      id: `candidate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...input,
      createdAt: new Date().toISOString(),
    }
  }

  return fetchAPI('/api/candidates', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function createSession(input: CreateSessionInput) {
  if (!PERSIST_TO_API) {
    return {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...input,
      createdAt: new Date().toISOString(),
    }
  }

  return fetchAPI('/api/sessions', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export async function upsertAnswer(sessionId: string, input: UpsertAnswerInput) {
  if (!PERSIST_TO_API) {
    return {
      id: `answer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      ...input,
    }
  }

  try {
    return await fetchAPI(`/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  } catch (error) {
    if (error instanceof APIError && error.code === 409) {
      return { success: true }
    }
    throw error
  }
}

export async function finalizeCandidate(input: FinalizeCandidateInput) {
  if (!PERSIST_TO_API) {
    return {
      ...input,
      updatedAt: new Date().toISOString(),
    }
  }

  return fetchAPI(`/api/candidates/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
}

export { PERSIST_TO_API }