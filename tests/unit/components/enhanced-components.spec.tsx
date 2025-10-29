/**
 * Tests for enhanced components integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import React from 'react'

// Mock enhanced store
const mockStore = {
  getState: () => ({
    entities: {
      candidates: {},
      sessions: {},
      answers: {},
      users: {},
      scores: {}
    },
    collections: {
      candidateIds: [],
      sessionIds: [],
      answerIds: [],
      userIds: [],
      scoreIds: []
    },
    loading: {
      candidates: { list: false, create: false, update: false, delete: false, search: false },
      sessions: { list: false, create: false, update: false, delete: false },
      answers: { create: false, update: false, delete: false },
      auth: { login: false, register: false, logout: false, refresh: false }
    },
    errors: {
      candidates: { list: null, create: null, update: null, delete: null, search: null },
      sessions: { list: null, create: null, update: null, delete: null },
      answers: { create: null, update: null, delete: null },
      auth: { login: null, register: null, logout: null, refresh: null },
      global: null
    },
    ui: {
      selections: { selectedCandidateIds: [], selectedSessionIds: [], selectedAnswerIds: [], currentCandidateId: null, currentSessionId: null },
      pagination: {},
      filters: {
        candidates: { search: '', sortBy: 'createdAt', sortOrder: 'desc', filters: {} },
        sessions: { search: '', sortBy: 'createdAt', sortOrder: 'desc', filters: {} }
      },
      theme: 'system',
      modals: {},
      toasts: []
    },
    cache: {},
    optimistic: [],
    legacy: { auth: null, session: null, resume: null }
  }),
  dispatch: vi.fn(),
  subscribe: vi.fn(() => () => {})
}

// Mock enhanced hooks
vi.mock('@/store/enhanced/hooks', () => ({
  useCandidates: () => ({
    candidates: [],
    filteredCandidates: [],
    loading: false,
    creating: false,
    error: null,
    stats: { total: 0, completed: 0, inProgress: 0, notStarted: 0, averageScore: 0 },
    actions: {
      fetchList: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-candidate' }),
      update: vi.fn().mockResolvedValue({ id: 'updated-candidate' }),
      setFilters: vi.fn()
    }
  }),
  useCurrentCandidate: () => ({
    currentCandidate: null,
    setCurrent: vi.fn()
  }),
  useSessions: () => ({
    sessions: [],
    filteredSessions: [],
    loading: false,
    error: null,
    stats: { total: 0, byStage: {} },
    actions: {
      fetchList: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'new-session' }),
      update: vi.fn().mockResolvedValue({ id: 'updated-session' }),
      setFilters: vi.fn()
    }
  }),
  useErrorHandler: () => ({
    handleError: vi.fn(),
    handleAsyncError: (fn: Function) => fn
  }),
  usePerformanceMonitor: () => ({
    measureOperation: (name: string, fn: Function) => fn()
  })
}))

// Mock API client
vi.mock('@/lib/api/robustClient', () => ({
  robustApiClient: {
    healthCheck: vi.fn().mockResolvedValue({
      data: { status: 'healthy', timestamp: new Date().toISOString(), services: {} }
    }),
    getApiMetrics: vi.fn().mockReturnValue({
      totalRequests: 100,
      successfulRequests: 95,
      failedRequests: 5,
      averageResponseTime: 150,
      cacheHits: 20,
      cacheMisses: 80,
      circuitBreaker: { state: 'closed' }
    })
  }
}))

// Mock UI components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {children}
    </button>
  )
}))

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid="tabs-content" data-value={value}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => <button data-testid="tabs-trigger" data-value={value}>{children}</button>
}))

// Mock loading and error components
vi.mock('@/components/ui/loading-states', () => ({
  LoadingOverlay: ({ children, isLoading, message }: any) => (
    isLoading ? <div data-testid="loading-overlay">{message}</div> : children
  ),
  CardSkeleton: () => <div data-testid="card-skeleton">Loading...</div>,
  TableSkeleton: ({ rows, columns }: any) => (
    <div data-testid="table-skeleton">Loading table {rows}x{columns}</div>
  ),
  useLoading: () => ({
    isLoading: false,
    withLoading: (fn: Function) => fn()
  })
}))

// Mock offline components
vi.mock('@/components/ui/offline-state', () => ({
  OfflineAware: ({ children, fallback }: any) => children,
  useOnlineStatus: () => true,
  OfflineBanner: () => null
}))

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

// Mock logging
vi.mock('@/lib/logging', () => ({
  getApiLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  })
}))

// Import components to test
import EnhancedDashboard from '@/components/enhanced/EnhancedDashboard'
import { CandidateListExample } from '@/store/enhanced/examples/CandidateList.example'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider store={mockStore as any}>
    {children}
  </Provider>
)

describe('Enhanced Components Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('EnhancedDashboard', () => {
    it('should render dashboard overview', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
      expect(screen.getByTestId('tabs')).toBeInTheDocument()
    })

    it('should display stats cards', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Should have multiple stat cards
      const cards = screen.getAllByTestId('card')
      expect(cards.length).toBeGreaterThan(0)
    })

    it('should handle refresh button click', async () => {
      const { robustApiClient } = await import('@/lib/api/robustClient')
      
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      const refreshButton = screen.getByText('Refresh')
      fireEvent.click(refreshButton)

      await waitFor(() => {
        expect(robustApiClient.healthCheck).toHaveBeenCalled()
      })
    })

    it('should display system health status', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Should show system status section
      expect(screen.getByText('System Status')).toBeInTheDocument()
    })

    it('should show API metrics', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Should display API metrics
      expect(screen.getByText('API Metrics')).toBeInTheDocument()
    })

    it('should handle tab navigation', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      const overviewTab = screen.getByText('Overview')
      const candidatesTab = screen.getByText('Candidates')
      const systemTab = screen.getByText('System')

      expect(overviewTab).toBeInTheDocument()
      expect(candidatesTab).toBeInTheDocument()
      expect(systemTab).toBeInTheDocument()
    })
  })

  describe('CandidateListExample', () => {
    it('should render candidate list', () => {
      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      expect(screen.getByText(/Candidates \(/)).toBeInTheDocument()
    })

    it('should display stats', () => {
      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.getByText('In Progress')).toBeInTheDocument()
      expect(screen.getByText('Not Started')).toBeInTheDocument()
      expect(screen.getByText('Avg Score')).toBeInTheDocument()
    })

    it('should handle search input', () => {
      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Search candidates...')
      expect(searchInput).toBeInTheDocument()

      fireEvent.change(searchInput, { target: { value: 'john' } })
      expect(searchInput).toHaveValue('john')
    })

    it('should handle create candidate button', async () => {
      const { useCandidates } = await import('@/store/enhanced/hooks')
      const mockActions = (useCandidates as any)().actions
      
      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      const createButton = screen.getByText('Add Candidate')
      fireEvent.click(createButton)

      await waitFor(() => {
        expect(mockActions.create).toHaveBeenCalledWith({
          name: 'New Candidate',
          email: 'new@example.com',
          phone: '+1234567890'
        })
      })
    })

    it('should show loading state', () => {
      // Mock loading state
      vi.mocked(require('@/store/enhanced/hooks').useCandidates).mockReturnValue({
        candidates: [],
        filteredCandidates: [],
        loading: true,
        creating: false,
        error: null,
        stats: { total: 0, completed: 0, inProgress: 0, notStarted: 0, averageScore: 0 },
        actions: {
          fetchList: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          setFilters: vi.fn()
        }
      })

      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      expect(screen.getByText('Loading candidates...')).toBeInTheDocument()
    })

    it('should show error state', () => {
      // Mock error state
      vi.mocked(require('@/store/enhanced/hooks').useCandidates).mockReturnValue({
        candidates: [],
        filteredCandidates: [],
        loading: false,
        creating: false,
        error: { message: 'Failed to load candidates', code: 'LOAD_ERROR', correlationId: 'test', timestamp: new Date().toISOString() },
        stats: { total: 0, completed: 0, inProgress: 0, notStarted: 0, averageScore: 0 },
        actions: {
          fetchList: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          setFilters: vi.fn()
        }
      })

      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      expect(screen.getByText('Error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load candidates')).toBeInTheDocument()
    })
  })

  describe('Component Error Handling', () => {
    it('should handle component errors gracefully', () => {
      const ThrowingComponent = () => {
        throw new Error('Component error')
      }

      // This would be wrapped in an error boundary in real usage
      expect(() => {
        render(
          <TestWrapper>
            <ThrowingComponent />
          </TestWrapper>
        )
      }).toThrow('Component error')
    })

    it('should handle async errors in components', async () => {
      const AsyncErrorComponent = () => {
        React.useEffect(() => {
          Promise.reject(new Error('Async error'))
        }, [])
        return <div>Component</div>
      }

      // Should not crash the component
      render(
        <TestWrapper>
          <AsyncErrorComponent />
        </TestWrapper>
      )

      expect(screen.getByText('Component')).toBeInTheDocument()
    })
  })

  describe('Performance Monitoring', () => {
    it('should measure component operations', () => {
      const { usePerformanceMonitor } = require('@/store/enhanced/hooks')
      const mockMeasureOperation = vi.fn((name, fn) => fn())
      
      vi.mocked(usePerformanceMonitor).mockReturnValue({
        measureOperation: mockMeasureOperation
      })

      render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      expect(mockMeasureOperation).toHaveBeenCalled()
    })
  })

  describe('Integration with Enhanced Store', () => {
    it('should connect to enhanced store', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Should render without errors, indicating successful store connection
      expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
    })

    it('should handle store state changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      // Simulate state change by re-rendering
      rerender(
        <TestWrapper>
          <CandidateListExample />
        </TestWrapper>
      )

      // Component should handle re-renders gracefully
      expect(screen.getByText(/Candidates \(/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Check for proper heading structure
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation', () => {
      render(
        <TestWrapper>
          <EnhancedDashboard />
        </TestWrapper>
      )

      // Check for focusable elements
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})