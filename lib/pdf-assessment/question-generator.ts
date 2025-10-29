/**
 * AI-powered question generator for skill-based assessments
 */

import { ask } from '@/lib/ai/gateway';
import type { 
  ExtractedData, 
  DocumentStructure, 
  SkillAssessment, 
  AssessmentQuestion,
  TechnicalSkill,
  AIProcessingConfig 
} from './types';

export class QuestionGenerator {
  private config: AIProcessingConfig;
  private stats = {
    assessmentsGenerated: 0,
    questionsGenerated: 0,
    averageProcessingTime: 0,
    errors: 0
  };

  constructor(config: AIProcessingConfig) {
    this.config = config;
  }

  /**
   * Generate skill-based assessment questions from extracted data
   */
  async generateQuestions(
    extractedData: ExtractedData, 
    structure: DocumentStructure
  ): Promise<SkillAssessment[]> {
    const startTime = Date.now();
    
    try {
      console.log('Generating skill-based assessment questions...');
      
      const assessments: SkillAssessment[] = [];
      
      // Generate assessments for technical skills
      for (const skill of extractedData.skills.technical) {
        if (this.shouldGenerateAssessment(skill)) {
          const assessment = await this.generateSkillAssessment(skill, extractedData);
          if (assessment) {
            assessments.push(assessment);
          }
        }
      }

      // Generate assessments for frameworks
      for (const framework of extractedData.skills.frameworks) {
        const frameworkSkill: TechnicalSkill = {
          name: framework,
          category: 'frontend', // Default category
          proficiency: 'intermediate'
        };
        
        const assessment = await this.generateSkillAssessment(frameworkSkill, extractedData);
        if (assessment) {
          assessments.push(assessment);
        }
      }

      // Update stats
      this.stats.assessmentsGenerated += assessments.length;
      this.stats.questionsGenerated += assessments.reduce((sum, a) => sum + a.questions.length, 0);
      
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = processingTime;

      console.log(`Generated ${assessments.length} assessments with ${this.stats.questionsGenerated} questions in ${processingTime}ms`);
      
      return assessments;
      
    } catch (error) {
      this.stats.errors++;
      console.error('Question generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate assessment for a specific skill
   */
  private async generateSkillAssessment(
    skill: TechnicalSkill, 
    extractedData: ExtractedData
  ): Promise<SkillAssessment | null> {
    try {
      const difficulty = this.determineDifficulty(skill, extractedData);
      const questionTypes = this.selectQuestionTypes(skill);
      
      const questions: AssessmentQuestion[] = [];
      
      // Generate different types of questions
      for (const questionType of questionTypes) {
        const generatedQuestions = await this.generateQuestionsByType(
          skill, 
          questionType, 
          difficulty,
          extractedData
        );
        questions.push(...generatedQuestions);
      }

      if (questions.length === 0) {
        return null;
      }

      return {
        skill: skill.name,
        category: skill.category,
        questions,
        difficulty,
        estimatedTime: this.calculateEstimatedTime(questions)
      };
      
    } catch (error) {
      console.warn(`Failed to generate assessment for ${skill.name}:`, error);
      return null;
    }
  }

  /**
   * Generate questions by type using AI
   */
  private async generateQuestionsByType(
    skill: TechnicalSkill,
    questionType: string,
    difficulty: string,
    extractedData: ExtractedData
  ): Promise<AssessmentQuestion[]> {
    const prompt = this.buildQuestionPrompt(skill, questionType, difficulty, extractedData);
    
    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.4, // Moderate creativity for question generation
        maxTokens: 1500
      });

      return this.parseQuestionResponse(response, questionType, difficulty);
      
    } catch (error) {
      console.warn(`Failed to generate ${questionType} questions for ${skill.name}:`, error);
      return [];
    }
  }

