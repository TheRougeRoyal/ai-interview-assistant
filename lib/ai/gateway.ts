import { z } from "zod";
import { QuestionSchema, type Question } from "./schemas/question";
import { RubricSchema, type Rubric } from "./schemas/rubric";
import { SummarySchema, type Summary } from "./schemas/summary";
import { ResumeAnalysisSchema, type ResumeAnalysis } from "./schemas/resume";

import * as openaiVendor from "./vendors/openai";
import * as mockVendor from "./vendors/mock";
import * as deepseekVendor from "./vendors/deepseek";

export type Task = "generate_question" | "score" | "summary" | "analyze_resume";

export type TaskResult<TTask extends Task> = TTask extends "generate_question"
  ? Question
  : TTask extends "score"
  ? Rubric
  : TTask extends "summary"
  ? Summary
  : TTask extends "analyze_resume"
  ? ResumeAnalysis
  : never;

export type NormalizedError = { code: string; message: string };

function getVendor(): "openai" | "mock" | "deepseek" {
  const value = process.env.AI_VENDOR?.toLowerCase();
  if (value === "openai") return "openai";
  if (value === "deepseek") return "deepseek";
  return "mock";
}

function getModule() {
  const vendor = getVendor();
  if (vendor === "openai") return openaiVendor;
  if (vendor === "deepseek") return deepseekVendor;
  return mockVendor;
}

function getSchema(task: Task): z.ZodTypeAny {
  switch (task) {
    case "generate_question":
      return QuestionSchema;
    case "score":
      return RubricSchema;
    case "summary":
      return SummarySchema;
    case "analyze_resume":
      return ResumeAnalysisSchema;
    default: {
      const neverTask: never = task;
      throw normalizeError({
        code: "UNSUPPORTED_TASK",
        message: `Unsupported task: ${String(neverTask)}`,
      });
    }
  }
}

export function normalizeError(e: unknown): NormalizedError {
  if (typeof e === "object" && e !== null) {
    const maybe = e as { code?: unknown; message?: unknown };
    const code = typeof maybe.code === "string" ? maybe.code : undefined;
    const message = typeof maybe.message === "string" ? maybe.message : undefined;
    if (code && message) {
      return { code, message };
    }
  }

  if (e instanceof z.ZodError) {
    return { code: "SCHEMA_VALIDATION_FAILED", message: e.message };
  }

  if (e instanceof Error) {
    return { code: e.name || "UNKNOWN_ERROR", message: e.message };
  }

  return { code: "UNKNOWN_ERROR", message: String(e) };
}

export async function ask<TTask extends Task>(
  task: TTask,
  payload: unknown
): Promise<TaskResult<TTask>> {
  try {
    const mod = getModule();
    const vendor = getVendor();

    let raw: unknown;
    switch (task) {
      case "generate_question":
        raw = await (mod.generate_question as (p: unknown) => Promise<unknown> | unknown)(payload);
        break;
      case "score":
        raw = await (mod.score as (p: unknown) => Promise<unknown> | unknown)(payload);
        break;
      case "summary":
        raw = await (mod.summary as (p: unknown) => Promise<unknown> | unknown)(payload);
        break;
      case "analyze_resume":
        raw = await (mod.analyze_resume as (p: unknown) => Promise<unknown> | unknown)(payload);
        break;
      default: {
        const neverTask: never = task;
        throw { code: "UNSUPPORTED_TASK", message: `Unsupported task: ${String(neverTask)}` };
      }
    }

    const schema = getSchema(task);
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.error(`Schema validation failed for ${task} using ${vendor}:`, result.error);
      throw { code: "SCHEMA_VALIDATION_FAILED", message: result.error.message };
    }

    return result.data as TaskResult<TTask>;
  } catch (e) {
    const err = normalizeError(e);
    console.error(`AI Gateway error for ${task}:`, err);
    throw err;
  }
}

export function getCurrentVendor(): "openai" | "mock" | "deepseek" {
  return getVendor();
}

export function isVendorAvailable(vendor: "openai" | "mock" | "deepseek"): boolean {
  if (vendor === "openai") {
    return !!process.env.OPENAI_API_KEY;
  }
  if (vendor === "deepseek") {
    return !!process.env.DEEPSEEK_API_KEY;
  }
  return true;
}


