/**
 * Security-Enhanced Validation Schemas
 * Extends existing Zod schemas with additional security validations
 */

import { z } from 'zod';

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove inline event handlers
    .trim();
}

/**
 * Email validation with additional security checks
 */
export const secureEmailSchema = z
  .string()
  .email('Invalid email address')
  .min(5, 'Email must be at least 5 characters')
  .max(255, 'Email must not exceed 255 characters')
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    'Invalid email format'
  )
  .transform(val => val.toLowerCase().trim());

/**
 * Password validation with security requirements
 */
export const securePasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character');

/**
 * Phone number validation
 */
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
  .optional()
  .or(z.literal(''));

/**
 * Name validation with sanitization
 */
export const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
  .transform(sanitizeString);

/**
 * URL validation with protocol check
 */
export const urlSchema = z
  .string()
  .url('Invalid URL')
  .regex(/^https?:\/\//, 'URL must use HTTP or HTTPS protocol')
  .max(2048, 'URL must not exceed 2048 characters');

/**
 * File upload validation
 */
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
}

export const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx'],
};

/**
 * Validate file upload
 */
export function validateFile(
  file: File,
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): { valid: boolean; error?: string } {
  const { maxSize, allowedTypes, allowedExtensions } = options;
  
  // Check file size
  if (maxSize && file.size > maxSize) {
    return {
      valid: false,
      error: `File size must not exceed ${Math.round(maxSize / 1024 / 1024)}MB`,
    };
  }
  
  // Check file type
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed`,
    };
  }
  
  // Check file extension
  if (allowedExtensions) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return {
        valid: false,
        error: `File extension ${ext} is not allowed`,
      };
    }
  }
  
  // Check for suspicious filenames
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      valid: false,
      error: 'Invalid filename',
    };
  }
  
  return { valid: true };
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe characters
    .replace(/\.{2,}/g, '.') // Remove multiple dots
    .substring(0, 255); // Limit length
}

/**
 * Text content validation with length limits
 */
export const textContentSchema = z
  .string()
  .min(1, 'Content is required')
  .max(10000, 'Content must not exceed 10000 characters')
  .transform(sanitizeString);

/**
 * ID validation (CUID format)
 */
export const idSchema = z
  .string()
  .regex(/^c[a-z0-9]{24}$/i, 'Invalid ID format');

/**
 * Pagination schema with limits
 */
export const paginationSchema = z.object({
  page: z
    .number()
    .int()
    .min(1, 'Page must be at least 1')
    .max(1000, 'Page must not exceed 1000')
    .default(1),
  limit: z
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit must not exceed 100')
    .default(20),
});

/**
 * Sort order schema
 */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Date range schema
 */
export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
}).refine(
  data => !data.from || !data.to || data.from <= data.to,
  'From date must be before or equal to To date'
);

/**
 * User registration schema with security validations
 */
export const userRegistrationSchema = z.object({
  email: secureEmailSchema,
  password: securePasswordSchema,
  name: nameSchema,
  phone: phoneSchema,
  role: z.enum(['interviewer', 'interviewee']).default('interviewee'),
});

/**
 * User login schema
 */
export const userLoginSchema = z.object({
  email: secureEmailSchema,
  password: z.string().min(1, 'Password is required'),
});

/**
 * Profile update schema
 */
export const profileUpdateSchema = z.object({
  name: nameSchema.optional(),
  phone: phoneSchema,
}).strict(); // Prevent additional fields

/**
 * Candidate filter schema with security validations
 */
export const candidateFilterSchema = z.object({
  search: z
    .string()
    .max(100, 'Search query too long')
    .transform(sanitizeString)
    .optional(),
  seniorityLevel: z.enum(['junior', 'mid', 'senior', 'lead', 'principal']).optional(),
  minScore: z
    .number()
    .int()
    .min(0)
    .max(100)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'finalScore', 'name']).default('createdAt'),
  sortOrder: sortOrderSchema,
});

/**
 * Interview session creation schema
 */
export const sessionCreateSchema = z.object({
  candidateId: idSchema,
  stage: z.enum(['resume_upload', 'profile_collection', 'qa', 'completed']).default('resume_upload'),
});

/**
 * Answer submission schema
 */
export const answerSubmissionSchema = z.object({
  sessionId: idSchema,
  questionIndex: z.number().int().min(0).max(100),
  answer: textContentSchema,
  submittedAt: z.coerce.date().optional(),
});

/**
 * Request timeout schema
 */
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Request size limits
 */
export const MAX_JSON_SIZE = 1024 * 1024; // 1MB
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate request body size
 */
export function validateRequestSize(contentLength: number, maxSize: number = MAX_JSON_SIZE): {
  valid: boolean;
  error?: string;
} {
  if (contentLength > maxSize) {
    return {
      valid: false,
      error: `Request body too large. Maximum size is ${Math.round(maxSize / 1024)}KB`,
    };
  }
  return { valid: true };
}

/**
 * Rate limiting configuration
 */
export const RATE_LIMITS = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
  },
  api: {
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 requests per window
  },
  fileUpload: {
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 uploads per window
  },
};
