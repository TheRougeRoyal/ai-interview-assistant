'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/store'
import { setProfileFields, beginInterview, setIds } from '@/store/slices/session'
import { selectProfile, selectResumeMeta, selectResumeText } from '@/store/slices/session'
import { createCandidate, createSession } from '@/lib/http/apiClient'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { requireProfileComplete } from '@/lib/navigation/guards'
import { makePlan } from '@/lib/interview/plan'
import { flowChannel } from '@/lib/utils/channel'

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const profile = useAppSelector(selectProfile)
  const resumeMeta = useAppSelector(selectResumeMeta)
  const resumeText = useAppSelector(selectResumeText)
  
  const [formData, setFormData] = useState({
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || ''
  })

  const [errors, setErrors] = useState({
    name: '',
    email: '',
    phone: ''
  })

  const [isProfileComplete, setIsProfileComplete] = useState(false)

  // Prefill fields from store
  useEffect(() => {
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      phone: profile.phone || ''
    })
  }, [profile])

  // Listen for updates from other windows
  useEffect(() => {
    const off = flowChannel.on('profile:update', (delta: any) => {
      setFormData(prev => ({ ...prev, ...delta }))
    })
    return () => off()
  }, [])

  // Check if profile is complete using the guard
  useEffect(() => {
    const currentProfile = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    }
    setIsProfileComplete(requireProfileComplete(currentProfile))
  }, [formData.name, formData.email, formData.phone])

  const validateField = (field: 'name' | 'email' | 'phone', val: string): string => {
    const trimmed = val.trim()
    
    switch (field) {
      case 'name':
        if (trimmed.length < 2 || trimmed.length > 60) {
          return 'Name must be 2-60 characters'
        }
        if (trimmed.split(/\s+/).length < 2) {
          return 'Please enter your full name (first and last)'
        }
        return ''
      
      case 'email':
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address'
        }
        return ''
      
      case 'phone':
        const digitsOnly = trimmed.replace(/\D/g, '')
        if (digitsOnly.length < 7 || digitsOnly.length > 15) {
          return 'Phone number must be 7-15 digits'
        }
        return ''
      
      default:
        return ''
    }
  }

  const handleInputChange = (field: 'name' | 'email' | 'phone', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }))
    }
  }

  const handleSave = () => {
    const trimmedData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim()
    }

    // Validate all fields
    const newErrors = {
      name: validateField('name', trimmedData.name),
      email: validateField('email', trimmedData.email),
      phone: validateField('phone', trimmedData.phone)
    }

    setErrors(newErrors)

    // If there are validation errors, don't save
    if (newErrors.name || newErrors.email || newErrors.phone) {
      return
    }

    // Clean phone number (remove non-digits)
    const cleanedData = {
      ...trimmedData,
      phone: trimmedData.phone.replace(/\D/g, '')
    }

    // Dispatch to store
    dispatch(setProfileFields(cleanedData))
  }

  const handleStartInterview = async () => {
    if (!isProfileComplete) {
      // Show validation errors
      const newErrors = {
        name: validateField('name', formData.name),
        email: validateField('email', formData.email),
        phone: validateField('phone', formData.phone)
      }
      setErrors(newErrors)
      return
    }

    // Save profile first
    handleSave()

    try {
      // Create candidate in database
      console.log('🔄 Creating candidate in database...', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        hasResume: !!resumeText
      })
      
      const candidate = await createCandidate({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        resumeMeta,
        resumeText
      })
      
      console.log('✅ Candidate created:', candidate.id)

      // Create interview session in database
      const plan = makePlan()
      console.log('🔄 Creating interview session...', { candidateId: candidate.id, plan })
      
      const session = await createSession({
        candidateId: candidate.id,
        plan
      })
      
      console.log('✅ Session created:', session.id)

      // Store IDs in Redux for later use
      dispatch(setIds({
        candidateId: candidate.id,
        sessionId: session.id
      }))

      // Start interview in Redux state
      dispatch(beginInterview({ plan }))
      router.push('/interview')
      
    } catch (error) {
      console.error('❌ Failed to create candidate/session:', error)
      
      // Fallback: continue with offline mode
      console.log('⚠️ Continuing in offline mode')
      dispatch(beginInterview({ plan: makePlan() }))
      router.push('/interview')
    }
  }

  const handleBack = () => {
    router.push('/intake')
  }

  // Check if profile is empty and no resume was uploaded
  const isProfileEmpty = !profile.name && !profile.email && !profile.phone
  const shouldShowIntakeLink = isProfileEmpty && !resumeMeta

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Complete Your Profile
            </h1>
            <p className="text-gray-600">
              Tell us more about your background and experience
            </p>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  data-testid="profile-input-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Enter your full name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  data-testid="profile-input-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="Enter your email address"
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                data-testid="profile-input-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter your phone number"
                className={errors.phone ? 'border-red-500' : ''}
              />
              {errors.phone && (
                <p className="text-sm text-red-600">{errors.phone}</p>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <div className="space-x-2">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={handleSave}
                  data-testid="profile-save"
                >
                  Save
                </Button>
                <Button 
                  type="button" 
                  onClick={handleStartInterview}
                  data-testid="profile-start"
                  className="px-8"
                >
                  Start Interview
                </Button>
              </div>
            </div>

            {shouldShowIntakeLink && (
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 mb-2">
                  No profile data found. Please start by uploading your resume.
                </p>
                <a 
                  href="/intake" 
                  className="text-sm text-yellow-600 hover:text-yellow-800 underline"
                >
                  Go to Intake Page
                </a>
              </div>
            )}

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800 mb-2">
                Click Start Interview. If the new window is blocked, use the link below.
              </p>
              <a 
                href="/interview" 
                className="text-sm text-green-600 hover:text-green-800 underline"
              >
                Go to Interview Page
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
