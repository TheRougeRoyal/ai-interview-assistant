import { z } from "zod";
import { QuestionSchema } from "../schemas/question";
import { RubricSchema, type Rubric } from "../schemas/rubric";
import { SummarySchema } from "../schemas/summary";
import { ResumeAnalysisSchema } from "../schemas/resume";

// Payload types
type GenerateQuestionPayload = {
  difficulty: "easy" | "medium" | "hard";
  role: string;
  resumeContext?: string;
};

type ScorePayload = {
  question: string;
  answer: string;
  durationMs: number;
  timeTakenMs: number;
};

type SummaryPayload = {
  rubrics: Rubric[];
};

// Utilities
const nonAlphaNumRegex = /[^a-z0-9]+/i;

function tokenizeForKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(nonAlphaNumRegex)
    .filter((t) => t.length >= 3);
}

function computeOverlapPercentage(answerTokens: string[], questionTokens: string[]): number {
  if (answerTokens.length === 0 || questionTokens.length === 0) return 0;
  const answerSet = new Set(answerTokens);
  const questionSet = new Set(questionTokens);
  let overlap = 0;
  for (const token of answerSet) {
    if (questionSet.has(token)) overlap += 1;
  }
  const denom = Math.max(answerSet.size, questionSet.size);
  const pct = Math.round((overlap / denom) * 100);
  return Math.max(0, Math.min(100, pct));
}

function computeCompleteness(len: number): number {
  if (len >= 180) return 100;
  if (len >= 120) return 75;
  if (len >= 60) return 50;
  return 25;
}

function computeRelevance(overlapCount: number): number {
  if (overlapCount >= 5) return 100;
  if (overlapCount >= 3) return 70;
  if (overlapCount >= 1) return 40;
  return 10;
}

function computeTimeliness(durationMs: number, timeTakenMs: number): number {
  const raw = Math.round((100 * (durationMs - timeTakenMs)) / durationMs);
  return Math.max(0, Math.min(100, raw));
}

function computeWeightedTotal(
  accuracy: number,
  completeness: number,
  relevance: number,
  timeliness: number
): number {
  return Math.round(0.4 * accuracy + 0.3 * completeness + 0.2 * relevance + 0.1 * timeliness);
}

// generate_question
export function generate_question(payload: unknown) {
  const P = payload as GenerateQuestionPayload;
  const { difficulty, role, resumeContext } = P;

  let prompt: string;
  if (difficulty === "easy") {
    prompt = `In one sentence, explain what ${role} should know about HTTP status codes 200 vs 404.`;
  } else if (difficulty === "medium") {
    prompt = `Given a ${role} app with slow list rendering, outline a pragmatic approach to improve perceived performance.`;
  } else if (difficulty === "hard") {
    prompt = `Design a caching strategy for a ${role} service serving paginated search results under read-heavy load.`;
  } else {
    // default to easy template if invalid difficulty provided
    prompt = `In one sentence, explain what ${role} should know about HTTP status codes 200 vs 404.`;
  }

  if (resumeContext && resumeContext.trim().length > 0) {
    prompt += " (consider the candidate’s background)";
  }

  const result = QuestionSchema.parse({ prompt });
  return result;
}

// score
export function score(payload: unknown) {
  const P = payload as ScorePayload;
  const { question, answer, durationMs, timeTakenMs } = P;

  const qTokens = tokenizeForKeywords(question);
  const aTokens = tokenizeForKeywords(answer);

  const accuracy = computeOverlapPercentage(aTokens, qTokens);

  // For relevance bands we need raw overlap count between sets
  const aSet = new Set(aTokens);
  const qSet = new Set(qTokens);
  let overlapCount = 0;
  for (const token of aSet) if (qSet.has(token)) overlapCount += 1;

  const completeness = computeCompleteness(answer.length);
  const relevance = computeRelevance(overlapCount);
  const timeliness = computeTimeliness(durationMs, timeTakenMs);

  const total = computeWeightedTotal(accuracy, completeness, relevance, timeliness);

  const rubricCandidate = {
    accuracy,
    completeness,
    relevance,
    timeliness,
    rationale: "Scored by keyword overlap, length bands, and time remaining.",
    total,
  };

  // Ensure it passes the schema before returning
  const rubric = RubricSchema.parse(rubricCandidate);
  return rubric;
}

