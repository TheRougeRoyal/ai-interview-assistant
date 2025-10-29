'use client'

import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RefreshCw, Search } from 'lucide-react'
import { logoutUser } from '@/store/slices/auth'
import { RootState, AppDispatch } from '@/store'
import { CandidateTable } from '@/components/dashboard/CandidateTable'
import { fetchAPI } from '@/lib/http/apiClient'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { SkeletonTable } from '@/components/dashboard/SkeletonTable'

interface Candidate {
  id: string
  name: string
  email: string
  phone: string
  finalScore?: number
  status: 'completed' | 'in_progress' | 'not_started'
  updatedAt: string
  skills?: { technical?: string[] }
  qualityScore?: number | null
  sessions?: Array<{
    id: string
    answers: Array<any>
    createdAt: string
  }>
}

export default function InterviewerDashboard() {
  const dispatch = useDispatch<AppDispatch>()
  const router = useRouter()
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'finalScore' | 'updatedAt'>('finalScore')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [notification, setNotification] = useState<string | null>(null)

  // Function to refresh data
  const refreshData = () => {
    setRefreshKey(prev => prev + 1)
  }

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Load candidates data
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        setLoading(true)
        const params = new URLSearchParams({
          sortBy: sortField,
          order: sortOrder,
          ...(debouncedSearchQuery && { q: debouncedSearchQuery })
        })
        
  const data = await fetchAPI(`/api/candidates?${params}`)
        
        // Transform data to match expected format
        const transformedCandidates: Candidate[] = data.candidates.map((candidate: any) => ({
          id: candidate.id,
          name: candidate.name,
          email: candidate.email,
          phone: candidate.phone || '',
          finalScore: candidate.finalScore || undefined,
          status: candidate.sessions?.length > 0 ? 'completed' : 'not_started',
          updatedAt: candidate.updatedAt,
          skills: candidate.skillsJson ? JSON.parse(candidate.skillsJson) : undefined,
          qualityScore: candidate.qualityScore,
          sessions: candidate.sessions || []
        }))
        
        setCandidates(transformedCandidates)
      } catch (error) {
        console.error('Error loading candidates:', error)
        setCandidates([])
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      loadCandidates()
    }
  }, [user, debouncedSearchQuery, sortField, sortOrder, refreshKey])

  // Auto-refresh every 30 seconds to catch new candidates
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Subscribe to server-sent events for real-time updates
  useEffect(() => {
    let es: EventSource | null = null
    try {
      es = new EventSource('/api/notifications')
      es.addEventListener('message', (ev) => {
        try {
          const payload = JSON.parse(ev.data)
          if (payload.event === 'connected') return
          if (payload.event === 'candidate:finalized') {
            setNotification('A candidate interview has completed')
            refreshData()
            // auto-dismiss
            setTimeout(() => setNotification(null), 5000)
          }
        } catch (e) {
          // ignore malformed messages
        }
      })
      es.addEventListener('error', (err) => {
        console.error('SSE error:', err)
        es?.close()
      })
    } catch (e) {
      console.warn('Failed to connect to notifications SSE', e)
    }

    return () => es?.close()
  }, [])

  const handleLogout = () => {
    dispatch(logoutUser()).then(() => {
      // After logout, send user back to the main landing page
      router.push('/')
    })
  }

  const handleSort = (field: 'name' | 'finalScore' | 'updatedAt') => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const handleRowClick = (candidateId: string) => {
    setSelectedCandidateId(candidateId)
    // TODO: Open candidate detail drawer
  }

  // Calculate stats
  const totalCandidates = candidates.length
  const completedCandidates = candidates.filter(c => c.status === 'completed').length
  const pendingReviews = candidates.filter(c => c.finalScore === undefined || c.finalScore === null).length

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Interviewer Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Welcome back, {user.name || user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={refreshData} 
                variant="outline" 
                size="sm"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button onClick={handleLogout} variant="outline">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Candidates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : totalCandidates}</div>
                <p className="text-xs text-gray-500">
                  {totalCandidates === 0 ? 'No candidates yet' : 
                   totalCandidates === 1 ? '1 candidate' : 
                   `${totalCandidates} candidates`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Pending Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : pendingReviews}</div>
                <p className="text-xs text-gray-500">
                  {pendingReviews === 0 ? 'All caught up' : 
                   pendingReviews === 1 ? '1 pending' : 
                   `${pendingReviews} pending`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Completed Reviews
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{loading ? '...' : completedCandidates}</div>
                <p className="text-xs text-gray-500">
                  {completedCandidates === 0 ? 'No reviews completed' : 
                   completedCandidates === 1 ? '1 completed' : 
                   `${completedCandidates} completed`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Candidates Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Candidates</CardTitle>
                  <CardDescription>
                    Review and score candidate submissions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search candidates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
                {notification && (
                  <div className="mb-4 p-2 bg-green-50 border border-green-100 text-green-800 rounded">
                    {notification}
                  </div>
                )}
              {loading ? (
                <SkeletonTable />
              ) : candidates.length === 0 ? (
                <EmptyState />
              ) : (
                <CandidateTable
                  candidates={candidates}
                  sortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                  onRowClick={handleRowClick}
                />
              )}
            </CardContent>
          </Card>

          {/* Important Note */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Interviewer Access</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-blue-800 text-sm">
                As an interviewer, you can review candidate submissions and assign scores, 
                but you cannot take interviews yourself. Interviewees will submit their 
                responses through the separate candidate interface.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}