// API Request/Response Types

export interface ParseResumeRequest {
  file: File
}

export interface ParseResumeResponse {
  fields: {
    name?: string
    email?: string
    phone?: string
  }
  confidence: {
    name: number
    email: number
    phone: number
  }
  resumeMeta: {
    filename: string
    size: number
    mime?: string
  }
  resumeText: string
}

/**
 * Request for generating a question
 * @property questionIndex - 0..5
 * @property role - e.g. 'fullstack'
 * @property resumeContext - optional string
 */
export interface GenerateQuestionRequest {
  questionIndex: number
  role: string
  resumeContext?: string
}

/**
 * Response for generating a question
 * @property prompt - question text
 * @property targetDurationMs - time allowed for answer
 * @property difficulty - inferred from index
 */
export interface GenerateQuestionResponse {
  prompt: string
  targetDurationMs: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ScoreAnswerRequest {
  questionIndex: number
  question: string
  answer: string
  durationMs: number
  timeTakenMs: number
  difficulty: 'easy' | 'medium' | 'hard'
  resumeContext?: string
}

export interface ScoreAnswerResponse {
  questionIndex: number
  accuracy: number
  completeness: number
  relevance: number
  timeliness: number
  total: number
  rationale: string
}

export interface SummaryRequest {
  rubrics: Array<{
    questionIndex: number
    accuracy: number
    completeness: number
    relevance: number
    timeliness: number
    total: number
    rationale: string
  }>
}

export interface SummaryResponse {
  finalScore: number
  summary: string
  strengths: string[]
  gaps: string[]
}

export interface ApiError {
  error: string
  message: string
  code?: string
}
