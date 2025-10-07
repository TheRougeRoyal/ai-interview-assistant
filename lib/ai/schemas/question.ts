import { z } from "zod";

export const QuestionSchema = z.object({
  prompt: z.string().min(10).max(300),
});

export type Question = z.infer<typeof QuestionSchema>;


