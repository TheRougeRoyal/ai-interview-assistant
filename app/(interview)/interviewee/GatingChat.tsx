'use client'

import { useState, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@/store'
import { setProfileFields, beginInterview } from '@/store/slices/session'
import { selectProfile, selectIsProfileComplete } from '@/store/slices/session'
import { makePlan } from '@/lib/interview/plan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useEffect as useReactEffect } from 'react'
import { flowChannel } from '@/lib/utils/channel'

export function GatingChat() {
  const dispatch = useAppDispatch()
  const profile = useAppSelector(selectProfile)
  const isComplete = useAppSelector(selectIsProfileComplete)
  const [currentField, setCurrentField] = useState<'name' | 'email' | 'phone' | undefined>(undefined)
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  // Determine which field to ask for next
  const getNextMissingField = (): 'name' | 'email' | 'phone' | undefined => {
    if (!profile.name?.trim()) return 'name'
    if (!profile.email?.trim()) return 'email'
    if (!profile.phone?.trim()) return 'phone'
    return undefined
  }

  // Initialize current field on mount
  useEffect(() => {
    if (!currentField && !isComplete) {
      const nextField = getNextMissingField()
      if (nextField) {
        setCurrentField(nextField)
      }
    }
  }, [currentField, isComplete, profile, getNextMissingField])

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
        // Store the cleaned phone number
        return ''
      
      default:
        return ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentField) return
    
    const trimmedValue = value.trim()
    const validationError = validateField(currentField, trimmedValue)
    
    if (validationError) {
      setError(validationError)
      return
    }
    
    setError('')
    
    // Update profile with the field (clean phone number if needed)
    const valueToStore = currentField === 'phone' ? trimmedValue.replace(/\D/g, '') : trimmedValue
    dispatch(setProfileFields({ [currentField]: valueToStore }))
    flowChannel.post('profile:update', { [currentField]: valueToStore })
    
    // Move to next field or complete
    const nextField = getNextMissingField()
    if (nextField) {
      setCurrentField(nextField)
      setValue('')
    } else {
      // Profile is complete, start the interview
      dispatch(beginInterview({ plan: makePlan() }))
    }
  }

  if (isComplete) {
    return null
  }

  const getFieldLabel = (field: 'name' | 'email' | 'phone') => {
    switch (field) {
      case 'name': return 'Full Name'
      case 'email': return 'Email Address'
      case 'phone': return 'Phone Number'
    }
  }

  const getFieldPlaceholder = (field: 'name' | 'email' | 'phone') => {
    switch (field) {
      case 'name': return 'Enter your full name'
      case 'email': return 'Enter your email address'
      case 'phone': return 'Enter your phone number'
    }
  }

  return (
    <div data-testid="gating-chat" className="max-w-md mx-auto">
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">
          We need a few more details to get started with your interview.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="profile-field" className="block text-sm font-medium mb-2">
              {currentField && getFieldLabel(currentField)}
            </label>
            <Input
              id="profile-field"
              type={currentField === 'email' ? 'email' : currentField === 'phone' ? 'tel' : 'text'}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentField && getFieldPlaceholder(currentField)}
              data-testid={`gating-input-${currentField}`}
              className={error ? 'border-red-500' : ''}
            />
            {error && (
              <p className="text-red-500 text-sm mt-1">{error}</p>
            )}
          </div>
          
          <Button 
            type="submit" 
            className="w-full"
            data-testid="gating-submit"
          >
            {currentField === 'phone' ? 'Start Interview' : 'Continue'}
          </Button>
        </form>
      </Card>
    </div>
  )
}