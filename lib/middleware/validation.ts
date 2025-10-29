/**
 * Enhanced validation middleware with comprehensive schema validation
 */

import { NextRequest } from 'next/server'
import { z } from 'zod'
import { ValidationError, ErrorCodes } from '@/lib/errors'
import { getApiLogger } from '@/lib/logging'

/**
 * Validation configuration
 */
export interface ValidationConfig {
  body?: z.ZodSchema
  query?: z.ZodSchema
  params?: z.ZodSchema
  headers?: z.ZodSchema
  files?: FileValidationConfig
}

/**
 * File validation configuration
 */
export interface FileValidationConfig {
  maxSize?: number        // Maximum file size in bytes
  allowedTypes?: string[] // Allowed MIME types
  maxFiles?: number       // Maximum number of files
  required?: boolean      // Whether files are required
}

/**
 * Validation result
 */
export interface ValidationResult {
  body?: any
  query?: any
  params?: any
  headers?: any
  files?: File[]
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
    cursor: z.string().optional()
  }).refine(data => {
    if (data.page && (data.page < 1 || data.page > 1000)) {
      throw new Error('Page must be between 1 and 1000')
    }
    if (data.limit && (data.limit < 1 || data.limit > 100)) {
      throw new Error('Limit must be between 1 and 100')
    }
    return true
  }),

  /**
   * Sorting query parameters
   */
  sorting: z.object({
    sortBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional().default('asc')
  }),

  /**
   * Search query parameters
   */
  search: z.object({
    q: z.string().optional(),
    filter: z.string().optional()
  }),

  /**
   * ID parameter validation
   */
  id: z.object({
    id: z.string().min(1, 'ID is required')
  }),

  /**
   * Email validation
   */
  email: z.string().email('Invalid email format'),

  /**
   * Password validation
   */
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  /**
   * Phone number validation
   */
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format'),

  /**
   * URL validation
   */
  url: z.string().url('Invalid URL format'),

  /**
   * Date validation
   */
  date: z.string().datetime('Invalid date format'),

  /**
   * File upload validation
   */
  file: z.object({
    name: z.string().min(1, 'File name is required'),
    type: z.string().min(1, 'File type is required'),
    size: z.number().positive('File size must be positive')
  })
}

/**
 * Validation error formatter
 */
function formatValidationErrors(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {}
  
  error.errors.forEach((err) => {
    const path = err.path.join('.')
    if (!fieldErrors[path]) {
      fieldErrors[path] = []
    }
    fieldErrors[path].push(err.message)
  })

  return fieldErrors
}

/**
 * Validate request body
 */
async function validateBody(req: NextRequest, schema: z.ZodSchema): Promise<any> {
  if (req.method === 'GET' || req.method === 'DELETE') {
    return undefined
  }

  try {
    const contentType = req.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      const body = await req.json()
      return schema.parse(body)
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const body: any = {}
      
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          if (!body.files) body.files = []
          body.files.push(value)
        } else {
          body[key] = value
        }
      }
      
      return schema.parse(body)
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData()
      const body = Object.fromEntries(formData.entries())
      return schema.parse(body)
    } else {
      throw new ValidationError('Unsupported content type', {
        contentType: [`Content type ${contentType} is not supported`]
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Request body validation failed', formatValidationErrors(error))
    } else if (error instanceof SyntaxError) {
      throw new ValidationError('Invalid JSON body', {
        body: ['Request body must be valid JSON']
      })
    } else if (error instanceof ValidationError) {
      throw error
    } else {
      throw new ValidationError('Body parsing failed', {
        body: ['Failed to parse request body']
      })
    }
  }
}

/**
 * Validate query parameters
 */
function validateQuery(req: NextRequest, schema: z.ZodSchema): any {
  try {
    const url = new URL(req.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    return schema.parse(queryParams)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Query parameters validation failed', formatValidationErrors(error))
    }
    throw error
  }
}

/**
 * Validate route parameters
 */
function validateParams(params: any, schema: z.ZodSchema): any {
  try {
    return schema.parse(params)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Route parameters validation failed', formatValidationErrors(error))
    }
    throw error
  }
}

/**
 * Validate request headers
 */
function validateHeaders(req: NextRequest, schema: z.ZodSchema): any {
  try {
    const headers = Object.fromEntries(req.headers.entries())
    return schema.parse(headers)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Headers validation failed', formatValidationErrors(error))
    }
    throw error
  }
}

/**
 * Validate uploaded files
 */
