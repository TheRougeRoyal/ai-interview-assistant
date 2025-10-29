/**
 * Correlation ID utilities for request tracing
 * Provides correlation ID generation, storage, and retrieval for tracking requests across the system
 */

import { AsyncLocalStorage } from 'async_hooks'

/**
 * Correlation context interface
 */
export interface CorrelationContext {
    correlationId: string
    requestId?: string
    userId?: string
    sessionId?: string
    startTime: number
    metadata?: Record<string, any>
}

/**
 * Async local storage for correlation context
 */
const correlationStorage = new AsyncLocalStorage<CorrelationContext>()

/**
 * Generate a unique correlation ID
 */
export function generateCorrelationId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substr(2, 9)
    return `${timestamp}-${random}`
}

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
    return `req_${generateCorrelationId()}`
}

/**
 * Set correlation context for the current async context
 */
export function setCorrelationContext(context: CorrelationContext): void {
    correlationStorage.enterWith(context)
}

/**
 * Get the current correlation context
 */
export function getCorrelationContext(): CorrelationContext | undefined {
    return correlationStorage.getStore()
}

/**
 * Get the current correlation ID
 */
export function getCorrelationId(): string {
    const context = getCorrelationContext()
    return context?.correlationId || generateCorrelationId()
}

/**
 * Get the current request ID
 */
export function getRequestId(): string | undefined {
    const context = getCorrelationContext()
    return context?.requestId
}

/**
 * Get the current user ID from context
 */
export function getCurrentUserId(): string | undefined {
    const context = getCorrelationContext()
    return context?.userId
}

/**
 * Get the current session ID from context
 */
export function getCurrentSessionId(): string | undefined {
    const context = getCorrelationContext()
    return context?.sessionId
}

/**
 * Create a new correlation context
 */
export function createCorrelationContext(
    correlationId?: string,
    requestId?: string,
    userId?: string,
    sessionId?: string,
    metadata?: Record<string, any>
): CorrelationContext {
    return {
        correlationId: correlationId || generateCorrelationId(),
        requestId: requestId || generateRequestId(),
        userId,
        sessionId,
        startTime: Date.now(),
        metadata
    }
}

/**
 * Run a function with correlation context
 */
export function withCorrelationContext<T>(
    context: CorrelationContext,
    fn: () => T
): T {
    return correlationStorage.run(context, fn)
}

/**
 * Run an async function with correlation context
 */
export async function withCorrelationContextAsync<T>(
    context: CorrelationContext,
    fn: () => Promise<T>
): Promise<T> {
    return correlationStorage.run(context, fn)
}

/**
 * Update the current correlation context
 */
export function updateCorrelationContext(updates: Partial<CorrelationContext>): void {
    const current = getCorrelationContext()
    if (current) {
        const updated = { ...current, ...updates }
        setCorrelationContext(updated)
    }
}

/**
 * Add metadata to the current correlation context
 */
export function addCorrelationMetadata(key: string, value: any): void {
    const current = getCorrelationContext()
    if (current) {
        const metadata = { ...current.metadata, [key]: value }
        updateCorrelationContext({ metadata })
    }
}

/**
 * Get correlation metadata
 */
export function getCorrelationMetadata(key?: string): any {
    const context = getCorrelationContext()
    if (!context?.metadata) return undefined

    return key ? context.metadata[key] : context.metadata
}

/**
 * Extract correlation ID from various sources
 */
export function extractCorrelationId(
    headers?: Record<string, string | string[] | undefined>,
    query?: Record<string, string | string[] | undefined>
): string | undefined {
    // Try to get from headers first
    if (headers) {
        const headerValue = headers['x-correlation-id'] ||
            headers['X-Correlation-ID'] ||
            headers['correlation-id']

        if (typeof headerValue === 'string') {
            return headerValue
        }
        if (Array.isArray(headerValue) && headerValue.length > 0) {
            return headerValue[0]
        }
    }

    // Try to get from query parameters
    if (query) {
        const queryValue = query['correlationId'] || query['correlation_id']

        if (typeof queryValue === 'string') {
            return queryValue
        }
        if (Array.isArray(queryValue) && queryValue.length > 0) {
            return queryValue[0]
        }
    }

    return undefined
}

/**
 * Create correlation headers for outgoing requests
 */
export function createCorrelationHeaders(): Record<string, string> {
    const correlationId = getCorrelationId()
    const requestId = getRequestId()

    const headers: Record<string, string> = {
        'X-Correlation-ID': correlationId
    }

    if (requestId) {
        headers['X-Request-ID'] = requestId
    }

    return headers
}

/**
 * Correlation ID middleware for Next.js API routes
 */
export function withCorrelationId<T extends (...args: any[]) => any>(
    handler: T
): T {
    return (async (...args: any[]) => {
        const [req] = args

        // Extract correlation ID from request
        const existingCorrelationId = extractCorrelationId(
            req.headers,
            req.query
        )

        // Create correlation context
        const context = createCorrelationContext(
            existingCorrelationId,
            generateRequestId(),
            req.user?.id, // Assuming user is attached to request
            req.sessionId // Assuming session ID is attached to request
        )

        // Run handler with correlation context
        return withCorrelationContextAsync(context, () => handler(...args))
    }) as T
}

/**
 * Get request duration from correlation context
 */
export function getRequestDuration(): number {
    const context = getCorrelationContext()
    if (!context) return 0

    return Date.now() - context.startTime
}

/**
 * Create a child correlation context for nested operations
 */
export function createChildCorrelationContext(
    operation: string,
    metadata?: Record<string, any>
): CorrelationContext {
    const parent = getCorrelationContext()
    const parentId = parent?.correlationId || generateCorrelationId()

    return createCorrelationContext(
        `${parentId}.${operation}`,
        generateRequestId(),
        parent?.userId,
        parent?.sessionId,
        { ...parent?.metadata, ...metadata, parentCorrelationId: parentId }
    )
}