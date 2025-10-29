/**
 * Enhanced state persistence with error recovery and migration support
 */

import { EnhancedRootState } from './types'
import { getApiLogger } from '@/lib/logging'

/**
 * State persistence configuration
 */
export interface PersistenceConfig {
  key: string
  version: number
  whitelist: string[]
  blacklist: string[]
  throttleMs: number
  maxRetries: number
}

const defaultConfig: PersistenceConfig = {
  key: 'enhanced-redux-state',
  version: 1,
  whitelist: ['ui', 'cache'],
  blacklist: ['entities', 'collections', 'loading', 'errors', 'optimistic', 'legacy'],
  throttleMs: 1000,
  maxRetries: 3
}

/**
 * Enhanced state persistence manager
 */
export class StatePersistenceManager {
  private config: PersistenceConfig
  private logger = getApiLogger()
  private saveTimeout: NodeJS.Timeout | null = null
  private retryCount = 0

  constructor(config: Partial<PersistenceConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
  }

  /**
   * Save state to localStorage with error handling and throttling
   */
  async saveState(state: EnhancedRootState): Promise<void> {
    if (typeof window === 'undefined') return

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    // Throttle saves
    this.saveTimeout = setTimeout(async () => {
      try {
        const persistableState = this.extractPersistableState(state)
        const serializedState = JSON.stringify({
          version: this.config.version,
          timestamp: Date.now(),
          state: persistableState
        })

        localStorage.setItem(this.config.key, serializedState)
        this.retryCount = 0 // Reset retry count on success

        this.logger.debug('State persisted successfully', {
          size: serializedState.length,
          timestamp: Date.now()
        })
      } catch (error) {
        this.handleSaveError(error, state)
      }
    }, this.config.throttleMs)
  }

  /**
   * Load state from localStorage with error recovery
   */
  async loadState(): Promise<Partial<EnhancedRootState> | null> {
    if (typeof window === 'undefined') return null

    try {
      const serializedState = localStorage.getItem(this.config.key)
      if (!serializedState) return null

      const { version, timestamp, state } = JSON.parse(serializedState)

      // Check version compatibility
      if (version !== this.config.version) {
        this.logger.warn('State version mismatch, attempting migration', {
          stored: version,
          current: this.config.version
        })
        return this.migrateState(state, version)
      }

      // Check if state is too old (older than 7 days)
      const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days
      if (Date.now() - timestamp > maxAge) {
        this.logger.info('Persisted state is too old, ignoring')
        return null
      }

      this.logger.debug('State loaded successfully', {
        version,
        timestamp,
        age: Date.now() - timestamp
      })

      return state
    } catch (error) {
      this.handleLoadError(error)
      return null
    }
  }

