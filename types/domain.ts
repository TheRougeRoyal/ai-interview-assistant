export interface Candidate {
  id: string
  profile: {
    name: string
    email: string
    phone: string
  }
  finalScore: number
  summary: string
  strengths: string[]
  gaps: string[]
  createdAt: number
  completedAt: number
}

export interface Question {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  prompt: string
  targetDuration: number // in seconds
}

export interface Answer {
  questionId: string
  text: string
  submittedAt: number
  timeTakenMs: number
  rubric?: Rubric
}

export interface Rubric {
  accuracy: number // 0-100
  completeness: number // 0-100
  relevance: number // 0-100
  timeliness: number // 0-100
  total: number // 0-100
  rationale: string
}

export type InterviewStage = 'collecting_profile' | 'interviewing' | 'completed'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface CandidateSession {
  id: string
  answers: any[]
  createdAt: string
}

export interface CandidatePreview {
  id: string
  name: string
  email: string
  phone: string
  finalScore?: number
  status: 'completed' | 'in_progress' | 'not_started'
  updatedAt: string
  skills?: { technical?: string[] }
  qualityScore?: number | null
  sessions?: CandidateSession[]
}