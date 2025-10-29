'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { CandidateTable } from '@/components/dashboard/CandidateTable'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { SkeletonTable } from '@/components/dashboard/SkeletonTable'
import { useDashboardRefresh } from '@/lib/hooks/useDashboardRefresh'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CandidateDetailDrawer } from '@/components/dashboard/CandidateDetailDrawer'
import { fetchAPI } from '@/lib/http/apiClient'
import ProtectedRoute from '@/components/auth/ProtectedRoute'
import { CheckCircle2, LogOut } from 'lucide-react'
import { logoutUser } from '@/store/slices/auth'
import type { AppDispatch, RootState } from '@/store'

import type { CandidatePreview } from '@/types/domain'

export const dynamic = 'force-dynamic'

type SortField = 'name' | 'finalScore' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

function InterviewerPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useDispatch<AppDispatch>()
  const { user } = useSelector((state: RootState) => state.auth)

  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<CandidatePreview[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [lastFetchTime, setLastFetchTime] = useState<number>(Date.now())
  const [notification, setNotification] = useState<string | null>(null)
  const refreshTrigger = useDashboardRefresh()

  const debouncedSearch = useDebounce(searchInput, 300)
  const sortField = (searchParams.get('sort') as SortField) || 'updatedAt'
  const sortOrder = (searchParams.get('order') as SortOrder) || 'desc'
  const candidateId = searchParams.get('candidateId')

  const handleSignOut = async () => {
    try {
      await dispatch(logoutUser()).unwrap()
      router.push('/auth/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  const updateSearchParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    router.push(`${pathname}?${params.toString()}`)
  }

  useEffect(() => {
    updateSearchParams({ q: debouncedSearch || null })
  }, [debouncedSearch])

  const handleSort = (field: SortField) => {
    const newOrder = field === sortField && sortOrder === 'desc' ? 'asc' : 'desc'
    updateSearchParams({ sort: field, order: newOrder })
  }

  const handleRowClick = (candidateId: string) => {
    updateSearchParams({ candidateId })
  }

  const handleCloseDrawer = () => {
    const previousCandidateId = candidateId
    updateSearchParams({ candidateId: null })
    
    setTimeout(() => {
      if (previousCandidateId) {
        const row = document.querySelector(`[data-candidate-id="${previousCandidateId}"]`) as HTMLElement
        if (row) {
          row.focus()
        }
      }
    }, 100)
  }

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        if (debouncedSearch) params.set('q', debouncedSearch)
        params.set('limit', '20')
        const sortBy = sortField === 'updatedAt' ? 'createdAt' : sortField === 'name' ? 'createdAt' : 'finalScore'
        params.set('sortBy', sortBy)
        params.set('order', sortOrder)
        const url = `/api/candidates?${params.toString()}`
        console.log('🔍 Fetching candidates from:', url)
        const data = await fetchAPI(url)
        console.log('✅ Candidates data received:', data)
        setCandidates(data.items || [])
        setNextCursor(data.nextCursor || null)
        setLastFetchTime(Date.now())
      } catch (error) {
        console.error('❌ Error fetching candidates:', error)
        setCandidates([])
        setNextCursor(null)
      } finally {
        setLoading(false)
      }
    }

    fetchCandidates()
  }, [debouncedSearch, sortField, sortOrder, refreshTrigger])

  useEffect(() => {
    // Live WebSocket updates for instant refresh on server events
    let ws: WebSocket | null = null
    try {
      const url = (typeof window !== 'undefined') ? (window.location.protocol === 'https:' ? 'wss' : 'ws') + '://' + window.location.host + '/api/live' : ''
      ws = new WebSocket(url)
      ws.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(String(ev.data || '{}'))
          if (msg?.event === 'candidate:finalized') {
            setNotification('A candidate interview has completed')
            setTimeout(() => setNotification(null), 5000)
            // Trigger immediate fetch
            setLoading(true)
            const fetchAgain = async () => {
              try {
                const params = new URLSearchParams()
                if (debouncedSearch) params.set('q', debouncedSearch)
                params.set('limit', '20')
                const sortBy = sortField === 'updatedAt' ? 'createdAt' : sortField === 'name' ? 'createdAt' : 'finalScore'
                params.set('sortBy', sortBy)
                params.set('order', sortOrder)
                const data = await fetchAPI(`/api/candidates?${params.toString()}`)
                setCandidates(data.items || [])
                setNextCursor(data.nextCursor || null)
                setLastFetchTime(Date.now())
              } catch (e) {
                console.error(e)
              } finally {
                setLoading(false)
              }
            }
            fetchAgain()
          }
        } catch {}
      })
    } catch {}

    return () => {
      try { ws?.close() } catch {}
    }
  }, [debouncedSearch, sortField, sortOrder])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        console.log('⏰ Auto-refreshing candidates...')
        const fetchQuietly = async () => {
          try {
            const params = new URLSearchParams()
            if (debouncedSearch) params.set('q', debouncedSearch)
            params.set('limit', '20')
            const sortBy = sortField === 'updatedAt' ? 'createdAt' : sortField === 'name' ? 'createdAt' : 'finalScore'
            params.set('sortBy', sortBy)
            params.set('order', sortOrder)
            const url = `/api/candidates?${params.toString()}`
            const data = await fetchAPI(url)
            
            const newIds = (data.items || []).map((c: any) => c.id).join(',')
            const currentIds = candidates.map(c => c.id).join(',')
            
            if (newIds !== currentIds || data.items?.length !== candidates.length) {
              console.log('✨ New candidate data detected, updating...')
              
              const newCandidates = (data.items || []).filter((newC: any) => 
                !candidates.some(c => c.id === newC.id)
              )
              
              if (newCandidates.length > 0) {
                setNotification(`${newCandidates.length} new candidate(s) completed their interview!`)
                setTimeout(() => setNotification(null), 5000)
              }
              
              setCandidates(data.items || [])
              setNextCursor(data.nextCursor || null)
              setLastFetchTime(Date.now())
            }
          } catch (error) {
            console.error('❌ Silent refresh failed:', error)
          }
        }
        fetchQuietly()
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [debouncedSearch, sortField, sortOrder, candidates])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchTime
        if (timeSinceLastFetch > 3000) {
          console.log('👁️ Tab visible again, refreshing...')
          setLoading(true)
          const fetchAgain = async () => {
            try {
              const params = new URLSearchParams()
              if (debouncedSearch) params.set('q', debouncedSearch)
              params.set('limit', '20')
              const sortBy = sortField === 'updatedAt' ? 'createdAt' : sortField === 'name' ? 'createdAt' : 'finalScore'
              params.set('sortBy', sortBy)
              params.set('order', sortOrder)
              const data = await fetchAPI(`/api/candidates?${params.toString()}`)
              setCandidates(data.items || [])
              setNextCursor(data.nextCursor || null)
              setLastFetchTime(Date.now())
            } catch (error) {
              console.error('❌ Error fetching candidates:', error)
              // Swallow transient network errors instead of surfacing TypeError
            } finally {
              setLoading(false)
            }
          }
          fetchAgain()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [debouncedSearch, sortField, sortOrder, lastFetchTime])

  const handleLoadMore = async () => {
    if (!nextCursor) return
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('q', debouncedSearch)
      params.set('limit', '20')
      const sortBy = sortField === 'updatedAt' ? 'createdAt' : sortField === 'name' ? 'createdAt' : 'finalScore'
      params.set('sortBy', sortBy)
      params.set('order', sortOrder)
      params.set('cursor', nextCursor)
      const data = await fetchAPI(`/api/candidates?${params.toString()}`)
      setCandidates(prev => [...prev, ...(data.items || [])])
      setNextCursor(data.nextCursor || null)
    } catch (e) {
      console.error(e)
    }
  }

  const totalCandidates = candidates.length
  const completedInterviews = candidates.filter(c => c.status === 'completed').length
  const inProgress = candidates.filter(c => c.status === 'in_progress').length
  const avgScore = candidates
    .filter(c => c.finalScore != null)
    .reduce((sum, c) => sum + (c.finalScore || 0), 0) / 
    Math.max(1, candidates.filter(c => c.finalScore != null).length)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header with User Info and Sign Out */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Interviewer Dashboard</h1>
          {user && (
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, {user.name || user.email}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
          <Card className="bg-green-50 border-green-200 shadow-lg">
            <CardContent className="flex items-center gap-3 p-4">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              <p className="text-sm font-medium text-green-900">{notification}</p>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{totalCandidates}</div>
            <p className="text-sm text-muted-foreground">Total Candidates</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{completedInterviews}</div>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{inProgress}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {isNaN(avgScore) ? '—' : avgScore.toFixed(1)}
            </div>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </CardContent>
        </Card>
      </div>

      <Card className="relative">
        <CardHeader className="sticky top-0 z-20 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <CardTitle>Interview Candidates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              placeholder="Search candidates..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="max-w-sm"
              aria-label="Search candidates by name or email"
            />
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              🔄 Refresh
            </Button>
          </div>
          
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
          {(!loading && nextCursor) && (
            <div className="pt-2">
              <button className="text-sm underline" onClick={handleLoadMore}>
                Load more
              </button>
            </div>
          )}
        </CardContent>
      </Card>
      
            <CandidateDetailDrawer
        candidateId={candidateId}
        onClose={handleCloseDrawer}
      />
    </div>
  )
}

export default function InterviewerPage() {
  return (
    <ProtectedRoute allowedRoles={['interviewer']}>
      <Suspense fallback={<SkeletonTable />}>
        <InterviewerPageContent />
      </Suspense>
    </ProtectedRoute>
  )
}
