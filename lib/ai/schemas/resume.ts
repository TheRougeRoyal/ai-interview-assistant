import { z } from "zod";

export const SkillsExtractionSchema = z.object({
  technical: z.array(z.string()).describe("Technical skills like programming languages, databases, cloud platforms"),
  soft: z.array(z.string()).describe("Soft skills like leadership, communication, problem-solving"),
  languages: z.array(z.string()).describe("Spoken/written languages like English, Spanish, French"),
  frameworks: z.array(z.string()).describe("Frameworks and libraries like React, Django, TensorFlow"),
  tools: z.array(z.string()).describe("Development tools, IDEs, and software like Git, Docker, VS Code"),
  certifications: z.array(z.string()).optional().describe("Professional certifications if mentioned"),
  domains: z.array(z.string()).optional().describe("Domain expertise like Healthcare, Finance, E-commerce")
});

export type SkillsExtraction = z.infer<typeof SkillsExtractionSchema>;

export const ResumeAnalysisSchema = z.object({
  skills: SkillsExtractionSchema,
  experience_years: z.number().describe("Total years of professional experience"),
  seniority_level: z.enum(["entry", "mid", "senior", "lead", "executive"]).describe("Estimated seniority level"),
  summary: z.string().describe("Brief professional summary in 2-3 sentences"),
  strengths: z.array(z.string()).describe("Top 3-5 key strengths based on resume content"),
  quality_score: z.number().min(0).max(100).describe("Overall resume quality score 0-100")
});

export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>;