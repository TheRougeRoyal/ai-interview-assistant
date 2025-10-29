'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { logoutUser } from '@/store/slices/auth'
import { RootState, AppDispatch } from '@/store'

export default function IntervieweeDashboard() {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      router.push('/auth/login')
    })
  }

  const handleStartInterview = () => {
    // Redirect to the existing interview flow
    router.push('/intake')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                AI Interview Assistant
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user.name || user.email}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Welcome Card */}
          <Card>
            <CardHeader>
              <CardTitle>Ready to Start Your Interview?</CardTitle>
              <CardDescription>
                Complete your AI-powered interview assessment to showcase your skills.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-4">
                    This interview consists of technical questions designed to assess your skills and experience. 
                    You&apos;ll have time limits for each question, and your responses will be evaluated by our expert reviewers.
                  </p>
                  <p className="text-sm text-gray-600">
                    Make sure you have a quiet environment and stable internet connection before starting.
                  </p>
                </div>
                <Button onClick={handleStartInterview} size="lg" className="w-full sm:w-auto">
                  Start Interview
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Instructions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Interview Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Upload Your Resume</h4>
                    <p className="text-sm text-gray-600">
                      Start by uploading your resume in PDF or DOCX format.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Complete Your Profile</h4>
                    <p className="text-sm text-gray-600">
                      Provide your contact information and verify the details.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Answer Questions</h4>
                    <p className="text-sm text-gray-600">
                      Respond to AI-generated questions based on your experience and skills.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Submit & Wait</h4>
                    <p className="text-sm text-gray-600">
                      Submit your responses and wait for the interviewer to review and score your answers.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="text-green-900">Privacy & Security</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-green-800 text-sm">
                Your responses and personal information are kept secure and confidential. 
                Only authorized interviewers will have access to review your submission for evaluation purposes.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}