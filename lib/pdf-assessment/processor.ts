/**
 * Enhanced PDF processor that replaces Adobe PDF Services
 * with in-house AI-powered processing and skill assessment
 */

import { pdfToTextWithMetadata } from '@/lib/parsing/pdf';
import type { 
  PDFProcessingResult, 
  DocumentStructure, 
  ExtractedData,
  PDFMetadata,
  AIProcessingConfig 
} from './types';
import { DocumentAnalyzer } from './analyzer';
import { SkillExtractor } from './skill-extractor';
import { QuestionGenerator } from './question-generator';

export class EnhancedPDFProcessor {
  private analyzer: DocumentAnalyzer;
  private skillExtractor: SkillExtractor;
  private questionGenerator: QuestionGenerator;
  private config: AIProcessingConfig;

  constructor(config?: Partial<AIProcessingConfig>) {
    this.config = {
      model: 'gpt-4',
      temperature: 0.3,
      maxTokens: 4000,
      enableStructuredExtraction: true,
      enableQuestionGeneration: true,
      skillCategories: [
        'programming', 'database', 'cloud', 'devops', 
        'frontend', 'backend', 'mobile', 'data-science'
      ],
      difficultyLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
      questionTypes: ['multiple-choice', 'coding', 'scenario', 'explanation'],
      ...config
    };

    this.analyzer = new DocumentAnalyzer(this.config);
    this.skillExtractor = new SkillExtractor(this.config);
    this.questionGenerator = new QuestionGenerator(this.config);
  }

  /**
   * Process PDF file and extract structured data with AI enhancement
   */
  async processPDF(file: File): Promise<PDFProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Starting enhanced PDF processing for: ${file.name}`);
      
      // Step 1: Extract raw text and basic metadata
      const pdfResult = await pdfToTextWithMetadata(file);
      
      // Step 2: Analyze document structure using AI
      const structure = await this.analyzer.analyzeStructure(pdfResult.text);
      
      // Step 3: Extract structured data using AI
      const extractedData = await this.skillExtractor.extractData(
        pdfResult.text, 
        structure
      );
      
      // Step 4: Enhance metadata
      const enhancedMetadata: PDFMetadata = {
        ...pdfResult.metadata,
        fileSize: file.size,
        processingTime: Date.now() - startTime
      };
      
      console.log(`PDF processing completed in ${enhancedMetadata.processingTime}ms`);
      
      return {
        text: pdfResult.text,
        metadata: enhancedMetadata,
        structure,
        extractedData
      };
      
    } catch (error) {
      console.error('Enhanced PDF processing failed:', error);
      throw new Error(`PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate skill-based assessment questions from processed PDF
   */
  async generateAssessment(processingResult: PDFProcessingResult) {
    if (!this.config.enableQuestionGeneration) {
      throw new Error('Question generation is disabled in configuration');
    }

    return await this.questionGenerator.generateQuestions(
      processingResult.extractedData,
      processingResult.structure
    );
  }

  /**
   * Process PDF and generate complete assessment in one step
   */
  async processAndAssess(file: File) {
    const processingResult = await this.processPDF(file);
    const assessment = await this.generateAssessment(processingResult);
    
    return {
      processingResult,
      assessment
    };
  }

  /**
   * Update processing configuration
   */
  updateConfig(newConfig: Partial<AIProcessingConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.analyzer.updateConfig(this.config);
    this.skillExtractor.updateConfig(this.config);
    this.questionGenerator.updateConfig(this.config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AIProcessingConfig {
    return { ...this.config };
  }

  /**
   * Validate PDF file before processing
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) {
      return { valid: false, error: 'No file provided' };
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: 'File must be a PDF' };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'File size must be less than 10MB' };
    }

    if (file.size < 100) { // Minimum size check
      return { valid: false, error: 'File appears to be empty or corrupted' };
    }

    return { valid: true };
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return {
      analyzer: this.analyzer.getStats(),
      skillExtractor: this.skillExtractor.getStats(),
      questionGenerator: this.questionGenerator.getStats()
    };
  }
}

// Export singleton instance with default configuration
export const pdfProcessor = new EnhancedPDFProcessor();

// Export factory function for custom configurations
export function createPDFProcessor(config?: Partial<AIProcessingConfig>) {
  return new EnhancedPDFProcessor(config);
}