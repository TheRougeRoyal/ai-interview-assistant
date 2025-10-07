export interface LLMAdapter {
  generateResponse(prompt: string): Promise<string>;
}