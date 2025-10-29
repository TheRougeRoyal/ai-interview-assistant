/**
 * Main entry point for the in-house PDF assessment system
 */

export * from './types';
export * from './processor';
export * from './analyzer';
export * from './skill-extractor';
export * from './question-generator';

// Re-export the main processor instance for easy access
export { pdfProcessor as default } from './processor';