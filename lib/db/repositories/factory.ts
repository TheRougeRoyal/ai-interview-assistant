/**
 * Repository factory for dependency injection and centralized repository management
 */

import { PrismaClient } from '@prisma/client'
import { prisma } from '../client'
import type { BaseRepository, RepositoryConfig } from './base'

/**
 * Repository registry interface
 */
export interface RepositoryRegistry {
  [key: string]: any
}

/**
 * Repository factory configuration
 */
export interface RepositoryFactoryConfig {
  client?: PrismaClient
  defaultConfig?: RepositoryConfig
  enableSingleton?: boolean
}

/**
 * Repository factory class for managing repository instances
 */
export class RepositoryFactory {
  private static instance: RepositoryFactory
  private repositories: Map<string, any> = new Map()
  private client: PrismaClient
  private defaultConfig: RepositoryConfig
  private enableSingleton: boolean

  constructor(config: RepositoryFactoryConfig = {}) {
    this.client = config.client || prisma
    this.defaultConfig = config.defaultConfig || {
      enableLogging: true,
      enablePerformanceTracking: true,
      defaultTimeout: 30000,
      retryAttempts: 3
    }
    this.enableSingleton = config.enableSingleton ?? true
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: RepositoryFactoryConfig): RepositoryFactory {
    if (!RepositoryFactory.instance) {
      RepositoryFactory.instance = new RepositoryFactory(config)
    }
    return RepositoryFactory.instance
  }

  /**
   * Register a repository class
   */
  register<T>(
    name: string, 
    repositoryClass: new (config?: RepositoryConfig) => T,
    config?: RepositoryConfig
  ): void {
    if (this.enableSingleton) {
      // Create singleton instance
      const instance = new repositoryClass({ ...this.defaultConfig, ...config })
      this.repositories.set(name, instance)
    } else {
      // Store class for later instantiation
      this.repositories.set(name, { 
        class: repositoryClass, 
        config: { ...this.defaultConfig, ...config } 
      })
    }
  }

  /**
   * Get repository instance
   */
  get<T>(name: string): T {
    const entry = this.repositories.get(name)
    
    if (!entry) {
      throw new Error(`Repository '${name}' not found. Make sure to register it first.`)
    }

    if (this.enableSingleton) {
      return entry as T
    } else {
      // Create new instance each time
      return new entry.class(entry.config) as T
    }
  }

  /**
   * Check if repository is registered
   */
  has(name: string): boolean {
    return this.repositories.has(name)
  }

  /**
   * Unregister repository
   */
  unregister(name: string): void {
    this.repositories.delete(name)
  }

  /**
   * Clear all repositories
   */
  clear(): void {
    this.repositories.clear()
  }

  /**
   * Get all registered repository names
   */
  getRegisteredNames(): string[] {
    return Array.from(this.repositories.keys())
  }

  /**
   * Get Prisma client instance
   */
  getClient(): PrismaClient {
    return this.client
  }

  /**
   * Update default configuration
   */
  updateDefaultConfig(config: Partial<RepositoryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config }
  }
}

/**
 * Repository decorator for automatic registration
 */
export function Repository(name: string, config?: RepositoryConfig) {
  return function <T extends new (...args: any[]) => any>(constructor: T) {
    // Register the repository with the factory
    const factory = RepositoryFactory.getInstance()
    factory.register(name, constructor, config)
    
    return constructor
  }
}

/**
 * Inject repository decorator for dependency injection
 */
export function InjectRepository(name: string) {
  return function (target: any, propertyKey: string) {
    // Define getter that retrieves repository from factory
    Object.defineProperty(target, propertyKey, {
      get() {
        const factory = RepositoryFactory.getInstance()
        return factory.get(name)
      },
      enumerable: true,
      configurable: true
    })
  }
}

/**
 * Global repository factory instance
 */
export const repositoryFactory = RepositoryFactory.getInstance()

/**
 * Convenience functions for repository management
 */
export const Repositories = {
  /**
   * Register a repository
   */
  register<T>(
    name: string, 
    repositoryClass: new (config?: RepositoryConfig) => T,
    config?: RepositoryConfig
  ): void {
    repositoryFactory.register(name, repositoryClass, config)
  },

  /**
   * Get a repository
   */
  get<T>(name: string): T {
    return repositoryFactory.get<T>(name)
  },

  /**
   * Check if repository exists
   */
  has(name: string): boolean {
    return repositoryFactory.has(name)
  },

  /**
   * Get Prisma client
   */
  getClient(): PrismaClient {
    return repositoryFactory.getClient()
  }
}

/**
 * Repository names constants for type safety
 */
export const RepositoryNames = {
  CANDIDATES: 'candidates',
  SESSIONS: 'sessions',
  ANSWERS: 'answers',
  USERS: 'users',
  USER_SESSIONS: 'userSessions',
  SCORES: 'scores'
} as const

export type RepositoryName = typeof RepositoryNames[keyof typeof RepositoryNames]