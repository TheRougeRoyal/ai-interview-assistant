import http from '@/src/lib/http'

export type LoginInput = { email: string; password: string }
export type RegisterInput = { email: string; password: string; role: 'interviewer'|'interviewee'; name?: string; phone?: string }

export function login(body: LoginInput) {
  return http.post<{ user: any; token: string; expiresAt: string }>(`/api/auth/login`, body)
}

export function register(body: RegisterInput) {
  return http.post<{ user: any; token: string; expiresAt: string }>(`/api/auth/register`, body)
}

export function me() {
  return http.get(`/api/auth/me`)
}

export function logout() {
  return http.post(`/api/auth/logout`, {})
}

