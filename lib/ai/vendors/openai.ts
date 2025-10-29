import { z } from "zod";
import { QuestionSchema } from "../schemas/question";
import { RubricSchema } from "../schemas/rubric"; 
import { SummarySchema } from "../schemas/summary";
import { ResumeAnalysisSchema } from "../schemas/resume";

type ChatMessage = { role: "system" | "user"; content: string };

const OPENAI_MODEL = process.env.AI_MODEL || "gpt-4o-mini";
const TEMPERATURE = 0.2;

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw { code: "OPENAI_ERROR", message: "Missing OPENAI_API_KEY in environment." };
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

async function callOpenAI(messages: ChatMessage[]): Promise<unknown> {
  const apiKey = requireApiKey();
  try {
    // Prefer SDK if available
    try {
      const { default: OpenAI } = await import("openai");
      const client = new OpenAI({ apiKey });
      const resp = await client.chat.completions.create({
        model: OPENAI_MODEL,
        temperature: TEMPERATURE,
        response_format: { type: "json_object" },
        messages,
      });
      const content = resp.choices?.[0]?.message?.content ?? "";
      const jsonText = stripCodeFences(content);
      return JSON.parse(jsonText) as unknown;
    } catch (_sdkErr) {
      // Fallback to fetch
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          temperature: TEMPERATURE,
          response_format: { type: "json_object" },
          messages,
        }),
      });
      if (!r.ok) {
        const text = await r.text();
        throw new Error(`OpenAI HTTP ${r.status}: ${text}`);
      }
      const data = (await r.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const jsonText = stripCodeFences(content);
      return JSON.parse(jsonText) as unknown;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw { code: "OPENAI_ERROR", message };
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
      "You are a strict interview engine. Output only a compact JSON object matching the provided schema; no extra text.",
  };
  const user: ChatMessage = {
    role: "user",
    content:
      `Generate ONE interview question for a ${role} candidate at ${difficulty} difficulty. Keep it one sentence. If resume context is provided, consider it. Return { "prompt": "..." }.` +
      (resumeContext ? ` Resume context: ${resumeContext}` : ""),
  };
  const raw = await callOpenAI([system, user]);
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
      "Focus on accuracy, completeness, relevance, and timeliness of the technical response.",
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
  const raw = await callOpenAI([system, user]);
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
      "Compute the finalScore as Math.round(average of rubric.total). Provide a concise 2–3 sentence summary, top-2 strengths (dimension names), and a single gap with a short improvement hint.",
  };
  const user: ChatMessage = {
    role: "user",
    content: JSON.stringify({ rubrics }),
  };
  const raw = await callOpenAI([system, user]);
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

Return valid JSON matching the schema. Be thorough but concise. If information is missing or unclear, use reasonable estimates.`,
  };

  const user: ChatMessage = {
    role: "user",
    content: `Analyze this resume:\n\n${resumeText}`,
  };

  const raw = await callOpenAI([system, user]);
  const parsed = ResumeAnalysisSchema.safeParse(raw);
  if (!parsed.success) {
    throw { code: "SCHEMA_VALIDATION_FAILED", message: parsed.error.message };
  }
  return parsed.data;
}
