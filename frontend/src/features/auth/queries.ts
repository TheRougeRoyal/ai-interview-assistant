import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { login, logout, me, register, type LoginInput, type RegisterInput } from './api'

export function useSession() {
  return useQuery({ queryKey: ['auth','me'], queryFn: me, retry: false })
}

export function useLogin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => login(input),
    onSuccess: (res) => {
      if (typeof window !== 'undefined') localStorage.setItem('auth-token', res.token)
      qc.invalidateQueries({ queryKey: ['auth','me'] })
    }
  })
}

export function useRegister() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => register(input),
    onSuccess: (res) => {
      if (typeof window !== 'undefined') localStorage.setItem('auth-token', res.token)
      qc.invalidateQueries({ queryKey: ['auth','me'] })
    }
  })
}

export function useLogout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      if (typeof window !== 'undefined') localStorage.removeItem('auth-token')
      qc.invalidateQueries({ queryKey: ['auth','me'] })
    }
  })
}

