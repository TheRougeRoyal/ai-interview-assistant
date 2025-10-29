'use client'

import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { RootState } from '@/store'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('interviewer' | 'interviewee')[]
  redirectTo?: string
}

export default function ProtectedRoute({ 
  children, 
  allowedRoles, 
  redirectTo = '/auth/login' 
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, isInitialized } = useSelector((state: RootState) => state.auth)
  useEffect(() => {
    if (!isInitialized) return

    // If no user, force login
    if (!user) {
      router.push(redirectTo)
      return
    }

    // If user exists but doesn't have allowed role, don't auto-redirect here.
    // We render an inline Access Denied UI below so the user isn't bounced around.
  }, [user, isInitialized, router, redirectTo])

  // Don't render anything until initialized
  if (!isInitialized) {
    return null
  }

  // Don't render if no user (will redirect)
  if (!user) {
    return null
  }

  // If user doesn't have permission, show an Access Denied message with a helpful action
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const goToDashboard = () => {
      // send user to their role-specific dashboard
      if (!user) return
      router.push(user.role === 'interviewer' ? '/interviewer' : '/interviewee')
    }

    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="max-w-lg text-center p-6 border rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-2">Access denied</h2>
          <p className="text-gray-600 mb-4">You don&apos;t have permission to view this page.</p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={goToDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              Go to my dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}