  /**
   * Clear persisted state
   */
  async clearState(): Promise<void> {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem(this.config.key)
      this.logger.info('Persisted state cleared')
    } catch (error) {
      this.logger.error('Failed to clear persisted state', error)
    }
  }

  /**
   * Extract only the persistable parts of the state
   */
  private extractPersistableState(state: EnhancedRootState): Partial<EnhancedRootState> {
    const persistable: any = {}

    // Include whitelisted keys
    this.config.whitelist.forEach(key => {
      if (key in state) {
        persistable[key] = (state as any)[key]
      }
    })

    // Exclude blacklisted keys
    this.config.blacklist.forEach(key => {
      delete persistable[key]
    })

    // Always exclude sensitive data
    if (persistable.legacy?.auth) {
      persistable.legacy = {
        ...persistable.legacy,
        auth: {
          ...persistable.legacy.auth,
          token: null, // Never persist tokens
          user: null   // Never persist user data
        }
      }
    }

    return persistable
  }

  /**
   * Handle save errors with retry logic
   */
  private async handleSaveError(error: any, state: EnhancedRootState): Promise<void> {
    this.retryCount++
    
    this.logger.error('Failed to persist state', error, {
      retryCount: this.retryCount,
      maxRetries: this.config.maxRetries
    })

    // Try to recover from quota exceeded errors
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      await this.handleQuotaExceeded(state)
      return
    }

    // Retry if under limit
    if (this.retryCount < this.config.maxRetries) {
      setTimeout(() => {
        this.saveState(state)
      }, 1000 * this.retryCount) // Exponential backoff
    }
  }

  /**
   * Handle localStorage quota exceeded
   */
  private async handleQuotaExceeded(state: EnhancedRootState): Promise<void> {
    this.logger.warn('localStorage quota exceeded, attempting cleanup')

    try {
      // Clear old cache entries
      const cacheKeys = Object.keys(state.cache || {})
      const sortedKeys = cacheKeys.sort((a, b) => {
        const aTime = state.cache[a]?.lastFetched || 0
        const bTime = state.cache[b]?.lastFetched || 0
        return aTime - bTime // Oldest first
      })

      // Remove oldest 50% of cache entries
      const keysToRemove = sortedKeys.slice(0, Math.floor(sortedKeys.length / 2))
      const cleanedState = {
        ...state,
        cache: Object.fromEntries(
          Object.entries(state.cache || {}).filter(([key]) => !keysToRemove.includes(key))
        )
      }

      // Try to save cleaned state
      await this.saveState(cleanedState)
    } catch (cleanupError) {
      this.logger.error('Failed to cleanup state for quota', cleanupError)
      // As last resort, clear all persisted state
      await this.clearState()
    }
  }

  /**
   * Handle load errors
   */
  private handleLoadError(error: any): void {
    this.logger.error('Failed to load persisted state', error)

    // If JSON is corrupted, clear it
    if (error instanceof SyntaxError) {
      this.logger.warn('Corrupted persisted state detected, clearing')
      this.clearState()
    }
  }

  /**
   * Migrate state between versions
   */
  private migrateState(state: any, fromVersion: number): Partial<EnhancedRootState> | null {
    try {
      let migratedState = state

      // Migration from version 0 to 1
      if (fromVersion === 0) {
        migratedState = {
          ...state,
          ui: {
            ...state.ui,
            theme: state.ui?.theme || 'system',
            toasts: state.ui?.toasts || []
          },
          cache: state.cache || {}
        }
      }

      this.logger.info('State migration completed', {
        from: fromVersion,
        to: this.config.version
      })

      return migratedState
    } catch (error) {
      this.logger.error('State migration failed', error, {
        from: fromVersion,
        to: this.config.version
      })
      return null
    }
  }

  /**
   * Validate state structure
   */
  validateState(state: any): boolean {
    try {
      // Basic structure validation
      if (!state || typeof state !== 'object') return false

      // Validate UI state if present
      if (state.ui) {
        if (typeof state.ui !== 'object') return false
        if (state.ui.theme && !['light', 'dark', 'system'].includes(state.ui.theme)) {
          return false
        }
      }

      // Validate cache state if present
      if (state.cache) {
        if (typeof state.cache !== 'object') return false
        
        // Validate cache entries
        for (const [key, value] of Object.entries(state.cache)) {
          if (typeof value !== 'object' || !value) return false
          const cacheEntry = value as any
          if (typeof cacheEntry.lastFetched !== 'number' ||
              typeof cacheEntry.isStale !== 'boolean' ||
              typeof cacheEntry.ttl !== 'number') {
            return false
          }
        }
      }

      return true
    } catch (error) {
      this.logger.error('State validation failed', error)
      return false
    }
  }

  /**
   * Get persistence statistics
   */
  getStats(): {
    size: number
    lastSaved: number | null
    version: number
  } {
    if (typeof window === 'undefined') {
      return { size: 0, lastSaved: null, version: this.config.version }
    }

    try {
      const serializedState = localStorage.getItem(this.config.key)
      if (!serializedState) {
        return { size: 0, lastSaved: null, version: this.config.version }
      }

      const { timestamp } = JSON.parse(serializedState)
      return {
        size: serializedState.length,
        lastSaved: timestamp,
        version: this.config.version
      }
    } catch (error) {
      return { size: 0, lastSaved: null, version: this.config.version }
    }
  }
}

/**
 * Default persistence manager instance
 */
export const persistenceManager = new StatePersistenceManager()

/**
 * Persistence middleware for automatic state saving
 */
export const createPersistenceMiddleware = (manager: StatePersistenceManager = persistenceManager) => {
  return (store: any) => (next: any) => (action: any) => {
    const result = next(action)

    // Only persist on certain actions
    const persistableActions = [
      'entities/',
      'collections/',
      'ui/setTheme',
      'ui/setSelections',
      'ui/setFilters',
      'ui/setPagination',
      'cache/'
    ]

    const shouldPersist = persistableActions.some(prefix => 
      action.type.startsWith(prefix)
    )

    if (shouldPersist) {
      const state = store.getState()
      manager.saveState(state).catch(error => {
        console.warn('Failed to persist state:', error)
      })
    }

    return result
  }
}