import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createCandidate, getCandidate, listCandidates, updateCandidate, type ListParams } from './api'

export function useCandidateList(params: ListParams) {
  return useQuery({
    queryKey: ['candidates','list', params],
    queryFn: () => listCandidates(params),
    staleTime: 10_000,
    keepPreviousData: true,
  })
}

export function useCandidate(id: string) {
  return useQuery({
    queryKey: ['candidates', id],
    queryFn: () => getCandidate(id),
    enabled: !!id,
  })
}

export function useCreateCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates','list'] })
    }
  })
}

export function useUpdateCandidate(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof updateCandidate>[1]) => updateCandidate(id, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidates','list'] })
      qc.invalidateQueries({ queryKey: ['candidates', id] })
    }
  })
}

