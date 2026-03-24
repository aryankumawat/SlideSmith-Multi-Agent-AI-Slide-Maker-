import { ModelConfig } from './schemas';

// ============================================================================
// OLLAMA CONFIGURATION FOR MULTI-MODEL AGENTS
// ============================================================================

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
    costPerToken: 0.0, // Local, no cost
    speed: 'medium',
    quality: 'high'
  },

  // Fast model for simple tasks
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
    quality: 'medium'
  }
};

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

// Quality-based routing policies
export const QUALITY_POLICY: Record<string, string> = {
  'researcher': 'phi4',
  'structurer': 'phi4',
  'slidewriter': 'phi4',
  'copy-tightener': 'phi4',
  'fact-checker': 'phi4',
  'data-viz-planner': 'phi4',
  'media-finder': 'phi4',
  'speaker-notes-generator': 'phi4',
  'accessibility-linter': 'phi4',
  'live-widget-planner': 'phi4',
  'executive-summary': 'phi4',
  'audience-adapter': 'phi4',
  'readability-analyzer': 'phi4',
  'slide-layout-planner': 'phi4',
  'deduplication': 'phi4',
  'narrative-arc-auditor': 'phi4',
  'image-generation-dispatcher': 'gemma3-4b'
};

export const SPEED_POLICY: Record<string, string> = {
  'researcher': 'gemma3-4b',
  'structurer': 'gemma3-4b',
  'slidewriter': 'gemma3-4b',
  'copy-tightener': 'gemma3-4b',
  'fact-checker': 'gemma3-4b',
  'data-viz-planner': 'gemma3-4b',
  'media-finder': 'gemma3-4b',
  'speaker-notes-generator': 'gemma3-4b',
  'accessibility-linter': 'gemma3-4b',
  'live-widget-planner': 'gemma3-4b',
  'executive-summary': 'gemma3-4b',
  'audience-adapter': 'gemma3-4b',
  'readability-analyzer': 'gemma3-4b',
  'slide-layout-planner': 'gemma3-4b',
  'deduplication': 'gemma3-4b',
  'narrative-arc-auditor': 'gemma3-4b',
  'image-generation-dispatcher': 'gemma3-4b'
};

export const BALANCED_POLICY: Record<string, string> = {
  'researcher': 'phi4',           // High quality for research
  'structurer': 'gemma3-4b',      // Fast for structure (was timing out)
  'slidewriter': 'gemma3-4b',     // Fast for content generation
  'copy-tightener': 'gemma3-4b',  // Fast for editing
  'fact-checker': 'gemma3-4b',    // Fast for fact checking
  'data-viz-planner': 'gemma3-4b', // Fast for simple tasks
  'media-finder': 'gemma3-4b',    // Fast for simple tasks
  'speaker-notes-generator': 'gemma3-4b', // Fast for simple tasks
  'accessibility-linter': 'gemma3-4b',    // Fast for simple tasks
  'live-widget-planner': 'gemma3-4b',     // Fast for simple tasks
  'executive-summary': 'gemma3-4b',       // Fast for simple tasks
  'audience-adapter': 'gemma3-4b',        // Fast for simple tasks
  'readability-analyzer': 'gemma3-4b',     // Fast for simple tasks
  'slide-layout-planner': 'gemma3-4b',    // Fast for layout decisions
  'deduplication': 'phi4',                 // High quality for cross-deck analysis
  'narrative-arc-auditor': 'phi4',         // High quality for narrative analysis
  'image-generation-dispatcher': 'gemma3-4b' // Fast — mainly builds URLs
};

export function getModelForAgent(agentName: string, policy: string = 'balanced'): ModelConfig {
  let modelName: string;
  
  switch (policy) {
    case 'quality':
      modelName = QUALITY_POLICY[agentName] || 'phi4';
      break;
    case 'speed':
      modelName = SPEED_POLICY[agentName] || 'gemma3-4b';
      break;
    case 'balanced':
    default:
      modelName = BALANCED_POLICY[agentName] || 'gemma3-4b';
      break;
  }
  
  return OLLAMA_MODELS[modelName] || OLLAMA_MODELS['gemma3-4b'];
}

export function getAllAvailableModels(): ModelConfig[] {
  return Object.values(OLLAMA_MODELS);
}

export function getModelByName(name: string): ModelConfig | undefined {
  return OLLAMA_MODELS[name];
}