// summary
export function summary(payload: unknown) {
  const P = payload as SummaryPayload;
  const { rubrics } = P;

  // Basic validation that array exists
  const rubricsArray = Array.isArray(rubrics) ? rubrics : [];
  const validRubrics: Rubric[] = rubricsArray.map((r) => RubricSchema.parse(r));

  const count = validRubrics.length || 1; // avoid div by 0; schema will enforce later semantics
  const totalsAvg = Math.round(validRubrics.reduce((s, r) => s + r.total, 0) / count);

  const avg = {
    accuracy: Math.round(validRubrics.reduce((s, r) => s + r.accuracy, 0) / count),
    completeness: Math.round(validRubrics.reduce((s, r) => s + r.completeness, 0) / count),
    relevance: Math.round(validRubrics.reduce((s, r) => s + r.relevance, 0) / count),
    timeliness: Math.round(validRubrics.reduce((s, r) => s + r.timeliness, 0) / count),
  };

  const entries = Object.entries(avg) as Array<[
    keyof typeof avg,
    number
  ]>;
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const [top1, top2] = [sorted[0][0], sorted[1]?.[0] ?? sorted[0][0]];
  const bottom = sorted[sorted.length - 1][0];

  const strengths = [top1, top2] as [string, string?];

  const summaryTextParts: string[] = [];
  summaryTextParts.push(
    `Candidate showed strengths in ${top1}/${top2 ?? top1} but needs to improve ${bottom}.`
  );
  // Add a second sentence deterministically
  summaryTextParts.push(
    `Maintain focus on ${top1} while addressing ${bottom} for better overall performance.`
  );
  const summaryText = summaryTextParts.join(" ");

  const gapHintMap: Record<string, string> = {
    timeliness: "timeliness — practice concise answers under time pressure",
    relevance: "relevance — align responses closely with question keywords",
    accuracy: "accuracy — verify facts and terminology before finalizing",
    completeness: "completeness — cover all key aspects succinctly",
  };
  const gap = `${bottom} — ${gapHintMap[bottom]}`;

  const result = SummarySchema.parse({
    finalScore: totalsAvg,
    summary: summaryText,
    strengths: [strengths[0], strengths[1] ?? strengths[0]].slice(0, 2),
    gap,
  });

  return result;
}

export async function analyze_resume(payload: unknown) {
  const input = z.object({
    resumeText: z.string(),
  }).parse(payload);

  const { resumeText } = input;

  // Mock analysis based on resume text content
  const text = resumeText.toLowerCase();
  const words = text.split(/\s+/);
  
  // Mock skills extraction based on common keywords
  const technicalSkills: string[] = [];
  const frameworks: string[] = [];
  const tools: string[] = [];
  const languages: string[] = [];
  const soft: string[] = [];
  const certifications: string[] = [];
  const domains: string[] = [];

  // Technical skills detection
  const techKeywords = ['javascript', 'python', 'java', 'react', 'node', 'sql', 'aws', 'docker', 'git', 'html', 'css', 'typescript', 'mongodb', 'postgresql', 'kubernetes'];
  techKeywords.forEach(skill => {
    if (text.includes(skill)) technicalSkills.push(skill);
  });

  // Frameworks detection  
  const frameworkKeywords = ['react', 'angular', 'vue', 'django', 'spring', 'express', 'next.js', 'flask', 'rails'];
  frameworkKeywords.forEach(fw => {
    if (text.includes(fw)) frameworks.push(fw);
  });

  // Tools detection
  const toolKeywords = ['git', 'docker', 'jenkins', 'jira', 'confluence', 'vs code', 'intellij', 'postman', 'figma'];
  toolKeywords.forEach(tool => {
    if (text.includes(tool)) tools.push(tool);
  });

  // Languages detection
  const langKeywords = ['english', 'spanish', 'french', 'german', 'mandarin', 'hindi', 'portuguese'];
  langKeywords.forEach(lang => {
    if (text.includes(lang)) languages.push(lang);
  });

  // Soft skills detection
  const softKeywords = ['leadership', 'communication', 'teamwork', 'problem solving', 'analytical', 'creative', 'organized'];
  softKeywords.forEach(skill => {
    if (text.includes(skill)) soft.push(skill);
  });

  // Default values if nothing detected
  if (technicalSkills.length === 0) technicalSkills.push('JavaScript', 'Python', 'SQL');
  if (soft.length === 0) soft.push('Communication', 'Problem Solving', 'Teamwork');
  if (languages.length === 0) languages.push('English');

  // Mock experience calculation based on content length and keywords
  const experienceIndicators = ['years', 'experience', 'senior', 'lead', 'manager', 'director'];
  const hasExperienceKeywords = experienceIndicators.some(keyword => text.includes(keyword));
  const experienceYears = hasExperienceKeywords ? Math.min(8, Math.max(2, Math.floor(words.length / 100))) : Math.max(1, Math.floor(words.length / 150));

  // Determine seniority level
  let seniorityLevel: "entry" | "mid" | "senior" | "lead" | "executive";
  if (experienceYears <= 2) seniorityLevel = "entry";
  else if (experienceYears <= 5) seniorityLevel = "mid";
  else if (experienceYears <= 10) seniorityLevel = "senior";
  else if (text.includes('director') || text.includes('vp') || text.includes('cto') || text.includes('ceo')) seniorityLevel = "executive";
  else seniorityLevel = "lead";

  // Generate mock summary
  const summary = `Experienced ${seniorityLevel}-level professional with ${experienceYears} years in software development. Strong background in ${technicalSkills.slice(0, 2).join(' and ')} with proven ${soft.slice(0, 2).join(' and ').toLowerCase()} skills.`;

  // Generate strengths
  const strengths = [
    ...technicalSkills.slice(0, 2),
    ...soft.slice(0, 2),
    'Problem Solving'
  ].slice(0, 4);

  // Quality score based on resume length and content richness
  const qualityScore = Math.min(100, Math.max(40, 
    30 + (words.length / 20) + 
    (technicalSkills.length * 5) + 
    (soft.length * 3) + 
    (experienceYears * 2)
  ));

  const result = ResumeAnalysisSchema.parse({
    skills: {
      technical: technicalSkills,
      soft: soft,
      languages: languages,
      frameworks: frameworks,
      tools: tools,
      certifications: certifications,
      domains: domains
    },
    experience_years: experienceYears,
    seniority_level: seniorityLevel,
    summary: summary,
    strengths: strengths,
    quality_score: Math.round(qualityScore)
  });

  return result;
}
