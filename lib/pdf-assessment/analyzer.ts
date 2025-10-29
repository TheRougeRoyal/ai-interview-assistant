/**
 * Document structure analyzer using AI to identify sections and content types
 */

import { ask } from '@/lib/ai/gateway';
import type { DocumentStructure, DocumentSection, AIProcessingConfig } from './types';

export class DocumentAnalyzer {
  private config: AIProcessingConfig;
  private stats = {
    documentsAnalyzed: 0,
    averageProcessingTime: 0,
    successRate: 0,
    errors: 0
  };

  constructor(config: AIProcessingConfig) {
    this.config = config;
  }

  /**
   * Analyze document structure and identify sections
   */
  async analyzeStructure(text: string): Promise<DocumentStructure> {
    const startTime = Date.now();
    
    try {
      console.log('Analyzing document structure with AI...');
      
      const prompt = this.buildStructureAnalysisPrompt(text);
      const response = await ask(prompt, {
        model: this.config.model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      const structure = this.parseStructureResponse(response, text);
      
      // Update stats
      this.stats.documentsAnalyzed++;
      const processingTime = Date.now() - startTime;
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (this.stats.documentsAnalyzed - 1) + processingTime) / 
        this.stats.documentsAnalyzed;
      
      console.log(`Document structure analysis completed in ${processingTime}ms`);
      return structure;
      
    } catch (error) {
      this.stats.errors++;
      console.error('Document structure analysis failed:', error);
      
      // Return fallback structure
      return this.createFallbackStructure(text);
    }
  }

  /**
   * Build AI prompt for structure analysis
   */
  private buildStructureAnalysisPrompt(text: string): string {
    const truncatedText = text.length > 3000 ? text.substring(0, 3000) + '...' : text;
    
    return `Analyze this document and identify its structure. This appears to be a resume or CV.

Document text:
${truncatedText}

Please identify and categorize sections in JSON format:
{
  "sections": [
    {
      "type": "header|paragraph|list|table|contact|skills|experience|education|projects",
      "content": "extracted content",
      "confidence": 0.0-1.0,
      "position": {
        "page": 1,
        "x": 0,
        "y": 0,
        "width": 100,
        "height": 20
      }
    }
  ],
  "tables": [],
  "images": [],
  "headers": [
    {
      "level": 1-6,
      "text": "header text",
      "page": 1
    }
  ],
  "paragraphs": [
    {
      "text": "paragraph content",
      "page": 1,
      "isListItem": false
    }
  ]
}

Focus on identifying:
1. Contact information section
2. Professional summary/objective
3. Work experience entries
4. Education section
5. Skills section
6. Projects section
7. Achievements/awards
8. Certifications

Provide confidence scores based on how certain you are about each section identification.`;
  }

  /**
   * Parse AI response into structured format
   */
  private parseStructureResponse(response: string, originalText: string): DocumentStructure {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and enhance the structure
      return {
        sections: this.validateSections(parsed.sections || []),
        tables: parsed.tables || [],
        images: parsed.images || [],
        headers: parsed.headers || [],
        paragraphs: parsed.paragraphs || []
      };
      
    } catch (error) {
      console.warn('Failed to parse AI structure response, using fallback:', error);
      return this.createFallbackStructure(originalText);
    }
  }

  /**
   * Validate and enhance section data
   */
  private validateSections(sections: any[]): DocumentSection[] {
    return sections
      .filter(section => section.type && section.content)
      .map(section => ({
        type: this.validateSectionType(section.type),
        content: String(section.content).trim(),
        confidence: Math.max(0, Math.min(1, Number(section.confidence) || 0.5)),
        position: {
          page: Math.max(1, Number(section.position?.page) || 1),
          x: Number(section.position?.x) || 0,
          y: Number(section.position?.y) || 0,
          width: Number(section.position?.width) || 100,
          height: Number(section.position?.height) || 20
        }
      }));
  }

  /**
   * Validate section type
   */
  private validateSectionType(type: string): DocumentSection['type'] {
    const validTypes: DocumentSection['type'][] = [
      'header', 'paragraph', 'list', 'table', 'contact', 
      'skills', 'experience', 'education', 'projects'
    ];
    
    return validTypes.includes(type as DocumentSection['type']) 
      ? type as DocumentSection['type'] 
      : 'paragraph';
  }

  /**
   * Create fallback structure when AI analysis fails
   */
  private createFallbackStructure(text: string): DocumentStructure {
    const lines = text.split('\n').filter(line => line.trim());
    const sections: DocumentSection[] = [];
    
    // Simple heuristic-based section detection
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return;

      let sectionType: DocumentSection['type'] = 'paragraph';
      let confidence = 0.3;

      // Detect section types using keywords
      const lowerLine = trimmedLine.toLowerCase();
      
      if (this.isContactInfo(lowerLine)) {
        sectionType = 'contact';
        confidence = 0.7;
      } else if (this.isSkillsSection(lowerLine)) {
        sectionType = 'skills';
        confidence = 0.6;
      } else if (this.isExperienceSection(lowerLine)) {
        sectionType = 'experience';
        confidence = 0.6;
      } else if (this.isEducationSection(lowerLine)) {
        sectionType = 'education';
        confidence = 0.6;
      } else if (this.isProjectsSection(lowerLine)) {
        sectionType = 'projects';
        confidence = 0.6;
      } else if (this.isHeader(trimmedLine)) {
        sectionType = 'header';
        confidence = 0.5;
      }

      sections.push({
        type: sectionType,
        content: trimmedLine,
        confidence,
        position: {
          page: 1,
          x: 0,
          y: index * 20,
          width: 100,
          height: 20
        }
      });
    });

    return {
      sections,
      tables: [],
      images: [],
      headers: sections
        .filter(s => s.type === 'header')
        .map((s, i) => ({
          level: 1,
          text: s.content,
          page: 1
        })),
      paragraphs: sections
        .filter(s => s.type === 'paragraph')
        .map(s => ({
          text: s.content,
          page: 1,
          isListItem: s.content.startsWith('•') || s.content.startsWith('-')
        }))
    };
  }

  /**
   * Heuristic methods for section detection
   */
  private isContactInfo(line: string): boolean {
    return /email|phone|linkedin|github|address|@/.test(line);
  }

  private isSkillsSection(line: string): boolean {
    return /skills|technologies|programming|languages|frameworks/.test(line);
  }

  private isExperienceSection(line: string): boolean {
    return /experience|work|employment|position|company|job/.test(line);
  }

  private isEducationSection(line: string): boolean {
    return /education|degree|university|college|school|bachelor|master|phd/.test(line);
  }

  private isProjectsSection(line: string): boolean {
    return /projects|portfolio|github|built|developed|created/.test(line);
  }

  private isHeader(line: string): boolean {
    return line.length < 50 && 
           (line === line.toUpperCase() || 
            /^[A-Z][a-z\s]+$/.test(line)) &&
           !line.includes('@') &&
           !line.includes('http');
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
    return {
      ...this.stats,
      successRate: this.stats.documentsAnalyzed > 0 
        ? (this.stats.documentsAnalyzed - this.stats.errors) / this.stats.documentsAnalyzed 
        : 0
    };
  }
}