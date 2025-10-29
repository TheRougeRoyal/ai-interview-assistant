/**
 * Enhanced PDF processing API that replaces Adobe PDF Services
 * with in-house AI-powered processing and assessment generation
 */

import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/http/rateLimit';
import { handleApiError, json } from '@/lib/http/errors';
import { pdfProcessor } from '@/lib/pdf-assessment';

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'process-pdf');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const generateQuestions = formData.get('generateQuestions') === 'true';
    
    if (!file) {
      return json(400, { error: 'No file provided' });
    }

    // Validate file
    const validation = pdfProcessor.validateFile(file);
    if (!validation.valid) {
      return json(400, { error: validation.error });
    }

    console.log(`Processing PDF: ${file.name} (${file.size} bytes)`);
    
    if (generateQuestions) {
      // Process PDF and generate assessment questions
      const result = await pdfProcessor.processAndAssess(file);
      
      return json(200, {
        success: true,
        processingResult: result.processingResult,
        assessment: result.assessment,
        stats: pdfProcessor.getStats()
      });
    } else {
      // Just process PDF without generating questions
      const processingResult = await pdfProcessor.processPDF(file);
      
      return json(200, {
        success: true,
        processingResult,
        stats: pdfProcessor.getStats()
      });
    }
    
  } catch (error) {
    console.error('PDF processing error:', error);
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Return processor status and configuration
    const config = pdfProcessor.getConfig();
    const stats = pdfProcessor.getStats();
    
    return json(200, {
      status: 'operational',
      config: {
        model: config.model,
        enableStructuredExtraction: config.enableStructuredExtraction,
        enableQuestionGeneration: config.enableQuestionGeneration,
        skillCategories: config.skillCategories,
        difficultyLevels: config.difficultyLevels,
        questionTypes: config.questionTypes
      },
      stats,
      capabilities: {
        pdfProcessing: true,
        aiExtraction: true,
        questionGeneration: true,
        skillAssessment: true
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}