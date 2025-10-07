'use client'

import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { RootState } from '@/store'

export default function AuthenticatedHomePage() {
  const router = useRouter()
  const { user, isInitialized } = useSelector((state: RootState) => state.auth)


  // Show landing page for unauthenticated users
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

  // If user is authenticated, show the landing but provide a dashboard shortcut
  // so opening the site doesn't auto-redirect them away.
  const signedIn = Boolean(user)

  // Landing page for unauthenticated users
  return (
    <main className="container mx-auto px-4 py-8">
      {signedIn && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-900 flex items-center justify-between">
          <div>
            You are signed in as <strong>{user?.name || user?.email}</strong>. Visit your dashboard to continue.
          </div>
          <div>
            <Link href={user?.role === 'interviewer' ? '/interviewer' : '/interviewee'}>
              <Button variant="default" size="sm" className="bg-yellow-600 hover:bg-yellow-700">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      )}
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            AI Interview Assistant
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A comprehensive interview platform with AI-powered scoring and real-time feedback. 
            Sign in to get started.
          </p>
        </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-semibold">For Interviewees</h2>
            <p className="text-muted-foreground">
              Upload your resume, complete your profile, and participate in a timed AI interview 
              with personalized questions based on your experience.
            </p>
            <div className="space-y-2">
              <Link href="/auth/login">
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="outline" className="w-full" size="lg">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>

          <div className="border rounded-lg p-6 space-y-4">
            <h2 className="text-2xl font-semibold">For Interviewers</h2>
            <p className="text-muted-foreground">
              Review candidate profiles, score interview responses, and access detailed 
              reports and analytics. Interviewers cannot take interviews themselves.
            </p>
            <div className="space-y-2">
              <Link href="/auth/login">
                <Button className="w-full" size="lg">
                  Sign In
                </Button>
              </Link>
              {/* Interviewer sign up is intentionally hidden from the main landing to
                  funnel interviewer sign ups through the Register page. */}
            </div>
          </div>
        </div>

        <div className="mt-12 p-4 bg-muted rounded-lg max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> This platform enforces role-based access control. 
            Interviewees can only take interviews, while interviewers can only review and score submissions.
          </p>
        </div>
      </div>
    </main>
  )
}