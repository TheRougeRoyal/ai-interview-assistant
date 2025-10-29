import { z } from "zod";
import { QuestionSchema } from "../schemas/question";
import { RubricSchema } from "../schemas/rubric"; 
import { SummarySchema } from "../schemas/summary";
import { ResumeAnalysisSchema } from "../schemas/resume";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";
const DEEPSEEK_MODEL = process.env.AI_MODEL || "deepseek-chat";
const TEMPERATURE = 0.2;

function requireApiKey(): string {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw { code: "DEEPSEEK_ERROR", message: "Missing DEEPSEEK_API_KEY in environment." };
  }
  return key;
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    // remove first line ``` or ```json and trailing ```
    const withoutFirst = trimmed.replace(/^```[a-zA-Z]*\n/, "");
    return withoutFirst.replace(/\n```\s*$/, "");
  }
  return trimmed;
}

async function callDeepSeek(messages: ChatMessage[]): Promise<unknown> {
  const apiKey = requireApiKey();
  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        temperature: TEMPERATURE,
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek HTTP ${response.status}: ${text}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    
    const content = data.choices?.[0]?.message?.content ?? "";
    const jsonText = stripCodeFences(content);
    return JSON.parse(jsonText) as unknown;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw { code: "DEEPSEEK_ERROR", message };
  }
}

// generate_question
type GenerateQuestionPayload = {
  difficulty: "easy" | "medium" | "hard";
  role: string;
  resumeContext?: string;
};

export async function generate_question(payload: unknown) {
  const { difficulty, role, resumeContext } = payload as GenerateQuestionPayload;
  const system: ChatMessage = {
    role: "system",
    content:
      "You are a strict interview engine. Output only a compact JSON object matching the provided schema; no extra text. Return valid JSON with a 'prompt' field containing a single interview question.",
  };
  const user: ChatMessage = {
    role: "user",
    content:
      `Generate ONE interview question for a ${role} candidate at ${difficulty} difficulty. Keep it one sentence. If resume context is provided, consider it. Return { "prompt": "..." }.` +
      (resumeContext ? ` Resume context: ${resumeContext}` : ""),
  };
  const raw = await callDeepSeek([system, user]);
  const parsed = QuestionSchema.safeParse(raw);
  if (!parsed.success) {
    throw { code: "SCHEMA_VALIDATION_FAILED", message: parsed.error.message };
  }
  return parsed.data;
}

// score
type ScorePayload = {
  question: string;
  answer: string;
  durationMs: number;
  timeTakenMs: number;
};

export async function score(payload: unknown) {
  const { question, answer, durationMs, timeTakenMs } = payload as ScorePayload;
  const system: ChatMessage = {
    role: "system",
    content:
      "Return a JSON object that strictly matches the provided rubric schema. Use integers 0–100. Total must equal weighted sum (40/30/20/10). One-sentence rationale. " +
      "Evaluate based on technical merit only. Do not consider demographic factors, personal characteristics, or writing style preferences. " +
      "Focus on accuracy, completeness, relevance, and timeliness of the technical response. " +
      "Return JSON with: accuracy, completeness, relevance, timeliness, total, rationale fields.",
  };
  const user: ChatMessage = {
    role: "user",
    content: JSON.stringify({ 
      question, 
      answer, 
      durationMs, 
      timeTakenMs, 
      weights: { accuracy: 0.4, completeness: 0.3, relevance: 0.2, timeliness: 0.1 },
      fairnessGuidelines: "Evaluate technical content only, ignore personal characteristics"
    }),
  };
  const raw = await callDeepSeek([system, user]);
  const parsed = RubricSchema.safeParse(raw);
  if (!parsed.success) {
    throw { code: "SCHEMA_VALIDATION_FAILED", message: parsed.error.message };
  }
  return parsed.data;
}

// summary
type SummaryPayload = {
  rubrics: z.infer<typeof RubricSchema>[];
};

export async function summary(payload: unknown) {
  const { rubrics } = payload as SummaryPayload;
  const system: ChatMessage = {
    role: "system",
    content:
      "Compute the finalScore as Math.round(average of rubric.total). Provide a concise 2–3 sentence summary, top-2 strengths (dimension names), and a single gap with a short improvement hint. " +
      "Return JSON with: finalScore (number), summary (string), strengths (array of 2 strings), gap (string).",
  };
  const user: ChatMessage = {
    role: "user",
    content: JSON.stringify({ rubrics }),
  };
  const raw = await callDeepSeek([system, user]);
  const parsed = SummarySchema.safeParse(raw);
  if (!parsed.success) {
    throw { code: "SCHEMA_VALIDATION_FAILED", message: parsed.error.message };
  }
  return parsed.data;
}

export async function analyze_resume(payload: unknown) {
  const input = z.object({
    resumeText: z.string().describe("The full text content of the resume to analyze"),
  }).parse(payload);

  const { resumeText } = input;

  const system: ChatMessage = {
    role: "system",
    content: `You are an expert HR analyst and resume reviewer. Analyze the provided resume text and extract structured information.

Extract and categorize skills into these specific categories:
- technical: Programming languages, databases, cloud platforms, technical methodologies
- soft: Communication, leadership, problem-solving, teamwork, adaptability
- languages: Spoken/written languages (English, Spanish, French, etc.)
- frameworks: Frameworks and libraries (React, Django, TensorFlow, Spring, etc.)
- tools: Development tools, IDEs, software (Git, Docker, VS Code, Jira, etc.)
- certifications: Professional certifications if mentioned
- domains: Domain expertise areas (Healthcare, Finance, E-commerce, etc.)

Analyze experience level and provide:
- experience_years: Total years of professional experience (estimate if not explicit)
- seniority_level: entry (0-2 years), mid (3-5 years), senior (6-10 years), lead (10+ years), executive (C-level)
- summary: 2-3 sentence professional summary highlighting key qualifications
- strengths: Top 3-5 key strengths based on resume content
- quality_score: Resume quality score 0-100 based on completeness, clarity, relevance, formatting

Return valid JSON with: skills (object with arrays), experience_years (number), seniority_level (string), summary (string), strengths (array), quality_score (number).`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Analyze this resume:\n\n${resumeText}`,
  };

  const raw = await callDeepSeek([system, user]);
  const parsed = ResumeAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw { code: "SCHEMA_VALIDATION_FAILED", message: parsed.error.message };
  }
  return parsed.data;
}
