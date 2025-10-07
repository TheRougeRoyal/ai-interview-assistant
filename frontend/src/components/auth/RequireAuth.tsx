"use client"
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSession } from '@/src/features/auth/queries'

export default function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { data, error, isLoading } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const unauthorized = (error && (error as any).response && ((error as any).response.status === 401 || (error as any).response.status === 403))
    if (unauthorized) {
      const next = encodeURIComponent(pathname || '/')
      router.replace(`/signin?next=${next}`)
    }
  }, [error, router, pathname])

  if (isLoading) return null
  if (roles && data && (data as any).role && !roles.includes((data as any).role)) return null
  return <>{children}</>
}

