/**
 * Enhanced Dashboard with error boundaries, loading states, and offline support
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  FileText, 
  Clock, 
  TrendingUp, 
  AlertCircle,
  RefreshCw,
  WifiOff
} from 'lucide-react'

// Enhanced UI components
import { 
  SectionErrorBoundary, 
  ComponentErrorBoundary,
  useErrorHandler 
} from '@/components/ui/error-boundary'
import { 
  LoadingOverlay, 
  CardSkeleton, 
  TableSkeleton,
  useLoading 
} from '@/components/ui/loading-states'
import { 
  OfflineAware, 
  useOnlineStatus,
  OfflineBanner 
} from '@/components/ui/offline-state'
import { useToast } from '@/components/ui/use-toast'

// Store hooks
import { 
  useCandidates, 
  useSessions, 
  useErrorHandler as useStoreErrorHandler 
} from '@/store/enhanced/hooks'

// API client
import { robustApiClient } from '@/lib/api/robustClient'
import { getApiLogger } from '@/lib/logging'

/**
 * Dashboard statistics component
 */
function DashboardStats() {
  const { stats: candidateStats, loading: candidatesLoading, error: candidatesError } = useCandidates()
  const { stats: sessionStats, loading: sessionsLoading } = useSessions()
  const { isLoading, withLoading } = useLoading()
  const { handleError } = useErrorHandler()
  const { toast } = useToast()
  const logger = getApiLogger()

  const [healthData, setHealthData] = useState<any>(null)

  const refreshStats = async () => {
    try {
      await withLoading(async () => {
        const health = await robustApiClient.healthCheck()
        setHealthData(health.data)
        
        logger.info('Dashboard stats refreshed')
        toast({
          title: 'Stats updated',
          description: 'Dashboard statistics have been refreshed.',
        })
      })
    } catch (error) {
      handleError(error as Error)
      logger.error('Failed to refresh dashboard stats', error)
    }
  }

  const stats = [
    {
      title: 'Total Candidates',
      value: candidateStats.total,
      icon: Users,
      description: `${candidateStats.completed} completed, ${candidateStats.inProgress} in progress`,
      loading: candidatesLoading,
      error: candidatesError
    },
    {
      title: 'Active Sessions',
      value: sessionStats.total,
      icon: Clock,
      description: `${Object.keys(sessionStats.byStage).length} different stages`,
      loading: sessionsLoading
    },
    {
      title: 'Average Score',
      value: candidateStats.averageScore.toFixed(1),
      icon: TrendingUp,
      description: 'Based on completed interviews',
      loading: candidatesLoading
    },
    {
      title: 'System Health',
      value: healthData?.status || 'Unknown',
      icon: healthData?.status === 'healthy' ? TrendingUp : AlertCircle,
      description: healthData ? 'All services operational' : 'Checking...',
      loading: !healthData && isLoading
    }
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <OfflineAware
          fallback={
            <Button disabled variant="outline">
              <WifiOff className="h-4 w-4 mr-2" />
              Offline
            </Button>
          }
        >
          <Button 
            onClick={refreshStats} 
            disabled={isLoading}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </OfflineAware>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <ComponentErrorBoundary key={index}>
            <StatCard {...stat} />
          </ComponentErrorBoundary>
        ))}
      </div>
    </div>
  )
}

/**
 * Individual stat card component
 */
interface StatCardProps {
  title: string
  value: string | number
  icon: React.ElementType
  description: string
  loading?: boolean
  error?: any
}

