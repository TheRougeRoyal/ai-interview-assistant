/**
 * Configuration management for the PDF assessment system
 */

import type { AIProcessingConfig } from './types';

export const DEFAULT_CONFIG: AIProcessingConfig = {
  model: 'gpt-4',
  temperature: 0.3,
  maxTokens: 4000,
  enableStructuredExtraction: true,
  enableQuestionGeneration: true,
  skillCategories: [
    'programming',
    'database', 
    'cloud',
    'devops',
    'frontend',
    'backend',
    'mobile',
    'data-science',
    'machine-learning',
    'cybersecurity',
    'networking',
    'other'
  ],
  difficultyLevels: ['beginner', 'intermediate', 'advanced', 'expert'],
  questionTypes: ['multiple-choice', 'coding', 'scenario', 'explanation']
};

export const SKILL_CATEGORIES = {
  programming: {
    name: 'Programming Languages',
    skills: [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go', 
      'Rust', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'R'
    ]
  },
  frontend: {
    name: 'Frontend Development',
    skills: [
      'React', 'Vue.js', 'Angular', 'Svelte', 'HTML', 'CSS', 'SASS', 
      'Tailwind CSS', 'Bootstrap', 'jQuery', 'Webpack', 'Vite'
    ]
  },
  backend: {
    name: 'Backend Development',
    skills: [
      'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', 
      'ASP.NET', 'Laravel', 'Ruby on Rails', 'FastAPI', 'Nest.js'
    ]
  },
  database: {
    name: 'Databases',
    skills: [
      'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 
      'SQL Server', 'Cassandra', 'DynamoDB', 'Elasticsearch'
    ]
  },
  cloud: {
    name: 'Cloud Platforms',
    skills: [
      'AWS', 'Azure', 'Google Cloud', 'Heroku', 'Vercel', 'Netlify', 
      'DigitalOcean', 'Linode', 'Firebase', 'Supabase'
    ]
  },
  devops: {
    name: 'DevOps & Tools',
    skills: [
      'Docker', 'Kubernetes', 'Jenkins', 'GitHub Actions', 'GitLab CI', 
      'Terraform', 'Ansible', 'Chef', 'Puppet', 'Vagrant'
    ]
  },
  mobile: {
    name: 'Mobile Development',
    skills: [
      'React Native', 'Flutter', 'iOS Development', 'Android Development', 
      'Xamarin', 'Ionic', 'Cordova', 'Swift', 'Kotlin'
    ]
  },
  'data-science': {
    name: 'Data Science & Analytics',
    skills: [
      'Pandas', 'NumPy', 'Scikit-learn', 'TensorFlow', 'PyTorch', 
      'Jupyter', 'Tableau', 'Power BI', 'Apache Spark', 'Hadoop'
    ]
  }
};

export const QUESTION_TEMPLATES = {
  'multiple-choice': {
    timeLimit: 3,
    description: 'Quick knowledge check with multiple options'
  },
  'coding': {
    timeLimit: 15,
    description: 'Practical coding challenge or algorithm'
  },
  'scenario': {
    timeLimit: 10,
    description: 'Real-world problem-solving scenario'
  },
  'explanation': {
    timeLimit: 8,
    description: 'Conceptual understanding and explanation'
  }
};

export const DIFFICULTY_MAPPINGS = {
  beginner: {
    yearsOfExperience: [0, 1],
    questionComplexity: 'basic',
    focusAreas: ['syntax', 'basic concepts', 'simple implementations']
  },
  intermediate: {
    yearsOfExperience: [1, 3],
    questionComplexity: 'moderate',
    focusAreas: ['best practices', 'common patterns', 'problem solving']
  },
  advanced: {
    yearsOfExperience: [3, 5],
    questionComplexity: 'complex',
    focusAreas: ['architecture', 'optimization', 'advanced concepts']
  },
  expert: {
    yearsOfExperience: [5, Infinity],
    questionComplexity: 'expert',
    focusAreas: ['system design', 'leadership', 'innovation']
  }
};

/**
 * Get configuration based on environment or custom settings
 */
export function getProcessingConfig(overrides?: Partial<AIProcessingConfig>): AIProcessingConfig {
  const envConfig: Partial<AIProcessingConfig> = {
    model: (process.env.PDF_ASSESSMENT_MODEL as any) || DEFAULT_CONFIG.model,
    temperature: process.env.PDF_ASSESSMENT_TEMPERATURE 
      ? parseFloat(process.env.PDF_ASSESSMENT_TEMPERATURE) 
      : DEFAULT_CONFIG.temperature,
    maxTokens: process.env.PDF_ASSESSMENT_MAX_TOKENS 
      ? parseInt(process.env.PDF_ASSESSMENT_MAX_TOKENS) 
      : DEFAULT_CONFIG.maxTokens,
    enableStructuredExtraction: process.env.PDF_ASSESSMENT_STRUCTURED_EXTRACTION !== 'false',
    enableQuestionGeneration: process.env.PDF_ASSESSMENT_QUESTION_GENERATION !== 'false'
  };

  return {
    ...DEFAULT_CONFIG,
    ...envConfig,
    ...overrides
  };
}

/**
 * Validate configuration settings
 */
export function validateConfig(config: AIProcessingConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!['gpt-4', 'gpt-3.5-turbo', 'claude-3', 'deepseek'].includes(config.model)) {
    errors.push(`Invalid model: ${config.model}`);
  }

  if (config.temperature < 0 || config.temperature > 1) {
    errors.push(`Temperature must be between 0 and 1, got: ${config.temperature}`);
  }

  if (config.maxTokens < 100 || config.maxTokens > 8000) {
    errors.push(`Max tokens must be between 100 and 8000, got: ${config.maxTokens}`);
  }

  if (config.skillCategories.length === 0) {
    errors.push('At least one skill category must be enabled');
  }

  if (config.questionTypes.length === 0) {
    errors.push('At least one question type must be enabled');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get skill category information
 */
export function getSkillCategory(skill: string): string {
  const skillLower = skill.toLowerCase();
  
  for (const [category, info] of Object.entries(SKILL_CATEGORIES)) {
    if (info.skills.some(s => s.toLowerCase().includes(skillLower) || skillLower.includes(s.toLowerCase()))) {
      return category;
    }
  }
  
  return 'other';
}

/**
 * Estimate difficulty based on years of experience
 */
export function estimateDifficulty(yearsOfExperience: number): keyof typeof DIFFICULTY_MAPPINGS {
  if (yearsOfExperience >= 5) return 'expert';
  if (yearsOfExperience >= 3) return 'advanced';
  if (yearsOfExperience >= 1) return 'intermediate';
  return 'beginner';
}

/**
 * Get recommended question types for a skill category
 */
export function getRecommendedQuestionTypes(category: string): string[] {
  const programmingCategories = ['programming', 'frontend', 'backend', 'mobile'];
  const conceptualCategories = ['cloud', 'devops', 'data-science'];
  
  if (programmingCategories.includes(category)) {
    return ['multiple-choice', 'coding', 'scenario'];
  }
  
  if (conceptualCategories.includes(category)) {
    return ['multiple-choice', 'explanation', 'scenario'];
  }
  
  return ['multiple-choice', 'explanation'];
}