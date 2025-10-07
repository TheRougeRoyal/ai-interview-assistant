import dotenv from 'dotenv';

dotenv.config();

export const LLM_PROVIDER = process.env.LLM_PROVIDER || 'mock';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';