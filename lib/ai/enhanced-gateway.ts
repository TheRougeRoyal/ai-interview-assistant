/**
 * Enhanced AI Gateway with Circuit Breaker, Retry, and Fallback
 * Provides robust error handling and resilience for AI service calls
 */

import { z } from "zod"
import { QuestionSchema, type Question } from "./schemas/question"
import { RubricSchema, type Rubric } from "./schemas/rubric"
import { SummarySchema, type Summary } from "./schemas/summary"
import { ResumeAnalysisSchema, type ResumeAnalysis } from "./schemas/resume"

import * as openaiVendor from "./vendors/openai"
import * as mockVendor from "./vendors/mock"
import * as deepseekVendor from "./vendors/deepseek"

import { circuitBreakerRegistry, CircuitState } from "./circuit-breaker"
import { retryWithBackoff, DEFAULT_RETRY_CONFIG, retryStats } from "./retry"
import { fallbackHandler, type FallbackConfig } from "./fallback"
import { getAiServiceLogger } from "../logging"
import { ErrorCodes } from "../errors/types"
import { generateCorrelationId } from "../errors/correlation"

const logger = getAiServiceLogger()

export type Task = "generate_question" | "score" | "summary" | "analyze_resume"

export type TaskResult<TTask extends Task> = TTask extends "generate_question"
  ? Question
  : TTask extends "score"
  ? Rubric
  : TTask extends "summary"
  ? Summary
  : TTask extends "analyze_resume"
  ? ResumeAnalysis
  : never

export type NormalizedError = { 
  code: string
  message: string
  correlationId?: string
  retryable?: boolean
}

export interface AiGatewayConfig {
  enableCircuitBreaker: boolean
  enableRetry: boolean
  enableFallback: boolean
  enableCaching: boolean
  enableValidation: boolean
  fallbackConfig?: FallbackConfig
}

/**
 * Default configuration for AI gateway
 */
const DEFAULT_CONFIG: AiGatewayConfig = {
  enableCircuitBreaker: true,
  enableRetry: true,
  enableFallback: true,
  enableCaching: true,
  enableValidation: true
}

// Current configuration (can be updated at runtime)
let currentConfig: AiGatewayConfig = { ...DEFAULT_CONFIG }

/**
 * Update AI gateway configuration
 */
export function configureAiGateway(config: Partial<AiGatewayConfig>): void {
  currentConfig = { ...currentConfig, ...config }
  logger.info('AI gateway configuration updated', { config: currentConfig })
}

/**
 * Get current AI gateway configuration
 */
export function getAiGatewayConfig(): AiGatewayConfig {
  return { ...currentConfig }
}

function getVendor(): "openai" | "mock" | "deepseek" {
  const value = process.env.AI_VENDOR?.toLowerCase()
  if (value === "openai") return "openai"
  if (value === "deepseek") return "deepseek"
  return "mock"
}

function getModule() {
  const vendor = getVendor()
  if (vendor === "openai") return openaiVendor
  if (vendor === "deepseek") return deepseekVendor
  return mockVendor
}

function getSchema(task: Task): z.ZodTypeAny {
  switch (task) {
    case "generate_question":
      return QuestionSchema
    case "score":
      return RubricSchema
    case "summary":
      return SummarySchema
    case "analyze_resume":
      return ResumeAnalysisSchema
    default: {
      const neverTask: never = task
      throw normalizeError({
        code: "UNSUPPORTED_TASK",
        message: `Unsupported task: ${String(neverTask)}`,
      })
    }
  }
}

/**
 * Validate request payload before sending to AI
 */
function validatePayload(task: Task, payload: unknown): void {
  // Define validation schemas for each task
  const payloadSchemas: Record<Task, z.ZodTypeAny> = {
    generate_question: z.object({
      difficulty: z.enum(["easy", "medium", "hard"]),
      role: z.string().min(1),
      resumeContext: z.string().optional()
    }),
    score: z.object({
      question: z.string().min(1),
      answer: z.string().min(1),
      durationMs: z.number().positive(),
      timeTakenMs: z.number().nonnegative()
    }),
    summary: z.object({
      rubrics: z.array(RubricSchema).min(1)
    }),
    analyze_resume: z.object({
      resumeText: z.string().min(10)
    })
  }

  const schema = payloadSchemas[task]
  const result = schema.safeParse(payload)
  
  if (!result.success) {
    logger.warn('Payload validation failed', {
      task,
      errors: result.error.errors
    })
    
    throw {
      code: ErrorCodes.VALIDATION_FAILED,
      message: `Invalid payload for ${task}: ${result.error.message}`,
      details: result.error.errors
    }
  }
}

