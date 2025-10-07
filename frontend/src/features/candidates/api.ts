import http from '@/src/lib/http'
import type { Candidate, CandidateListResponse } from './types'
import type { CandidateCreateInput } from './schemas'

export type ListParams = {
  q?: string
  limit?: number
  cursor?: string
  sortBy?: 'finalScore' | 'createdAt'
  order?: 'asc' | 'desc'
}

export function listCandidates(params: ListParams) {
  return http.get<CandidateListResponse>('/api/candidates', { params })
}

export function createCandidate(body: CandidateCreateInput) {
  return http.post<Candidate>('/api/candidates', body)
}

export function getCandidate(id: string) {
  return http.get<Candidate>(`/api/candidates/${id}`)
}

export function updateCandidate(id: string, body: Partial<Candidate>) {
  return http.patch<Candidate>(`/api/candidates/${id}`)
}

