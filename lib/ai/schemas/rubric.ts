import { z } from "zod";

const score = z.number().int().min(0).max(100);

export const RubricSchema = z
  .object({
    accuracy: score,
    completeness: score,
    relevance: score,
    timeliness: score,
    rationale: z.string().min(1).max(200),
    total: z.number().int().min(0).max(100),
  })
  .superRefine((val, ctx) => {
    const weighted = Math.round(
      0.4 * val.accuracy +
        0.3 * val.completeness +
        0.2 * val.relevance +
        0.1 * val.timeliness
    );
    if (val.total !== weighted) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "total must equal round(0.4*accuracy + 0.3*completeness + 0.2*relevance + 0.1*timeliness)",
        path: ["total"],
      });
    }
  });

export type Rubric = z.infer<typeof RubricSchema>;


