'use client'

import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { registerUser, clearError } from '@/store/slices/auth'
import { RootState, AppDispatch } from '@/store'
import { useRouter } from 'next/navigation'
import { ToastProvider, Toast, ToastTitle, ToastDescription, ToastViewport } from '@/components/ui/toast'

export default function RegisterForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'interviewer' | 'interviewee'>('interviewee')
  const [showInterviewerSignup, setShowInterviewerSignup] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [validationError, setValidationError] = useState('')
  
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  
  const { user, isLoading, error } = useSelector((state: RootState) => state.auth)
  const [toastOpen, setToastOpen] = useState(false)

  // Redirect based on role after successful registration
  useEffect(() => {
    if (user) {
      if (user.role === 'interviewer') {
        router.push('/interviewer')
      } else {
        router.push('/interviewee')
      }
    }
  }, [user, router])

  // Detect ?role=interviewer query param so that interviewer signups are
  // possible from /auth/register?role=interviewer while keeping the main
  // landing free of a prominent interviewer signup button.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search)
        const qrole = params.get('role')
        if (qrole === 'interviewer') {
          setRole('interviewer')
          setShowInterviewerSignup(true)
        }
      }
    } catch (e) {
      // ignore
    }
  }, [])

  // Clear error when component mounts
  useEffect(() => {
    dispatch(clearError())
    setValidationError('')
  }, [dispatch])

  // Show toast when server error or validation error appears
  useEffect(() => {
    if (error || validationError) {
      setToastOpen(true)
    }
  }, [error, validationError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setValidationError('')
    
    if (!email || !password || !confirmPassword) {
      setValidationError('All required fields must be filled')
      return
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters long')
      return
    }

    const userData = {
      email,
      password,
      role,
      ...(name && { name }),
      ...(phone && { phone })
    }

    dispatch(registerUser(userData))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            AI Interview Assistant
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Create your account
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>
              Create an account to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ToastProvider>
              <form onSubmit={handleSubmit} className="space-y-4">
                {(error || validationError) && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">
                      {validationError || error}
                    </div>
                  </div>
                )}
              
              {/* Default to interviewee sign up on the visible form. Interviewer
                  signup is only available when coming from the register page with
                  ?role=interviewer (or via the link below). */}
              {showInterviewerSignup && (
                <div className="space-y-2">
                  <Label>Account Type</Label>
                  <div className="text-sm text-muted-foreground">Interviewer (Score candidates)</div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (min 8 characters)"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !email || !password || !confirmPassword}
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
              </form>

              {/* Toast UI for errors */}
              <Toast open={toastOpen} onOpenChange={setToastOpen} variant="destructive">
                <ToastTitle>Authentication Error</ToastTitle>
                <ToastDescription>{validationError || error}</ToastDescription>
              </Toast>

              <ToastViewport />
            </ToastProvider>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign in
                </button>
              </p>
            </div>
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Want to conduct interviews?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/register?role=interviewer')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Sign up here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}