  /**
   * Build AI prompt for question generation
   */
  private buildQuestionPrompt(
    skill: TechnicalSkill,
    questionType: string,
    difficulty: string,
    extractedData: ExtractedData
  ): string {
    const experienceContext = this.buildExperienceContext(skill.name, extractedData);
    
    const basePrompt = `Generate ${questionType} questions for ${skill.name} assessment.

Skill: ${skill.name}
Category: ${skill.category}
Difficulty: ${difficulty}
Question Type: ${questionType}

Candidate Experience Context:
${experienceContext}

Generate 2-3 questions in JSON format:`;

    switch (questionType) {
      case 'multiple-choice':
        return basePrompt + `
[
  {
    "id": "unique_id",
    "type": "multiple-choice",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Option A",
    "explanation": "Why this is correct",
    "difficulty": "${difficulty}",
    "timeLimit": 3
  }
]

Focus on practical knowledge and real-world scenarios.`;

      case 'coding':
        return basePrompt + `
[
  {
    "id": "unique_id",
    "type": "coding",
    "question": "Write a function that...",
    "codeTemplate": "// Starting code template",
    "expectedOutput": "Expected result or behavior",
    "explanation": "Solution explanation",
    "difficulty": "${difficulty}",
    "timeLimit": 15
  }
]

Create practical coding challenges relevant to the skill level.`;

      case 'scenario':
        return basePrompt + `
[
  {
    "id": "unique_id",
    "type": "scenario",
    "question": "You are working on a project where...",
    "correctAnswer": "Detailed approach or solution",
    "explanation": "Best practices and reasoning",
    "difficulty": "${difficulty}",
    "timeLimit": 10
  }
]

Create real-world scenarios that test problem-solving and decision-making.`;

      case 'explanation':
        return basePrompt + `
[
  {
    "id": "unique_id",
    "type": "explanation",
    "question": "Explain the concept of... and provide an example",
    "correctAnswer": "Key points that should be covered",
    "explanation": "Comprehensive explanation",
    "difficulty": "${difficulty}",
    "timeLimit": 8
  }
]

Test conceptual understanding and ability to explain technical concepts.`;

      default:
        return basePrompt + `
[
  {
    "id": "unique_id",
    "type": "multiple-choice",
    "question": "Question about ${skill.name}",
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Explanation",
    "difficulty": "${difficulty}",
    "timeLimit": 5
  }
]`;
    }
  }

  /**
   * Build experience context for better question generation
   */
  private buildExperienceContext(skillName: string, extractedData: ExtractedData): string {
    const relevantExperience = extractedData.experience.filter(exp => 
      exp.technologies?.some(tech => 
        tech.toLowerCase().includes(skillName.toLowerCase())
      ) || exp.description.some(desc => 
        desc.toLowerCase().includes(skillName.toLowerCase())
      )
    );

    const relevantProjects = extractedData.projects.filter(proj =>
      proj.technologies.some(tech => 
        tech.toLowerCase().includes(skillName.toLowerCase())
      )
    );

    let context = '';
    
    if (relevantExperience.length > 0) {
      context += `Work Experience with ${skillName}:\n`;
      relevantExperience.forEach(exp => {
        context += `- ${exp.position} at ${exp.company}: ${exp.description.join(', ')}\n`;
      });
    }

    if (relevantProjects.length > 0) {
      context += `\nProjects using ${skillName}:\n`;
      relevantProjects.forEach(proj => {
        context += `- ${proj.name}: ${proj.description}\n`;
      });
    }

    return context || `No specific experience found with ${skillName}. Generate general questions.`;
  }