/**
 * Validate response from AI before returning
 */
function validateResponse<T>(task: Task, raw: unknown, schema: z.ZodTypeAny): T {
  const result = schema.safeParse(raw)
  
  if (!result.success) {
    logger.error('Response validation failed', undefined, {
      task,
      errors: result.error.errors,
      rawResponse: raw
    })
    
    throw {
      code: ErrorCodes.SCHEMA_VALIDATION_FAILED,
      message: `Invalid AI response for ${task}: ${result.error.message}`,
      details: result.error.errors
    }
  }

  return result.data as T
}

export function normalizeError(e: unknown): NormalizedError {
  if (typeof e === "object" && e !== null) {
    const maybe = e as { 
      code?: unknown
      message?: unknown
      correlationId?: unknown
      retryable?: unknown
    }
    
    const code = typeof maybe.code === "string" ? maybe.code : undefined
    const message = typeof maybe.message === "string" ? maybe.message : undefined
    const correlationId = typeof maybe.correlationId === "string" ? maybe.correlationId : undefined
    const retryable = typeof maybe.retryable === "boolean" ? maybe.retryable : undefined
    
    if (code && message) {
      return { code, message, correlationId, retryable }
    }
  }

  if (e instanceof z.ZodError) {
    return { 
      code: ErrorCodes.SCHEMA_VALIDATION_FAILED, 
      message: e.message,
      retryable: false
    }
  }

  if (e instanceof Error) {
    return { 
      code: e.name || "UNKNOWN_ERROR", 
      message: e.message,
      retryable: false
    }
  }

  return { 
    code: "UNKNOWN_ERROR", 
    message: String(e),
    retryable: false
  }
}

/**
 * Execute AI task with vendor-specific implementation
 */
async function executeTask<TTask extends Task>(
  task: TTask,
  payload: unknown,
  mod: typeof openaiVendor | typeof mockVendor | typeof deepseekVendor
): Promise<unknown> {
  switch (task) {
    case "generate_question":
      return await (mod.generate_question as (p: unknown) => Promise<unknown>)(payload)
    case "score":
      return await (mod.score as (p: unknown) => Promise<unknown>)(payload)
    case "summary":
      return await (mod.summary as (p: unknown) => Promise<unknown>)(payload)
    case "analyze_resume":
      return await (mod.analyze_resume as (p: unknown) => Promise<unknown>)(payload)
    default: {
      const neverTask: never = task as never
      throw { 
        code: ErrorCodes.UNSUPPORTED_TASK, 
        message: `Unsupported task: ${String(neverTask)}` 
      }
    }
  }
}

/**
 * Enhanced ask function with circuit breaker, retry, and fallback
 */
