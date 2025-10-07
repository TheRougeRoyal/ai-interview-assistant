import Fastify from 'fastify';
import cors from '@fastify/cors';
import { skillsRoutes } from './src/ai/routes/skills';
import { questionsRoutes } from './src/ai/routes/questions';

const app = Fastify();

// Enable CORS
app.register(cors, { origin: true });

// Register AI routes
app.register(skillsRoutes);
app.register(questionsRoutes);

// Start the server
const PORT = 3000;
app.listen({ port: PORT }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server running at ${address}`);
});