/**
 * API for generating skill-based assessments from processed PDF data
 */

import { NextRequest } from 'next/server';
import { rateLimit } from '@/lib/http/rateLimit';
import { handleApiError, json } from '@/lib/http/errors';
import { QuestionGenerator } from '@/lib/pdf-assessment/question-generator';
import type { ExtractedData, DocumentStructure, AIProcessingConfig } from '@/lib/pdf-assessment/types';

export async function POST(req: NextRequest) {
  try {
    await rateLimit(req, 'generate-assessment');
    
    const body = await req.json();
    const { extractedData, structure, config } = body as {
      extractedData: ExtractedData;
      structure: DocumentStructure;
      config?: Partial<AIProcessingConfig>;
    };

    if (!extractedData || !structure) {
      return json(400, { 
        error: 'Missing required data: extractedData and structure are required' 
      });
    }

    console.log('Generating assessment questions...');
    
    // Create question generator with custom config if provided
    const questionGenerator = new QuestionGenerator({
      model: 'gpt-4',
      temperature: 0.4,
      maxTokens: 1500,
      enableStructuredExtraction: true,
      enableQuestionGeneration: true,
      skillCategories: [
        'programming', 'database', 'cloud', 'devops', 
        'frontend', 'backend', 'mobile', 'data-science'
      ],
      difficultyLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
      questionTypes: ['multiple-choice', 'coding', 'scenario', 'explanation'],
      ...config
    });

    const assessment = await questionGenerator.generateQuestions(extractedData, structure);
    
    return json(200, {
      success: true,
      assessment,
      stats: questionGenerator.getStats(),
      summary: {
        totalAssessments: assessment.length,
        totalQuestions: assessment.reduce((sum, a) => sum + a.questions.length, 0),
        skillsCovered: assessment.map(a => a.skill),
        estimatedTime: assessment.reduce((sum, a) => sum + a.estimatedTime, 0)
      }
    });
    
  } catch (error) {
    console.error('Assessment generation error:', error);
    return handleApiError(error);
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const skill = searchParams.get('skill');
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    
    // Return available options for assessment generation
    return json(200, {
      availableSkills: [
        'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 
        'AWS', 'Docker', 'Kubernetes', 'Git', 'MongoDB', 'PostgreSQL'
      ],
      categories: [
        'programming', 'database', 'cloud', 'devops', 
        'frontend', 'backend', 'mobile', 'data-science'
      ],
      difficultyLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
      questionTypes: ['multiple-choice', 'coding', 'scenario', 'explanation'],
      defaultConfig: {
        model: 'gpt-4',
        temperature: 0.4,
        maxTokens: 1500,
        questionsPerSkill: 3,
        timePerQuestion: {
          'multiple-choice': 3,
          'coding': 15,
          'scenario': 10,
          'explanation': 8
        }
      }
    });
    
  } catch (error) {
    return handleApiError(error);
  }
}