  /**
   * Parse AI response into question objects
   */
  private parseQuestionResponse(
    response: string, 
    questionType: string, 
    difficulty: string
  ): AssessmentQuestion[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return parsed.map((q: any, index: number) => ({
        id: q.id || `${questionType}_${Date.now()}_${index}`,
        type: questionType as AssessmentQuestion['type'],
        question: q.question || '',
        options: q.options || undefined,
        correctAnswer: q.correctAnswer || undefined,
        explanation: q.explanation || undefined,
        difficulty: this.validateDifficulty(q.difficulty || difficulty),
        timeLimit: q.timeLimit || this.getDefaultTimeLimit(questionType),
        codeTemplate: q.codeTemplate || undefined,
        expectedOutput: q.expectedOutput || undefined
      }));
      
    } catch (error) {
      console.warn('Failed to parse question response:', error);
      return [];
    }
  }

  /**
   * Determine difficulty based on skill and experience
   */
  private determineDifficulty(skill: TechnicalSkill, extractedData: ExtractedData): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
    // Use skill proficiency if available
    if (skill.proficiency) {
      return skill.proficiency;
    }

    // Estimate based on years of experience
    if (skill.yearsOfExperience) {
      if (skill.yearsOfExperience >= 5) return 'expert';
      if (skill.yearsOfExperience >= 3) return 'advanced';
      if (skill.yearsOfExperience >= 1) return 'intermediate';
      return 'beginner';
    }

    // Estimate based on overall experience
    const totalYears = extractedData.experience.reduce((sum, exp) => {
      const duration = exp.duration || '';
      const years = this.extractYearsFromDuration(duration);
      return sum + years;
    }, 0);

    if (totalYears >= 5) return 'advanced';
    if (totalYears >= 2) return 'intermediate';
    return 'beginner';
  }

  /**
   * Select appropriate question types for a skill
   */
  private selectQuestionTypes(skill: TechnicalSkill): string[] {
    const types: string[] = [];

    // Always include multiple choice for quick assessment
    types.push('multiple-choice');

    // Add coding questions for programming skills
    if (skill.category === 'programming' || skill.category === 'frontend' || skill.category === 'backend') {
      types.push('coding');
    }

    // Add scenario questions for advanced skills
    if (skill.proficiency === 'advanced' || skill.proficiency === 'expert') {
      types.push('scenario');
    }

    // Add explanation questions for conceptual understanding
    if (skill.category === 'cloud' || skill.category === 'devops' || skill.category === 'database') {
      types.push('explanation');
    }

    return types.slice(0, 2); // Limit to 2 types per skill
  }

  /**
   * Calculate estimated time for assessment
   */
  private calculateEstimatedTime(questions: AssessmentQuestion[]): number {
    return questions.reduce((sum, q) => sum + (q.timeLimit || 5), 0);
  }

  /**
   * Get default time limit for question type
   */
  private getDefaultTimeLimit(questionType: string): number {
    switch (questionType) {
      case 'multiple-choice': return 3;
      case 'coding': return 15;
      case 'scenario': return 10;
      case 'explanation': return 8;
      default: return 5;
    }
  }

  /**
   * Validate difficulty level
   */
  private validateDifficulty(difficulty: string): 'easy' | 'medium' | 'hard' {
    const validDifficulties = ['easy', 'medium', 'hard'];
    return validDifficulties.includes(difficulty) ? difficulty as 'easy' | 'medium' | 'hard' : 'medium';
  }

  /**
   * Extract years from duration string
   */
  private extractYearsFromDuration(duration: string): number {
    const yearMatch = duration.match(/(\d+)\s*year/i);
    const monthMatch = duration.match(/(\d+)\s*month/i);
    
    let years = yearMatch ? parseInt(yearMatch[1]) : 0;
    const months = monthMatch ? parseInt(monthMatch[1]) : 0;
    
    years += months / 12;
    return years;
  }

  /**
   * Check if assessment should be generated for skill
   */
  private shouldGenerateAssessment(skill: TechnicalSkill): boolean {
    // Skip very basic or unrecognized skills
    const skipSkills = ['microsoft office', 'email', 'internet', 'typing'];
    return !skipSkills.some(skip => 
      skill.name.toLowerCase().includes(skip.toLowerCase())
    );
  }

  /**
   * Update configuration
   */
  updateConfig(config: AIProcessingConfig) {
    this.config = config;
  }

  /**
   * Get processing statistics
   */
  getStats() {
    return { ...this.stats };
  }
}