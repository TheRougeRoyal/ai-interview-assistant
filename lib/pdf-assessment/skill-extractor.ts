/**
 * AI-powered skill and data extraction from structured documents
 */

import { ask } from '@/lib/ai/gateway';
import type { 
  ExtractedData, 
  DocumentStructure, 
  PersonalInfo, 
  SkillsData, 
  ExperienceData,
  EducationData,
  ProjectData,
  TechnicalSkill,
  AIProcessingConfig 
} from './types';

export class SkillExtractor {
  private config: AIProcessingConfig;
  private stats = {
    extractionsPerformed: 0,
    averageProcessingTime: 0,
    skillsExtracted: 0,
    experienceEntriesExtracted: 0,
    errors: 0
  };

  constructor(config: AIProcessingConfig) {
    this.config = config;
  }

  /**
   * Extract structured data from document text and structure
   */
  async extractData(text: string, structure: DocumentStructure): Promise<ExtractedData> {
    const startTime = Date.now();
    
    try {
      console.log('Extracting structured data with AI...');
      
      // Extract different types of data in parallel for efficiency
      const [personalInfo, skills, experience, education, projects] = await Promise.all([
        this.extractPersonalInfo(text, structure),
        this.extractSkills(text, structure),
        this.extractExperience(text, structure),
        this.extractEducation(text, structure),
        this.extractProjects(text, structure)
      ]);

      const achievements = await this.extractAchievements(text, structure);
      const languages = await this.extractLanguages(text, structure);

      // Update stats
      this.stats.extractionsPerformed++;
      this.stats.skillsExtracted += skills.technical.length + skills.frameworks.length;
      this.stats.experienceEntriesExtracted += experience.length;
      
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.extractionsPerformed - 1) + processingTime) / 
        this.stats.extractionsPerformed;

      console.log(`Data extraction completed in ${processingTime}ms`);
      
