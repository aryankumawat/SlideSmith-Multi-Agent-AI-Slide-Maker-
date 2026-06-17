import { ModelConfig } from './schemas';

/**
 * Returns a ModelConfig driven by env vars, suitable for standalone agent use
 * (i.e. outside the orchestrator). Prefers Groq when GROQ_API_KEY is set.
 */
export function getStandaloneModel(size: 'fast' | 'quality' = 'fast'): ModelConfig {
  const groqKey = process.env.GROQ_API_KEY;

  if (groqKey) {
    return {
      name: size === 'quality' ? 'groq-70b' : 'groq-8b',
      provider: 'openai',
      apiKey: groqKey,
      baseUrl: 'https://api.groq.com/openai/v1',
      model: size === 'quality' ? 'llama-3.3-70b-versatile' : 'llama-3.1-8b-instant',
      maxTokens: 4096,
      temperature: 0.7,
      capabilities: ['text-generation'],
      speed: size === 'quality' ? 'medium' : 'fast',
      quality: size === 'quality' ? 'high' : 'medium',
    };
  }

  const provider = process.env.LLM_PROVIDER === 'openai' ? 'openai' : 'ollama';
  return {
    name: 'local',
    provider,
    apiKey: process.env.LLM_API_KEY || 'ollama',
    baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
    model: process.env.LLM_MODEL || 'gemma3:4b',
    maxTokens: 4096,
    temperature: 0.7,
    capabilities: ['text-generation'],
    speed: 'slow',
    quality: 'medium',
  };
}
