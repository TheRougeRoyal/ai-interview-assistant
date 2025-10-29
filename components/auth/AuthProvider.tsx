'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { fetchCurrentUser, setInitialized } from '@/store/slices/auth'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { RootState, AppDispatch } from '@/store'

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { user, isInitialized, isLoading } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    // Try to fetch current user on app start
    if (!isInitialized && !isLoading) {
      dispatch(fetchCurrentUser()).finally(() => {
        dispatch(setInitialized())
      })
    }
  }, [dispatch, isInitialized, isLoading])

  useEffect(() => {
    // Keep Redux user in sync with Supabase auth state changes
    const supabase = getSupabaseBrowserClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      dispatch(fetchCurrentUser())
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [dispatch])

  // Show loading while checking authentication
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}