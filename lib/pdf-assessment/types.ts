/**
 * Types for the in-house PDF assessment system
 */

export interface PDFProcessingResult {
  text: string;
  metadata: PDFMetadata;
  structure: DocumentStructure;
  extractedData: ExtractedData;
}

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  fileSize: number;
  processingTime: number;
}

export interface DocumentStructure {
  sections: DocumentSection[];
  tables: TableData[];
  images: ImageData[];
  headers: HeaderData[];
  paragraphs: ParagraphData[];
}

export interface DocumentSection {
  type: 'header' | 'paragraph' | 'list' | 'table' | 'contact' | 'skills' | 'experience' | 'education' | 'projects';
  content: string;
  confidence: number;
  position: {
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface TableData {
  rows: string[][];
  headers?: string[];
  page: number;
  confidence: number;
}

export interface ImageData {
  type: 'photo' | 'chart' | 'diagram' | 'logo';
  description?: string;
  page: number;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface HeaderData {
  level: number;
  text: string;
  page: number;
}

export interface ParagraphData {
  text: string;
  page: number;
  isListItem: boolean;
}

export interface ExtractedData {
  personalInfo: PersonalInfo;
  skills: SkillsData;
  experience: ExperienceData[];
  education: EducationData[];
  projects: ProjectData[];
  achievements: string[];
  languages: LanguageData[];
}

export interface PersonalInfo {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary?: string;
}

export interface SkillsData {
  technical: TechnicalSkill[];
  soft: string[];
  frameworks: string[];
  languages: string[];
  tools: string[];
  certifications: string[];
}

export interface TechnicalSkill {
  name: string;
  category: 'programming' | 'database' | 'cloud' | 'devops' | 'frontend' | 'backend' | 'mobile' | 'other';
  proficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

export interface ExperienceData {
  company: string;
  position: string;
  startDate?: string;
  endDate?: string;
  duration?: string;
  description: string[];
  technologies?: string[];
  achievements?: string[];
}

export interface EducationData {
  institution: string;
  degree: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  achievements?: string[];
}

export interface ProjectData {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  github?: string;
  achievements?: string[];
}

export interface LanguageData {
  name: string;
  proficiency: 'basic' | 'conversational' | 'fluent' | 'native';
}

export interface SkillAssessment {
  skill: string;
  category: string;
  questions: AssessmentQuestion[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  estimatedTime: number; // in minutes
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple-choice' | 'coding' | 'scenario' | 'explanation';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit?: number; // in minutes
  codeTemplate?: string;
  expectedOutput?: string;
}

export interface AssessmentResult {
  candidateId: string;
  assessments: SkillAssessmentResult[];
  overallScore: number;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
  processingTime: number;
  generatedAt: string;
}

export interface SkillAssessmentResult {
  skill: string;
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
  questionsAnswered: number;
  totalQuestions: number;
  timeSpent: number;
  difficulty: string;
  feedback: string;
}

export interface AIProcessingConfig {
  model: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'deepseek';
  temperature: number;
  maxTokens: number;
  enableStructuredExtraction: boolean;
  enableQuestionGeneration: boolean;
  skillCategories: string[];
  difficultyLevels: string[];
  questionTypes: string[];
}