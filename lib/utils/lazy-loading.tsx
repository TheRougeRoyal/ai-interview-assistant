/**
 * Code Splitting Utilities
 * Dynamic imports for route-based and component-based code splitting
 */

import dynamic from 'next/dynamic'
import type { ComponentType } from 'react'

/**
 * Loading component shown during lazy loading
 */
export function DefaultLoadingComponent() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  )
}

/**
 * Error component shown when lazy loading fails
 */
export function DefaultErrorComponent({ error }: { error: Error }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-2">
        <p className="text-destructive font-medium">Failed to load component</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}

/**
 * Create a lazily loaded component
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  ssr = true
) {
  return dynamic(importFn, {
    loading: DefaultLoadingComponent,
    ssr,
  })
}

/**
 * Lazy-loaded dashboard components
 */
export const LazyIntervieweeDashboard = createLazyComponent(
  () => import('@/components/dashboards/IntervieweeDashboard')
)

export const LazyInterviewerDashboard = createLazyComponent(
  () => import('@/components/dashboards/InterviewerDashboard')
)

export const LazyEnhancedDashboard = createLazyComponent(
  () => import('@/components/enhanced/EnhancedDashboard')
)

/**
 * Lazy-loaded modal components
 */
export const LazyWelcomeBackModal = dynamic(
  () => import('@/components/modals/WelcomeBackModal').then(mod => ({ default: mod.WelcomeBackModal })),
  { loading: DefaultLoadingComponent, ssr: false }
)

export const LazyCandidateDetailDrawer = dynamic(
  () => import('@/components/dashboard/CandidateDetailDrawer').then(mod => ({ default: mod.CandidateDetailDrawer })),
  { loading: DefaultLoadingComponent, ssr: false }
)

/**
 * Lazy-loaded table components (for large lists)
 */
export const LazyVirtualizedCandidateTable = dynamic(
  () => import('@/components/dashboard/VirtualizedCandidateTable').then(mod => ({
    default: mod.VirtualizedCandidateTable
  })),
  { loading: DefaultLoadingComponent, ssr: false }
)

/**
 * Lazy-loaded PDF components
 */
export const LazyPDFAssessmentUpload = createLazyComponent(
  () => import('@/components/pdf-assessment/PDFAssessmentUpload'),
  false
)

export const LazyEnhancedResumeUploader = createLazyComponent(
  () => import('@/components/enhanced/EnhancedResumeUploader'),
  false
)

/**
 * Preload a component (useful for prefetching on hover/focus)
 */
export function preloadComponent(importFn: () => Promise<any>) {
  return importFn()
}