function validateFiles(files: File[], config: FileValidationConfig): File[] {
  const logger = getApiLogger()
  
  // Check if files are required
  if (config.required && (!files || files.length === 0)) {
    throw new ValidationError('Files are required', {
      files: ['At least one file must be uploaded']
    })
  }

  if (!files || files.length === 0) {
    return []
  }

  // Check maximum number of files
  if (config.maxFiles && files.length > config.maxFiles) {
    throw new ValidationError('Too many files', {
      files: [`Maximum ${config.maxFiles} files allowed, got ${files.length}`]
    })
  }

  const errors: string[] = []

  files.forEach((file, index) => {
    // Check file size
    if (config.maxSize && file.size > config.maxSize) {
      errors.push(`File ${index + 1} (${file.name}) is too large. Maximum size: ${config.maxSize} bytes`)
    }

    // Check file type
    if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
      errors.push(`File ${index + 1} (${file.name}) has invalid type. Allowed types: ${config.allowedTypes.join(', ')}`)
    }

    logger.debug('File validation', {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      index
    })
  })

  if (errors.length > 0) {
    throw new ValidationError('File validation failed', { files: errors })
  }

  return files
}

/**
 * Create validation middleware
 */
export function createValidation(config: ValidationConfig) {
  return async (req: NextRequest, params?: any): Promise<ValidationResult> => {
    const logger = getApiLogger()
    const result: ValidationResult = {}

    try {
      logger.debug('Starting request validation', {
        method: req.method,
        url: req.url,
        contentType: req.headers.get('content-type')
      })

      // Validate body
      if (config.body) {
        result.body = await validateBody(req, config.body)
        logger.debug('Body validation passed')
      }

      // Validate query parameters
      if (config.query) {
        result.query = validateQuery(req, config.query)
        logger.debug('Query validation passed')
      }

      // Validate route parameters
      if (config.params && params) {
        result.params = validateParams(params, config.params)
        logger.debug('Params validation passed')
      }

      // Validate headers
      if (config.headers) {
        result.headers = validateHeaders(req, config.headers)
        logger.debug('Headers validation passed')
      }

      // Validate files
      if (config.files) {
        const files = result.body?.files || []
        result.files = validateFiles(files, config.files)
        logger.debug('Files validation passed', { fileCount: result.files.length })
      }

      logger.info('Request validation completed successfully')
      return result

    } catch (error) {
      logger.warn('Request validation failed', {
        error: error instanceof Error ? error.message : String(error),
        method: req.method,
        url: req.url
      })
      throw error
    }
  }
}

/**
 * Predefined validation configurations
 */
export const ValidationPresets = {
  /**
   * Candidate creation validation
   */
  createCandidate: createValidation({
    body: z.object({
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
      email: CommonSchemas.email,
      phone: CommonSchemas.phone.optional(),
      resumeText: z.string().optional(),
      resumeFile: z.string().optional(),
      resumeMime: z.string().optional(),
      resumeSize: z.number().optional()
    })
  }),

  /**
   * Candidate listing validation
   */
  listCandidates: createValidation({
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
      cursor: z.string().optional(),
      sortBy: z.enum(['finalScore', 'createdAt', 'name']).optional(),
      order: z.enum(['asc', 'desc']).optional().default('asc'),
      q: z.string().optional(),
      filter: z.string().optional()
    }).refine(data => {
      if (data.page && (data.page < 1 || data.page > 1000)) {
        throw new Error('Page must be between 1 and 1000')
      }
      if (data.limit && (data.limit < 1 || data.limit > 100)) {
        throw new Error('Limit must be between 1 and 100')
      }
      return true
    })
  }),

  /**
   * User authentication validation
   */
  authenticate: createValidation({
    body: z.object({
      email: CommonSchemas.email,
      password: z.string().min(1, 'Password is required')
    })
  }),

  /**
   * User registration validation
   */
  register: createValidation({
    body: z.object({
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
      email: CommonSchemas.email,
      password: CommonSchemas.password,
      role: z.enum(['interviewer', 'interviewee']).default('interviewee')
    })
  }),

  /**
   * File upload validation
   */
  fileUpload: createValidation({
    files: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      maxFiles: 1,
      required: true
    }
  }),

  /**
   * ID parameter validation
   */
  withId: createValidation({
    params: CommonSchemas.id
  })
}

/**
 * Validation middleware wrapper
 */
export function withValidation<T extends (...args: any[]) => any>(
  handler: T,
  config: ValidationConfig
): T {
  const validator = createValidation(config)
  
  return (async (req: NextRequest, ...rest: any[]) => {
    const validationResult = await validator(req, rest[0]) // Assuming first param is route params
    
    // Attach validation result to request for handler access
    ;(req as any).validated = validationResult
    
    return handler(req, ...rest)
  }) as T
}