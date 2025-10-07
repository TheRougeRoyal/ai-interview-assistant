import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { generateQuestions } from '../pipelines/questionGeneration';
import { QuestionGenerationInput } from '../pipelines/questionGeneration';

export async function questionsRoutes(app: FastifyInstance) {
  app.post('/api/ai/questions/generate', async (request: FastifyRequest<{ Body: QuestionGenerationInput }>, reply: FastifyReply) => {
    try {
      const questions = await generateQuestions(request.body);
      return reply.send({ data: questions, meta: { count: questions.length } });
    } catch (error) {
      return reply.status(400).send({ error: 'invalid_input', details: error });
    }
  });
}