function StatCard({ title, value, icon: Icon, description, loading, error }: StatCardProps) {
  if (loading) {
    return <CardSkeleton />
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-sm text-red-800">Failed to load {title.toLowerCase()}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

/**
 * Recent candidates component
 */
function RecentCandidates() {
  const { candidates, loading, error, actions } = useCandidates()
  const { handleAsyncError } = useStoreErrorHandler()

  useEffect(() => {
    const loadCandidates = handleAsyncError(
      () => actions.fetchList({ page: 1, limit: 5 }),
      'Loading recent candidates'
    )
    
    loadCandidates()
  }, [actions, handleAsyncError])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={3} />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800">Recent Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">Failed to load candidates: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Candidates</CardTitle>
        <CardDescription>Latest candidate submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {candidates.slice(0, 5).map((candidate) => (
            <div key={candidate.id} className="flex items-center justify-between">
              <div>
                <p className="font-medium">{candidate.name}</p>
                <p className="text-sm text-muted-foreground">{candidate.email}</p>
              </div>
              <div className="text-right">
                {candidate.finalScore !== undefined ? (
                  <span className="text-sm font-medium">Score: {candidate.finalScore}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">In Progress</span>
                )}
              </div>
            </div>
          ))}
          
          {candidates.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              No candidates found
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * System status component
 */
function SystemStatus() {
  const [status, setStatus] = useState<any>(null)
  const { isLoading, withLoading } = useLoading()
  const { handleError } = useErrorHandler()
  const isOnline = useOnlineStatus()
  const logger = getApiLogger()

  const checkSystemHealth = async () => {
    try {
      await withLoading(async () => {
        const health = await robustApiClient.healthCheck()
        setStatus(health.data)
        logger.info('System health check completed', health.data)
      })
    } catch (error) {
      handleError(error as Error)
      logger.error('System health check failed', error)
    }
  }

  useEffect(() => {
    if (isOnline) {
      checkSystemHealth()
    }
  }, [isOnline])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current system health and metrics</CardDescription>
        </div>
        <OfflineAware>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={checkSystemHealth}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Check
          </Button>
        </OfflineAware>
      </CardHeader>
      <CardContent>
        <LoadingOverlay isLoading={isLoading} message="Checking system health...">
          {!isOnline ? (
            <div className="flex items-center gap-2 text-orange-700">
              <WifiOff className="h-4 w-4" />
              <span className="text-sm">Cannot check status while offline</span>
            </div>
          ) : status ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Status</span>
                <span className={`text-sm font-medium ${
                  status.status === 'healthy' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {status.status}
                </span>
              </div>
              
              {status.services && Object.entries(status.services).map(([service, serviceStatus]) => (
                <div key={service} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{service}</span>
                  <span className={`text-xs ${
                    serviceStatus === 'healthy' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {serviceStatus as string}
                  </span>
                </div>
              ))}
              
              <div className="text-xs text-muted-foreground mt-2">
                Last checked: {new Date(status.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Click "Check" to view system status
            </div>
          )}
        </LoadingOverlay>
      </CardContent>
    </Card>
  )
}

/**
 * Main dashboard component
 */
export default function EnhancedDashboard() {
  const isOnline = useOnlineStatus()

  return (
    <div className="space-y-6">
      {/* Offline banner */}
      <OfflineBanner />
      
      {/* Dashboard stats */}
      <SectionErrorBoundary>
        <DashboardStats />
      </SectionErrorBoundary>

      {/* Dashboard content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionErrorBoundary>
              <RecentCandidates />
            </SectionErrorBoundary>
            
            <SectionErrorBoundary>
              <SystemStatus />
            </SectionErrorBoundary>
          </div>
        </TabsContent>

        <TabsContent value="candidates" className="space-y-4">
          <SectionErrorBoundary>
            <Card>
              <CardHeader>
                <CardTitle>Candidate Management</CardTitle>
                <CardDescription>Manage and review candidates</CardDescription>
              </CardHeader>
              <CardContent>
                <OfflineAware
                  fallback={
                    <div className="text-center py-8 text-muted-foreground">
                      <WifiOff className="h-8 w-8 mx-auto mb-2" />
                      <p>Candidate management requires an internet connection</p>
                    </div>
                  }
                >
                  <RecentCandidates />
                </OfflineAware>
              </CardContent>
            </Card>
          </SectionErrorBoundary>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SectionErrorBoundary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SystemStatus />
              
              <Card>
                <CardHeader>
                  <CardTitle>API Metrics</CardTitle>
                  <CardDescription>Current API performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ApiMetrics />
                </CardContent>
              </Card>
            </div>
          </SectionErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * API metrics component
 */
function ApiMetrics() {
  const [metrics, setMetrics] = useState<any>(null)
  const { isLoading, withLoading } = useLoading()
  const isOnline = useOnlineStatus()

  const loadMetrics = async () => {
    try {
      await withLoading(async () => {
        const apiMetrics = robustApiClient.getApiMetrics()
        setMetrics(apiMetrics)
      })
    } catch (error) {
      console.error('Failed to load API metrics:', error)
    }
  }

  useEffect(() => {
    if (isOnline) {
      loadMetrics()
      const interval = setInterval(loadMetrics, 30000) // Update every 30 seconds
      return () => clearInterval(interval)
    }
  }, [isOnline])

  if (!isOnline) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <WifiOff className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Metrics unavailable offline</p>
      </div>
    )
  }

  if (isLoading && !metrics) {
    return <TableSkeleton rows={4} columns={2} />
  }

  if (!metrics) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p className="text-sm">No metrics available</p>
      </div>
    )
  }

  const successRate = metrics.totalRequests > 0 
    ? ((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-3">
      <div className="flex justify-between">
        <span className="text-sm">Total Requests</span>
        <span className="text-sm font-medium">{metrics.totalRequests}</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-sm">Success Rate</span>
        <span className="text-sm font-medium">{successRate}%</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-sm">Avg Response Time</span>
        <span className="text-sm font-medium">{metrics.averageResponseTime.toFixed(0)}ms</span>
      </div>
      
      <div className="flex justify-between">
        <span className="text-sm">Circuit Breaker</span>
        <span className={`text-sm font-medium ${
          metrics.circuitBreaker.state === 'closed' ? 'text-green-600' : 'text-red-600'
        }`}>
          {metrics.circuitBreaker.state}
        </span>
      </div>
      
      {metrics.cacheHits !== undefined && (
        <div className="flex justify-between">
          <span className="text-sm">Cache Hit Rate</span>
          <span className="text-sm font-medium">
            {((metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)) * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  )
}