import { z } from "zod";

export const SummarySchema = z.object({
  finalScore: z.number().int().min(0).max(100),
  summary: z.string().min(20).max(400),
  strengths: z.array(z.string().min(3)).min(1).max(3),
  gap: z.string().min(3).max(120),
});

export type Summary = z.infer<typeof SummarySchema>;


