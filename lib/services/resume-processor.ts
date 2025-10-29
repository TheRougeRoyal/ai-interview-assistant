import { extractPII } from '@/lib/parsing/extract'
import { pdfToTextWithMetadata, PDFMetadata } from '@/lib/parsing/pdf'
import { docxToText } from '@/lib/parsing/docx'

/**
 * Enhanced resume processing service using native PDF.js parsing
 * and provides structured data for the interview system
 */

export interface ResumeAnalysis {
  // Basic extraction
  text: string;
  pii: {
    fields: {
      name?: string;
      email?: string;
      phone?: string;
    };
    confidence: {
      name: number;
      email: number;
      phone: number;
    };
  };
  
  // Enhanced processing
  sections: ResumeSections;
  skills: ExtractedSkills;
  experience: ExperienceAnalysis;
  education: EducationInfo[];
  
  // Metadata
  parseSource: 'pdf' | 'docx';
  metadata?: PDFMetadata | Record<string, unknown>;
  quality: QualityMetrics;
}

export interface ResumeSections {
  summary?: string;
  experience?: string;
  education?: string;
  skills?: string;
  projects?: string;
  achievements?: string;
  certifications?: string;
}

export interface ExtractedSkills {
  technical: string[];
  soft: string[];
  languages: string[];
  frameworks: string[];
  tools: string[];
}

export interface ExperienceAnalysis {
  totalYears: number;
  roles: JobRole[];
  industries: string[];
  companies: string[];
}

export interface JobRole {
  title: string;
  company: string;
  duration: string;
  responsibilities: string[];
  technologies?: string[];
}

export interface EducationInfo {
  degree: string;
  institution: string;
  year?: string;
  field?: string;
}

export interface QualityMetrics {
  score: number; // 0-100
  completeness: number; // 0-100
  clarity: number; // 0-100
  relevance: number; // 0-100
  formatting: number; // 0-100
}

/**
 * Main resume processing service
 */
export class ResumeProcessingService {
  
  /**
   * Process uploaded resume file with native PDF parsing
   */
  async processResumeFile(file: File): Promise<ResumeAnalysis> {
    console.log(`Processing resume: ${file.name}`);
    
    // Extract text using native parsers
    const extractionResult = await this.extractTextFromFile(file);
    
    // Extract basic PII information
    const pii = extractPII(extractionResult.text);
    
    // Perform advanced analysis
    const sections = this.extractSections(extractionResult.text);
    const skills = this.extractSkills(extractionResult.text, sections);
    const experience = this.analyzeExperience(sections.experience || '', extractionResult.text);
    const education = this.extractEducation(sections.education || '', extractionResult.text);
    const quality = this.assessQuality(extractionResult.text, sections, pii);
    
    return {
      text: extractionResult.text,
      pii,
      sections,
      skills,
      experience,
      education,
      parseSource: extractionResult.source,
      metadata: extractionResult.metadata,
      quality
    };
  }
  