export async function ask<TTask extends Task>(
  task: TTask,
  payload: unknown
): Promise<TaskResult<TTask>> {
  const correlationId = generateCorrelationId()
  const startTime = Date.now()
  const vendor = getVendor()

  logger.info('AI request started', {
    task,
    vendor,
    correlationId,
    config: currentConfig
  })

  try {
    // Validate request payload if enabled
    if (currentConfig.enableValidation) {
      validatePayload(task, payload)
    }

    // Get circuit breaker for this vendor
    const circuitBreaker = currentConfig.enableCircuitBreaker
      ? circuitBreakerRegistry.get(`ai-${vendor}`)
      : null

    // Check circuit breaker state
    if (circuitBreaker && !circuitBreaker.isAvailable()) {
      logger.warn('Circuit breaker is OPEN, attempting fallback', {
        task,
        vendor,
        correlationId,
        circuitState: circuitBreaker.getState()
      })
      
      // Try fallback immediately if circuit is open
      if (currentConfig.enableFallback) {
        const fallbackResult = await handleFallback(task, payload, {
          code: ErrorCodes.SERVICE_UNAVAILABLE,
          message: 'Circuit breaker is OPEN'
        })
        return fallbackResult as TaskResult<TTask>
      }
      
      throw {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: `AI service ${vendor} is temporarily unavailable (circuit breaker OPEN)`
      }
    }

    // Define the core AI call function
    const aiCall = async (): Promise<unknown> => {
      const mod = getModule()
      const raw = await executeTask(task, payload, mod)
      
      // Validate response if enabled
      if (currentConfig.enableValidation) {
        const schema = getSchema(task)
        return validateResponse(task, raw, schema)
      }
      
      return raw
    }

    // Wrap with circuit breaker if enabled
    const protectedCall = circuitBreaker
      ? () => circuitBreaker.execute(aiCall)
      : aiCall

    // Execute with retry if enabled
    let result: unknown
    if (currentConfig.enableRetry) {
      const retryResult = await retryWithBackoff(
        protectedCall,
        DEFAULT_RETRY_CONFIG,
        `${task}-${vendor}`
      )
      result = retryResult.result
      
      // Record retry stats
      retryStats.recordSuccess(retryResult.attempts, retryResult.totalTime)
      
      logger.info('AI request completed with retry', {
        task,
        vendor,
        correlationId,
        attempts: retryResult.attempts,
        totalTime: retryResult.totalTime
      })
    } else {
      result = await protectedCall()
      
      logger.info('AI request completed', {
        task,
        vendor,
        correlationId,
        duration: Date.now() - startTime
      })
    }

    // Cache result if enabled
    if (currentConfig.enableCaching) {
      fallbackHandler.cacheResult(task, payload, result, correlationId)
    }

    return result as TaskResult<TTask>
    
  } catch (e) {
    const err = normalizeError(e)
    err.correlationId = correlationId
    
    const duration = Date.now() - startTime
    
    logger.error('AI request failed', undefined, {
      task,
      vendor,
      correlationId,
      duration,
      error: err
    })

    // Try fallback if enabled
    if (currentConfig.enableFallback) {
      try {
        const fallbackResult = await handleFallback(task, payload, err)
        
        logger.info('Fallback successful', {
          task,
          vendor,
          correlationId
        })
        
        return fallbackResult as TaskResult<TTask>
      } catch (fallbackError) {
        logger.error('Fallback also failed', undefined, {
          task,
          vendor,
          correlationId,
          originalError: err,
          fallbackError: normalizeError(fallbackError)
        })
      }
    }

    throw err
  }
}

/**
 * Handle fallback for different task types
 */
async function handleFallback(task: Task, payload: unknown, error: NormalizedError): Promise<unknown> {
  switch (task) {
    case "generate_question":
      return await fallbackHandler.handleQuestionFallback(payload, error)
    case "score":
      return await fallbackHandler.handleScoreFallback(payload, error)
    case "summary":
      return await fallbackHandler.handleSummaryFallback(payload, error)
    case "analyze_resume":
      return await fallbackHandler.handleResumeAnalysisFallback(payload, error)
    default:
      throw error
  }
}

/**
 * Get AI service health status
 */
export function getAiServiceHealth() {
  const vendor = getVendor()
  const circuitBreaker = circuitBreakerRegistry.get(`ai-${vendor}`)
  
  return {
    vendor,
    available: isVendorAvailable(vendor),
    circuitBreaker: circuitBreaker ? circuitBreaker.getStats() : null,
    retryStats: retryStats.getStats(),
    cacheStats: fallbackHandler.getCacheStats(),
    config: currentConfig
  }
}

export function getCurrentVendor(): "openai" | "mock" | "deepseek" {
  return getVendor()
}

export function isVendorAvailable(vendor: "openai" | "mock" | "deepseek"): boolean {
  if (vendor === "openai") {
    return !!process.env.OPENAI_API_KEY
  }
  if (vendor === "deepseek") {
    return !!process.env.DEEPSEEK_API_KEY
  }
  return true
}

/**
 * Reset all AI service resilience mechanisms (for testing/admin)
 */
export function resetAiServiceState(): void {
  circuitBreakerRegistry.resetAll()
  retryStats.reset()
  fallbackHandler.clearCache()
  logger.info('AI service state reset')
}
