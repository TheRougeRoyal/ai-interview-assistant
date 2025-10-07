"use client"
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'

export function useTableState() {
  const sp = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const state = useMemo(() => ({
    page: Number(sp.get('page') ?? '1'),
    limit: Number(sp.get('limit') ?? '20'),
    q: sp.get('q') ?? '',
    sortBy: sp.get('sortBy') ?? undefined,
    order: (sp.get('order') as 'asc'|'desc'|null) ?? undefined,
    cursor: sp.get('cursor') ?? undefined,
  }), [sp])

  function set(next: Partial<Record<string, string | number | undefined>>) {
    const params = new URLSearchParams(sp.toString())
    Object.entries(next).forEach(([k,v]) => {
      if (v === undefined || v === '') params.delete(k)
      else params.set(k, String(v))
    })
    router.replace(`${pathname}?${params.toString()}`)
  }

  return { state, set }
}