      return {
        personalInfo,
        skills,
        experience,
        education,
        projects,
        achievements,
        languages
      };
      
    } catch (error) {
      this.stats.errors++;
      console.error('Data extraction failed:', error);
      throw error;
    }
  }

  /**
   * Extract personal information
   */
  private async extractPersonalInfo(text: string, structure: DocumentStructure): Promise<PersonalInfo> {
    const contactSections = structure.sections.filter(s => s.type === 'contact');
    const relevantText = contactSections.length > 0 
      ? contactSections.map(s => s.content).join('\n')
      : text.substring(0, 500); // First 500 chars likely contain contact info

    const prompt = `Extract personal information from this text:

${relevantText}

Return JSON format:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "+1234567890",
  "location": "City, State/Country",
  "linkedin": "linkedin.com/in/username",
  "github": "github.com/username",
  "website": "website.com",
  "summary": "Professional summary if available"
}

Only include fields that are clearly present. Use null for missing fields.`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.1, // Low temperature for factual extraction
        maxTokens: 500
      });

      return this.parsePersonalInfo(response);
    } catch (error) {
      console.warn('Personal info extraction failed, using fallback:', error);
      return this.extractPersonalInfoFallback(text);
    }
  }

  /**
   * Extract skills data
   */
  private async extractSkills(text: string, structure: DocumentStructure): Promise<SkillsData> {
    const skillsSections = structure.sections.filter(s => s.type === 'skills');
    const relevantText = skillsSections.length > 0 
      ? skillsSections.map(s => s.content).join('\n')
      : text; // Use full text if no skills section identified

    const prompt = `Extract skills from this resume text:

${relevantText.substring(0, 2000)}

Categorize skills and return JSON:
{
  "technical": [
    {
      "name": "JavaScript",
      "category": "programming|database|cloud|devops|frontend|backend|mobile|other",
      "proficiency": "beginner|intermediate|advanced|expert",
      "yearsOfExperience": 3
    }
  ],
  "soft": ["Leadership", "Communication"],
  "frameworks": ["React", "Node.js"],
  "languages": ["JavaScript", "Python"],
  "tools": ["Git", "Docker"],
  "certifications": ["AWS Certified"]
}

Focus on:
- Programming languages
- Frameworks and libraries
- Cloud platforms
- Databases
- Development tools
- Soft skills
- Certifications

Estimate proficiency and experience years based on context clues.`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.2,
        maxTokens: 1000
      });

      return this.parseSkillsData(response);
    } catch (error) {
      console.warn('Skills extraction failed, using fallback:', error);
      return this.extractSkillsFallback(text);
    }
  }

  /**
   * Extract work experience
   */
  private async extractExperience(text: string, structure: DocumentStructure): Promise<ExperienceData[]> {
    const experienceSections = structure.sections.filter(s => s.type === 'experience');
    const relevantText = experienceSections.length > 0 
      ? experienceSections.map(s => s.content).join('\n')
      : text;

    const prompt = `Extract work experience from this text:

${relevantText.substring(0, 2000)}

Return JSON array:
[
  {
    "company": "Company Name",
    "position": "Job Title",
    "startDate": "MM/YYYY or Month YYYY",
    "endDate": "MM/YYYY or Present",
    "duration": "2 years 3 months",
    "description": ["Responsibility 1", "Achievement 2"],
    "technologies": ["Tech1", "Tech2"],
    "achievements": ["Quantified achievement"]
  }
]

Extract:
- Company names and job titles
- Employment dates and duration
- Key responsibilities and achievements
- Technologies used
- Quantifiable results when available`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.2,
        maxTokens: 1500
      });

      return this.parseExperienceData(response);
    } catch (error) {
      console.warn('Experience extraction failed, using fallback:', error);
      return [];
    }
  }

  /**
   * Extract education data
   */
  private async extractEducation(text: string, structure: DocumentStructure): Promise<EducationData[]> {
    const educationSections = structure.sections.filter(s => s.type === 'education');
    const relevantText = educationSections.length > 0 
      ? educationSections.map(s => s.content).join('\n')
      : text;

    const prompt = `Extract education information:

${relevantText.substring(0, 1000)}

Return JSON array:
[
  {
    "institution": "University Name",
    "degree": "Bachelor of Science",
    "field": "Computer Science",
    "startDate": "2018",
    "endDate": "2022",
    "gpa": "3.8/4.0",
    "achievements": ["Dean's List", "Magna Cum Laude"]
  }
]`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.1,
        maxTokens: 800
      });

      return this.parseEducationData(response);
    } catch (error) {
      console.warn('Education extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract projects data
   */
  private async extractProjects(text: string, structure: DocumentStructure): Promise<ProjectData[]> {
    const projectSections = structure.sections.filter(s => s.type === 'projects');
    const relevantText = projectSections.length > 0 
      ? projectSections.map(s => s.content).join('\n')
      : text;

    const prompt = `Extract project information:

${relevantText.substring(0, 1500)}

Return JSON array:
[
  {
    "name": "Project Name",
    "description": "Brief description",
    "technologies": ["React", "Node.js"],
    "url": "https://project.com",
    "github": "https://github.com/user/repo",
    "achievements": ["Performance improvement", "User adoption"]
  }
]`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.2,
        maxTokens: 1000
      });

      return this.parseProjectData(response);
    } catch (error) {
      console.warn('Projects extraction failed:', error);
      return [];
    }
  }

  /**
   * Extract achievements
   */
  private async extractAchievements(text: string, structure: DocumentStructure): Promise<string[]> {
    const prompt = `Extract notable achievements and accomplishments:

${text.substring(0, 1500)}

Return JSON array of strings:
["Achievement 1", "Achievement 2"]

Focus on:
- Awards and recognitions
- Quantifiable results
- Leadership roles
- Publications
- Patents
- Certifications`;

    try {
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: 0.2,
        maxTokens: 500
      });

      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Extract language proficiencies
   */
  private async extractLanguages(text: string, structure: DocumentStructure): Promise<any[]> {
    // Simple implementation - can be enhanced
    const languageKeywords = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese'];
    const found = languageKeywords.filter(lang => 
      text.toLowerCase().includes(lang)
    );

    return found.map(lang => ({
      name: lang.charAt(0).toUpperCase() + lang.slice(1),
      proficiency: 'conversational' // Default proficiency
    }));
  }

  /**
   * Parse personal info from AI response
   */
  private parsePersonalInfo(response: string): PersonalInfo {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name || undefined,
          email: parsed.email || undefined,
          phone: parsed.phone || undefined,
          location: parsed.location || undefined,
          linkedin: parsed.linkedin || undefined,
          github: parsed.github || undefined,
          website: parsed.website || undefined,
          summary: parsed.summary || undefined
        };
      }
    } catch (error) {
      console.warn('Failed to parse personal info:', error);
    }
    return {};
  }

  /**
   * Parse skills data from AI response
   */
  private parseSkillsData(response: string): SkillsData {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          technical: (parsed.technical || []).map((skill: any) => ({
            name: skill.name,
            category: skill.category || 'other',
            proficiency: skill.proficiency || 'intermediate',
            yearsOfExperience: skill.yearsOfExperience || undefined
          })),
          soft: parsed.soft || [],
          frameworks: parsed.frameworks || [],
          languages: parsed.languages || [],
          tools: parsed.tools || [],
          certifications: parsed.certifications || []
        };
      }
    } catch (error) {
      console.warn('Failed to parse skills data:', error);
    }
    return this.extractSkillsFallback('');
  }

  /**
   * Parse experience data from AI response
   */
  private parseExperienceData(response: string): ExperienceData[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((exp: any) => ({
          company: exp.company || '',
          position: exp.position || '',
          startDate: exp.startDate || undefined,
          endDate: exp.endDate || undefined,
          duration: exp.duration || undefined,
          description: Array.isArray(exp.description) ? exp.description : [exp.description || ''],
          technologies: exp.technologies || [],
          achievements: exp.achievements || []
        }));
      }
    } catch (error) {
      console.warn('Failed to parse experience data:', error);
    }
    return [];
  }

  /**
   * Parse education data from AI response
   */
  private parseEducationData(response: string): EducationData[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((edu: any) => ({
          institution: edu.institution || '',
          degree: edu.degree || '',
          field: edu.field || undefined,
          startDate: edu.startDate || undefined,
          endDate: edu.endDate || undefined,
          gpa: edu.gpa || undefined,
          achievements: edu.achievements || []
        }));
      }
    } catch (error) {
      console.warn('Failed to parse education data:', error);
    }
    return [];
  }

  /**
   * Parse project data from AI response
   */
  private parseProjectData(response: string): ProjectData[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.map((proj: any) => ({
          name: proj.name || '',
          description: proj.description || '',
          technologies: proj.technologies || [],
          url: proj.url || undefined,
          github: proj.github || undefined,
          achievements: proj.achievements || []
        }));
      }
    } catch (error) {
      console.warn('Failed to parse project data:', error);
    }
    return [];
  }

  /**
   * Fallback methods for when AI extraction fails
   */
  private extractPersonalInfoFallback(text: string): PersonalInfo {
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    const phoneMatch = text.match(/[\+]?[\d\s\-\(\)]{10,}/);
    
    return {
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0].trim() : undefined
    };
  }

  private extractSkillsFallback(text: string): SkillsData {
    const commonSkills = [
      'javascript', 'python', 'java', 'react', 'node.js', 'sql', 'git', 'aws', 'docker'
    ];
    
    const foundSkills = commonSkills.filter(skill => 
      text.toLowerCase().includes(skill)
    );

    return {
      technical: foundSkills.map(skill => ({
        name: skill,
        category: 'other' as const,
        proficiency: 'intermediate' as const
      })),
      soft: [],
      frameworks: [],
      languages: foundSkills,
      tools: [],
      certifications: []
    };
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