import { z } from 'zod';
import { MockLLM } from '../lib/llm/mock';

const QuestionGenerationSchema = z.object({
  role: z.string(),
  skills: z.array(z.string()),
  difficulty: z.enum(['easy', 'medium', 'hard', 'mixed']),
  count: z.number().min(1).max(10),
  style: z.enum(['technical', 'behavioral', 'mixed']),
  language: z.string().optional(),
  context: z.string().optional(),
});

export type QuestionGenerationInput = z.infer<typeof QuestionGenerationSchema>;

type GeneratedQuestion = {
  question: string;
  difficulty: string;
  style: string;
};

const mockLLM = new MockLLM();

export async function generateQuestions(input: QuestionGenerationInput): Promise<GeneratedQuestion[]> {
  const { role, skills, difficulty, count, style, language, context } = QuestionGenerationSchema.parse(input);

  const prompt = `Generate ${count} ${style} interview questions for a ${role} role with skills: ${skills.join(", ")}.` +
    (difficulty !== 'mixed' ? ` Difficulty: ${difficulty}.` : '') +
    (language ? ` Language: ${language}.` : '') +
    (context ? ` Context: ${context}.` : '');

  const response = await mockLLM.generateResponse(prompt);

  return Array.from({ length: count }, (_, i) => ({
    question: `${response} (Question ${i + 1})`,
    difficulty: difficulty === 'mixed' ? ['easy', 'medium', 'hard'][i % 3] : difficulty,
    style,
  }));
}