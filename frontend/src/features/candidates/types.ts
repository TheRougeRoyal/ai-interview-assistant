export type Candidate = {
  id: string
  name: string
  email: string
  phone?: string | null
  resumeFile?: string | null
  resumeMime?: string | null
  resumeSize?: number | null
  resumeText?: string | null
  finalScore?: number | null
  summary?: string | null
  strengths?: string[] | null
  gap?: string | null
  skills?: {
    technical?: string[]
    soft?: string[]
    languages?: string[]
    frameworks?: string[]
    tools?: string[]
    certifications?: string[]
    domains?: string[]
  } | null
  experienceYears?: number | null
  seniorityLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive' | null
  qualityScore?: number | null
  aiSummary?: string | null
  aiStrengths?: string[] | null
  createdAt: string
  updatedAt: string
}

export type CandidateListResponse = {
  items: Candidate[]
  nextCursor: string | null
}

