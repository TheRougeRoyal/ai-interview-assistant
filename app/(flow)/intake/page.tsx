'use client'

import { useAppDispatch } from '@/store'
import { setProfileFields, setResumeMeta, setResumeText, setResumeAnalysis } from '@/store/slices/session'
import { Card } from '@/components/ui/card'
import ResumeUploader from '@/components/shared/ResumeUploader'
import { useRouter } from 'next/navigation'
import { flowChannel } from '@/lib/utils/channel'
import { useEffect } from 'react'

export default function IntakePage() {
  const dispatch = useAppDispatch()
  const router = useRouter()

  useEffect(() => {
    const off = flowChannel.on('resume:parsed', () => {
      // Open profile page in a new window while keeping intake available
      window.open('/profile', '_blank', 'noopener,noreferrer')
    })
    return () => off()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Your Interview
            </h1>
            <p className="text-gray-600">
              Upload your resume to get started
            </p>
          </div>

          <ResumeUploader 
            onParsed={({ fields, resumeMeta, resumeText, analysis }) => {
              const p = { 
                ...(fields.name ? { name: fields.name } : {}), 
                ...(fields.email ? { email: fields.email } : {}), 
                ...(fields.phone ? { phone: fields.phone } : {}) 
              }
              dispatch(setProfileFields(p))
              dispatch(setResumeMeta(resumeMeta))
              dispatch(setResumeText(resumeText))
              if (analysis) {
                dispatch(setResumeAnalysis({
                  skills: analysis.skills,
                  sections: {
                    summary: analysis.sections?.summary,
                    experience: analysis.sections?.experience,
                    education: analysis.sections?.education,
                    skills: analysis.sections?.skills,
                  },
                  qualityScore: analysis.quality?.score
                }))
              }
              router.push('/profile')
            }} 
          />

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              After parsing, we will take you straight to your profile to confirm the details.
            </p>
            <a 
              href="/profile" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Go to Profile Page
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
