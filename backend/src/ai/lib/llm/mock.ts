import { LLMAdapter } from './adapter';

export class MockLLM implements LLMAdapter {
  async generateResponse(prompt: string): Promise<string> {
    return `Mock response for: ${prompt}`;
  }
}