  /**
   * Extract text from file using appropriate native parser
   */
  private async extractTextFromFile(file: File): Promise<{
    text: string;
    source: 'pdf' | 'docx';
    metadata?: PDFMetadata | Record<string, unknown>;
  }> {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      // Use native PDF.js parser
      const result = await pdfToTextWithMetadata(file);
      return { 
        text: result.text, 
        source: 'pdf',
        metadata: result.metadata 
      };
    } else if (fileExtension === 'docx') {
      // Use DOCX parser
      const text = await docxToText(file);
      return { text, source: 'docx' };
    } else {
      throw new Error(`Unsupported file type: ${fileExtension}`);
    }
  }
  
  /**
   * Extract structured sections from resume text
   */
  private extractSections(text: string): ResumeSections {
    const sections: ResumeSections = {};
    
    // Common section headers (case insensitive)
    const sectionPatterns = {
      summary: /(?:professional\s+summary|summary|profile|objective|about)/i,
      experience: /(?:work\s+experience|experience|employment|professional\s+experience)/i,
      education: /(?:education|academic|qualifications)/i,
      skills: /(?:skills|technical\s+skills|competencies|expertise)/i,
      projects: /(?:projects|portfolio|key\s+projects)/i,
      achievements: /(?:achievements|accomplishments|awards)/i,
      certifications: /(?:certifications|certificates|licenses)/i
    };
    
    const lines = text.split('\n');
    let currentSection: keyof ResumeSections | null = null;
    let sectionContent: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line is a section header
      let foundSection: keyof ResumeSections | null = null;
      for (const [sectionKey, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(trimmedLine) && trimmedLine.length < 50) {
          foundSection = sectionKey as keyof ResumeSections;
          break;
        }
      }
      
      if (foundSection) {
        // Save previous section
        if (currentSection && sectionContent.length > 0) {
          sections[currentSection] = sectionContent.join('\n').trim();
        }
        
        // Start new section
        currentSection = foundSection;
        sectionContent = [];
      } else if (currentSection && trimmedLine) {
        // Add content to current section
        sectionContent.push(line);
      }
    }
    
    // Save the last section
    if (currentSection && sectionContent.length > 0) {
      sections[currentSection] = sectionContent.join('\n').trim();
    }
    
    return sections;
  }
  
  /**
   * Extract and categorize skills
   */
  private extractSkills(text: string, sections: ResumeSections): ExtractedSkills {
    const skillsText = (sections.skills || text).toLowerCase();
    
    // Predefined skill categories
    const technicalSkills = [
      'javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
      'react', 'angular', 'vue', 'svelte', 'next.js', 'nuxt.js', 'express', 'django', 'flask',
      'node.js', 'spring', 'laravel', 'rails', 'asp.net', 'mongodb', 'postgresql', 'mysql',
      'redis', 'elasticsearch', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'jenkins'
    ];
    
    const softSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving', 'analytical thinking',
      'project management', 'time management', 'adaptability', 'creativity', 'mentoring'
    ];
    
    const languages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'hindi'];
    
    const frameworks = [
      'react', 'angular', 'vue.js', 'express.js', 'django', 'flask', 'spring boot',
      'laravel', 'ruby on rails', 'asp.net', 'next.js', 'nuxt.js', 'svelte'
    ];
    
    const tools = [
      'git', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'jira', 'confluence',
      'figma', 'sketch', 'photoshop', 'vs code', 'intellij', 'postman'
    ];
    
    const extractFromCategory = (category: string[]) => {
      const found = new Set<string>();
      for (const skill of category) {
        const rx = new RegExp(`(^|[^a-z])${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^a-z])`, 'i');
        if (rx.test(skillsText)) found.add(skill);
      }
      return Array.from(found);
    };
    
    return {
      technical: extractFromCategory(technicalSkills),
      soft: extractFromCategory(softSkills),
      languages: extractFromCategory(languages),
      frameworks: extractFromCategory(frameworks),
      tools: extractFromCategory(tools)
    };
  }
  
  /**
   * Analyze work experience
   */
  private analyzeExperience(experienceSection: string, fullText: string): ExperienceAnalysis {
    const text = experienceSection || fullText;
    
    // Extract years of experience
    const yearMatches = text.match(/(19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current)/gi) || [];
    let totalYears = 0;
    
    yearMatches.forEach(match => {
      const [start, end] = match.split(/\s*[-–]\s*/);
      const startYear = parseInt(start);
      const endLower = end.toLowerCase();
      const endYear = endLower.includes('present') || endLower.includes('current') 
        ? new Date().getFullYear() 
        : parseInt(end);
      
      if (startYear && endYear) {
        totalYears += Math.max(0, endYear - startYear);
      }
    });
    
    // Extract companies
    const companies = this.extractCompanies(text);
    
    // Extract industries (simplified)
    const industries = this.extractIndustries(text);
    
    // Extract job roles (simplified)
    const roles = this.extractJobRoles(text);
    
    return {
      totalYears,
      roles,
      industries,
      companies
    };
  }
  
  private extractCompanies(text: string): string[] {
    // This is a simplified extraction - in production, you might use NER
    const companyKeywords = ['corp', 'inc', 'ltd', 'llc', 'company', 'technologies', 'systems', 'solutions'];
    const lines = text.split('\n');
    const companies: string[] = [];
    
    lines.forEach(line => {
      if (companyKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        const company = line.trim().split(/[-–]/)[0].trim();
        if (company && company.length > 2) {
          companies.push(company);
        }
      }
    });
    
    return [...new Set(companies)];
  }
  
  private extractIndustries(text: string): string[] {
    const industryKeywords = [
      'technology', 'software', 'healthcare', 'finance', 'banking', 'consulting',
      'retail', 'e-commerce', 'education', 'manufacturing', 'automotive'
    ];
    
    const foundIndustries = industryKeywords.filter(industry =>
      text.toLowerCase().includes(industry)
    );
    
    return [...new Set(foundIndustries)];
  }
  
  private extractJobRoles(text: string): JobRole[] {
    // Simplified job role extraction
    const roleKeywords = [
      'developer', 'engineer', 'manager', 'director', 'analyst', 'consultant',
      'designer', 'architect', 'lead', 'senior', 'junior', 'intern'
    ];
    
    const lines = text.split('\n');
    const roles: JobRole[] = [];
    
    lines.forEach(line => {
      if (roleKeywords.some(role => line.toLowerCase().includes(role))) {
        const title = line.trim();
        if (title && title.length > 2) {
          roles.push({
            title,
            company: 'Unknown', // Would need more sophisticated parsing
            duration: 'Unknown',
            responsibilities: []
          });
        }
      }
    });
    
    return roles;
  }
  
  /**
   * Extract education information
   */
  private extractEducation(educationSection: string, fullText: string): EducationInfo[] {
    const text = educationSection || fullText;
    const education: EducationInfo[] = [];
    
    const degreePatterns = [
      /bachelor|b\.?s\.?|b\.?a\.?/i,
      /master|m\.?s\.?|m\.?a\.?|mba/i,
      /phd|doctorate|ph\.?d\.?/i,
      /associate|a\.?s\.?/i
    ];
    
    const lines = text.split('\n');
    
    lines.forEach(line => {
      if (degreePatterns.some(pattern => pattern.test(line))) {
        education.push({
          degree: line.trim(),
          institution: 'Unknown', // Would need more parsing
          year: this.extractYear(line),
          field: this.extractField(line)
        });
      }
    });
    
    return education;
  }
  
  private extractYear(text: string): string | undefined {
    const yearMatch = text.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? yearMatch[0] : undefined;
  }
  
  private extractField(text: string): string | undefined {
    const fieldKeywords = [
      'computer science', 'engineering', 'business', 'mathematics', 'physics',
      'chemistry', 'biology', 'psychology', 'economics', 'marketing'
    ];
    
    const foundField = fieldKeywords.find(field =>
      text.toLowerCase().includes(field)
    );
    
    return foundField;
  }
  
  /**
   * Assess resume quality metrics
   */
  private assessQuality(text: string, sections: ResumeSections, pii: any): QualityMetrics {
    let score = 0;
    let completeness = 0;
    let clarity = 0;
    let relevance = 0;
    let formatting = 0;
    
    // Completeness (25 points)
    if (pii.fields.name) completeness += 5;
    if (pii.fields.email) completeness += 5;
    if (pii.fields.phone) completeness += 5;
    if (sections.experience) completeness += 5;
    if (sections.education || sections.skills) completeness += 5;
    
    // Clarity (25 points)
    const wordCount = text.split(/\s+/).length;
    if (wordCount > 100) clarity += 10;
    if (wordCount > 300) clarity += 10;
    if (text.includes('\n')) clarity += 5; // Has structure
    
    // Relevance (25 points)
    const techKeywords = ['developer', 'engineer', 'programming', 'software'];
    const foundTechTerms = techKeywords.filter(term =>
      text.toLowerCase().includes(term)
    ).length;
    relevance = Math.min(25, foundTechTerms * 8);
    
    // Formatting (25 points)
    if (sections.summary) formatting += 5;
    if (Object.keys(sections).length >= 3) formatting += 10;
    if (text.match(/\b(19|20)\d{2}\b/)) formatting += 5; // Has dates
    if (text.includes('@')) formatting += 5; // Has email

    // Penalty for overly long/short resumes affecting clarity
    if (wordCount < 80) {
      clarity = Math.max(0, clarity - 5);
    } else if (wordCount > 1200) {
      clarity = Math.max(0, clarity - 10);
    }
    
    score = completeness + clarity + relevance + formatting;
    
    return {
      score: Math.min(100, score),
      completeness,
      clarity,
      relevance,
      formatting
    };
  }
  
  /**
   * Generate interview context from processed resume
   */
  generateInterviewContext(analysis: ResumeAnalysis): string {
    const context = [];
    
    if (analysis.pii.fields.name) {
      context.push(`Candidate: ${analysis.pii.fields.name}`);
    }
    
    if (analysis.experience.totalYears > 0) {
      context.push(`Experience: ${analysis.experience.totalYears} years`);
    }
    
    if (analysis.skills.technical.length > 0) {
      context.push(`Technical Skills: ${analysis.skills.technical.slice(0, 5).join(', ')}`);
    }
    
    if (analysis.experience.roles.length > 0) {
      const recentRole = analysis.experience.roles[0];
      context.push(`Recent Role: ${recentRole.title}`);
    }
    
    if (analysis.sections.summary) {
      const summary = analysis.sections.summary.slice(0, 200);
      context.push(`Summary: ${summary}`);
    }
    
    return context.join('\n');
  }
}

// Export singleton instance
export const resumeProcessingService = new ResumeProcessingService();