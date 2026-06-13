import { ModelConfig } from './schemas';

// ============================================================================
// MODEL CONFIGURATION — Ollama (local) + Groq (free cloud tier)
// ============================================================================

// ---- Ollama (always available, no API key needed) ----

export const OLLAMA_MODELS: Record<string, ModelConfig> = {
  // High-quality model for complex tasks (planning, verification)
  'phi4': {
    name: 'phi4',
    provider: 'ollama',
    model: 'phi4:latest',
    apiKey: 'ollama',
    baseUrl: 'http://localhost:11434',
    maxTokens: 8000,
    temperature: 0.7,
    capabilities: ['planning', 'verification', 'analysis', 'reasoning', 'writing', 'editing'],
    costPerToken: 0.0,
    speed: 'medium',
    quality: 'high',
  },

  // Fast model for content generation
  'gemma3-4b': {
    name: 'gemma3-4b',
    provider: 'ollama',
    model: 'gemma3:4b',
    apiKey: 'ollama',
    baseUrl: 'http://localhost:11434',
    maxTokens: 4000,
    temperature: 0.7,
    capabilities: ['writing', 'editing', 'generation', 'formatting', 'validation', 'simple-tasks'],
    costPerToken: 0.0,
    speed: 'fast',
    quality: 'medium',
  },
};

// ---- Groq (free tier, OpenAI-compatible, gated on GROQ_API_KEY) ----
// Free tier: ~30 req/min, 14,400 req/day for llama-3.3-70b
// Sign up at console.groq.com — no credit card required

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = 'https://api.groq.com/openai';

export const GROQ_MODELS: Record<string, ModelConfig> = GROQ_API_KEY
  ? {
      // Best quality on Groq free tier — use for reasoning-heavy agents
      'groq-llama-3.3-70b': {
        name: 'groq-llama-3.3-70b',
        provider: 'groq',
        model: 'llama-3.3-70b-versatile',
        apiKey: GROQ_API_KEY,
        baseUrl: GROQ_BASE_URL,
        maxTokens: 8000,
        temperature: 0.7,
        capabilities: [
          'planning', 'verification', 'analysis', 'reasoning',
          'writing', 'editing', 'generation', 'formatting',
        ],
        costPerToken: 0.0,
        speed: 'fast',
        quality: 'high',
      },

      // Fastest Groq model — use for simple/content generation agents
      'groq-llama-3.1-8b': {
        name: 'groq-llama-3.1-8b',
        provider: 'groq',
        model: 'llama-3.1-8b-instant',
        apiKey: GROQ_API_KEY,
        baseUrl: GROQ_BASE_URL,
        maxTokens: 4000,
        temperature: 0.7,
        capabilities: ['writing', 'editing', 'generation', 'formatting', 'simple-tasks'],
        costPerToken: 0.0,
        speed: 'fast',
        quality: 'medium',
      },
    }
  : {};

// Agent-specific model assignments
export const AGENT_MODEL_ASSIGNMENTS: Record<string, string> = {
  // Legacy: kept for backwards compat; actual routing uses the policies below
  // High-quality models for complex reasoning
  'researcher': 'phi4',
  'structurer': 'phi4',
  'fact-checker': 'phi4',
  'accessibility-linter': 'phi4',
  
  // Fast models for content generation and tool-like tasks
  'slidewriter': 'gemma3-4b',
  'copy-tightener': 'gemma3-4b',
  'speaker-notes-generator': 'gemma3-4b',
  'executive-summary': 'gemma3-4b',
  'audience-adapter': 'gemma3-4b',
  'data-viz-planner': 'gemma3-4b',
  'media-finder': 'gemma3-4b',
  'live-widget-planner': 'gemma3-4b',
  'readability-analyzer': 'gemma3-4b',
  'slide-layout-planner': 'gemma3-4b',
  'deduplication': 'phi4',
  'narrative-arc-auditor': 'phi4',
  'image-generation-dispatcher': 'gemma3-4b'
};

// ---- Routing policies ----
// When GROQ_API_KEY is set, Groq models are preferred for their free tier +
// high quality. When the key is absent, fall back to Ollama equivalents.

const groqHigh = GROQ_API_KEY ? 'groq-llama-3.3-70b' : 'phi4';
const groqFast = GROQ_API_KEY ? 'groq-llama-3.1-8b' : 'gemma3-4b';

export const QUALITY_POLICY: Record<string, string> = {
  'researcher':                 groqHigh,
  'structurer':                 groqHigh,
  'slidewriter':                groqHigh,
  'copy-tightener':             groqHigh,
  'fact-checker':               groqHigh,
  'data-viz-planner':           groqHigh,
  'media-finder':               groqHigh,
  'speaker-notes-generator':    groqHigh,
  'accessibility-linter':       groqHigh,
  'live-widget-planner':        groqHigh,
  'executive-summary':          groqHigh,
  'audience-adapter':           groqHigh,
  'readability-analyzer':       groqHigh,
  'slide-layout-planner':       groqHigh,
  'deduplication':              groqHigh,
  'narrative-arc-auditor':      groqHigh,
  'image-generation-dispatcher': groqFast,
};

export const SPEED_POLICY: Record<string, string> = {
  'researcher':                 groqFast,
  'structurer':                 groqFast,
  'slidewriter':                groqFast,
  'copy-tightener':             groqFast,
  'fact-checker':               groqFast,
  'data-viz-planner':           groqFast,
  'media-finder':               groqFast,
  'speaker-notes-generator':    groqFast,
  'accessibility-linter':       groqFast,
  'live-widget-planner':        groqFast,
  'executive-summary':          groqFast,
  'audience-adapter':           groqFast,
  'readability-analyzer':       groqFast,
  'slide-layout-planner':       groqFast,
  'deduplication':              groqFast,
  'narrative-arc-auditor':      groqFast,
  'image-generation-dispatcher': groqFast,
};

export const BALANCED_POLICY: Record<string, string> = {
  // Reasoning-heavy agents → high-quality model
  'researcher':                 groqHigh,
  'structurer':                 groqHigh,
  'fact-checker':               groqHigh,
  'deduplication':              groqHigh,
  'narrative-arc-auditor':      groqHigh,
  // Content/tool agents → fast model
  'slidewriter':                groqFast,
  'copy-tightener':             groqFast,
  'speaker-notes-generator':    groqFast,
  'executive-summary':          groqFast,
  'audience-adapter':           groqFast,
  'data-viz-planner':           groqFast,
  'media-finder':               groqFast,
  'live-widget-planner':        groqFast,
  'readability-analyzer':       groqFast,
  'slide-layout-planner':       groqFast,
  'accessibility-linter':       groqFast,
  'image-generation-dispatcher': groqFast,
};

const ALL_MODELS: Record<string, ModelConfig> = { ...OLLAMA_MODELS, ...GROQ_MODELS };

export function getModelForAgent(agentName: string, policy: string = 'balanced'): ModelConfig {
  let modelName: string;

  switch (policy) {
    case 'quality':
      modelName = QUALITY_POLICY[agentName] || groqHigh;
      break;
    case 'speed':
      modelName = SPEED_POLICY[agentName] || groqFast;
      break;
    case 'balanced':
    default:
      modelName = BALANCED_POLICY[agentName] || groqFast;
      break;
  }

  return ALL_MODELS[modelName] || OLLAMA_MODELS['gemma3-4b'];
}

export function getAllAvailableModels(): ModelConfig[] {
  return Object.values(ALL_MODELS);
}

export function getModelByName(name: string): ModelConfig | undefined {
  return ALL_MODELS[name];
}
