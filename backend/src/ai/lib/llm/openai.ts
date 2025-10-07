import { LLMAdapter } from './adapter';
import { MockLLM } from './mock';
import { OPENAI_API_KEY } from '../../env';

export class OpenAILLM implements LLMAdapter {
  private mockLLM = new MockLLM();

  async generateResponse(prompt: string): Promise<string> {
    if (!OPENAI_API_KEY) {
      return this.mockLLM.generateResponse(prompt);
    }

    // Stub implementation for OpenAI API call
    return `OpenAI response for: ${prompt}`;
  }
}