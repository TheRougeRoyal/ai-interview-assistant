import ProtectedRoute from '@/components/auth/ProtectedRoute'
import IntervieweeDashboard from '@/components/dashboards/IntervieweeDashboard'

export default function IntervieweePage() {
  return (
    <ProtectedRoute allowedRoles={['interviewee']}>
      <IntervieweeDashboard />
    </ProtectedRoute>
  )
}