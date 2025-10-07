import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { filterSkills } from '../pipelines/skillFiltering';
import { skillTaxonomy } from '../store/memory';

export async function skillsRoutes(app: FastifyInstance) {
  app.get('/api/skills/taxonomy', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send(skillTaxonomy);
  });

  app.post('/api/ai/skills/filter', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const filteredSkills = filterSkills(request.body);
      return reply.send({ data: filteredSkills, meta: { count: filteredSkills.length } });
    } catch (error) {
      return reply.status(400).send({ error: 'invalid_input', details: error });
    }
  });
}