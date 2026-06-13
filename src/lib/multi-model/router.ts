import { ModelConfig, RoutingPolicy, AgentTask } from './schemas';
import { getModelForAgent, getAllAvailableModels } from './ollama-config';

// ============================================================================
// ROUTER/ORCHESTRATOR FOR MULTI-MODEL SYSTEM
// ============================================================================

export interface TaskContext {
  priority: 'quality' | 'speed' | 'cost' | 'balanced';
  budget?: number;
  timeLimit?: number;
  qualityThreshold?: number;
  localOnly?: boolean;
}

export class ModelRouter {
  private models: Map<string, ModelConfig> = new Map();
  private policies: Map<string, RoutingPolicy> = new Map();
  private taskQueue: AgentTask[] = [];
  private runningTasks: Map<string, AgentTask> = new Map();

  constructor() {
    this.initializeDefaultModels();
    this.initializeDefaultPolicies();
  }

  // ============================================================================
  // MODEL MANAGEMENT
  // ============================================================================

  addModel(config: ModelConfig): void {
    this.models.set(config.name, config);
  }

  getModel(name: string): ModelConfig | undefined {
    return this.models.get(name);
  }

  listModels(): ModelConfig[] {
    return Array.from(this.models.values());
  }

  // ============================================================================
  // ROUTING POLICIES
  // ============================================================================

  addPolicy(policy: RoutingPolicy): void {
    this.policies.set(policy.name, policy);
  }

  getPolicy(name: string): RoutingPolicy | undefined {
    return this.policies.get(name);
  }

  selectModel(agentType: string, context: TaskContext, policyName: string = 'balanced'): ModelConfig | null {
    // First try to get model from Ollama configuration
    try {
      const ollamaModel = getModelForAgent(agentType, policyName);
      if (ollamaModel && this.isModelAvailable(ollamaModel, context)) {
        console.log(`[Router] Selected Ollama model ${ollamaModel.name} for ${agentType}`);
        return ollamaModel;
      }
    } catch (error) {
      console.warn(`[Router] Failed to get Ollama model for ${agentType}:`, error);
    }

    // Fallback to policy-based selection
    const policy = this.policies.get(policyName);
    if (!policy) {
      console.warn(`Policy ${policyName} not found, using default selection`);
      return this.selectModelByCapability(agentType, context);
    }

    // Find matching rule
    const rule = policy.rules.find(r => 
      r.agentType === agentType && 
      this.matchesConditions(r.conditions, context)
    );

    if (rule) {
      const model = this.models.get(rule.modelName);
      if (model && this.isModelAvailable(model, context)) {
        return model;
      }
    }

    // Fallback to capability-based selection
    return this.selectModelByCapability(agentType, context);
  }

  private selectModelByCapability(agentType: string, context: TaskContext): ModelConfig | null {
    const availableModels = Array.from(this.models.values())
      .filter(model => this.isModelAvailable(model, context));

    if (availableModels.length === 0) {
      return null;
    }

    // Filter by capabilities
    const capableModels = availableModels.filter(model => 
      model.capabilities.includes(agentType) || 
      model.capabilities.includes('general')
    );

    if (capableModels.length === 0) {
      return availableModels[0]; // Fallback to any available model
    }

    // Select based on context priority
    switch (context.priority) {
      case 'quality':
        return capableModels.reduce((best, current) => 
          this.getQualityScore(current) > this.getQualityScore(best) ? current : best
        );
      
      case 'speed':
        return capableModels.reduce((fastest, current) => 
          this.getSpeedScore(current) > this.getSpeedScore(fastest) ? current : fastest
        );
      
      case 'cost':
        return capableModels.reduce((cheapest, current) => 
          (current.costPerToken || 0) < (cheapest.costPerToken || 0) ? current : cheapest
        );
      
      case 'balanced':
      default:
        return this.selectBalancedModel(capableModels, context);
    }
  }

  private selectBalancedModel(models: ModelConfig[], context: TaskContext): ModelConfig {
    // Score models based on quality, speed, and cost
    const scoredModels = models.map(model => ({
      model,
      score: this.calculateBalancedScore(model, context)
    }));

    scoredModels.sort((a, b) => b.score - a.score);
    return scoredModels[0].model;
  }

  private calculateBalancedScore(model: ModelConfig, context: TaskContext): number {
    let score = 0;
    
    // Quality score (0-1)
    const qualityScore = this.getQualityScore(model);
    score += qualityScore * 0.4;
    
    // Speed score (0-1)
    const speedScore = this.getSpeedScore(model);
    score += speedScore * 0.3;
    
    // Cost score (0-1, inverted - lower cost = higher score)
    const costScore = model.costPerToken ? 1 - Math.min(model.costPerToken * 1000, 1) : 0.5;
    score += costScore * 0.3;
    
    return score;
  }

  private getQualityScore(model: ModelConfig): number {
    const qualityMap = { low: 0.3, medium: 0.6, high: 1.0 };
    return qualityMap[model.quality] || 0.5;
  }

  private getSpeedScore(model: ModelConfig): number {
    const speedMap = { fast: 1.0, medium: 0.6, slow: 0.3 };
    return speedMap[model.speed] || 0.5;
  }

  private isModelAvailable(model: ModelConfig, context: TaskContext): boolean {
    // Check if local-only requirement is met
    if (context.localOnly && model.provider !== 'local') {
      return false;
    }

    // Check if model has required API key
    if (model.provider !== 'local' && !model.apiKey) {
      return false;
    }

    return true;
  }

  private matchesConditions(conditions: Record<string, any> | undefined, context: TaskContext): boolean {
    if (!conditions) return true;

    for (const [key, value] of Object.entries(conditions)) {
      if (context[key as keyof TaskContext] !== value) {
        return false;
      }
    }

    return true;
  }

  // ============================================================================
  // TASK MANAGEMENT
  // ============================================================================

  async executeTask(agentType: string, input: any, context: TaskContext): Promise<any> {
    const model = this.selectModel(agentType, context);
    if (!model) {
      throw new Error(`No available model for agent type: ${agentType}`);
    }

    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType,
      input,
      status: 'pending',
      priority: this.calculatePriority(agentType, context),
      retries: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    };

    this.taskQueue.push(task);
    return this.processTask(task, model);
  }

  private async processTask(task: AgentTask, model: ModelConfig): Promise<any> {
    try {
      task.status = 'running';
      this.runningTasks.set(task.id, task);

      // Execute the task with the selected model
      const result = await this.executeWithModel(task, model);
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      task.output = result;

      this.runningTasks.delete(task.id);
      return result;

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : 'Unknown error';
      task.retries++;

      if (task.retries < task.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.pow(2, task.retries) * 1000;
        setTimeout(() => {
          task.status = 'pending';
          this.taskQueue.push(task);
        }, delay);
      }

      this.runningTasks.delete(task.id);
      throw error;
    }
  }

  private async executeWithModel(task: AgentTask, model: ModelConfig): Promise<any> {
    // This would be implemented by specific agent classes
    // For now, return a placeholder
    return { taskId: task.id, model: model.name, status: 'executed' };
  }

  private calculatePriority(agentType: string, context: TaskContext): number {
    // Higher priority for critical agents
    const criticalAgents = ['researcher', 'structurer', 'fact-checker'];
    const basePriority = criticalAgents.includes(agentType) ? 8 : 5;
    
    // Adjust based on context
    if (context.priority === 'quality') {
      return Math.min(basePriority + 2, 10);
    }
    
    return basePriority;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeDefaultModels(): void {
    // Initialize with Ollama models
    const ollamaModels = getAllAvailableModels();
    ollamaModels.forEach(model => {
      this.addModel(model);
    });

    // Add fallback OpenAI models for when Ollama is not available
    this.addModel({
      name: 'gpt-4-turbo-fallback',
      provider: 'openai',
      model: 'gpt-4-turbo',
      maxTokens: 8000,
      temperature: 0.3,
      capabilities: ['researcher', 'structurer', 'fact-checker', 'copy-tightener'],
      costPerToken: 0.00003,
      speed: 'medium',
      quality: 'high',
    });

    this.addModel({
      name: 'gpt-3.5-turbo-fallback',
      provider: 'openai',
      model: 'gpt-3.5-turbo',
      maxTokens: 4000,
      temperature: 0.7,
      capabilities: ['slidewriter', 'media-finder', 'speaker-notes'],
      costPerToken: 0.000002,
      speed: 'fast',
      quality: 'medium',
    });
  }

  private initializeDefaultPolicies(): void {
    // Quality-focused policy
    this.addPolicy({
      name: 'quality',
      description: 'Prioritize accuracy and thoroughness',
      rules: [
        { agentType: 'researcher', modelName: 'gpt-4-turbo' },
        { agentType: 'structurer', modelName: 'gpt-4-turbo' },
        { agentType: 'fact-checker', modelName: 'gpt-4-turbo' },
        { agentType: 'slidewriter', modelName: 'gpt-3.5-turbo' },
        { agentType: 'copy-tightener', modelName: 'gpt-4-turbo' },
      ],
    });

    // Speed-focused policy
    this.addPolicy({
      name: 'speed',
      description: 'Prioritize fast generation',
      rules: [
        { agentType: 'researcher', modelName: 'gpt-3.5-turbo' },
        { agentType: 'structurer', modelName: 'gpt-3.5-turbo' },
        { agentType: 'slidewriter', modelName: 'gpt-3.5-turbo' },
        { agentType: 'copy-tightener', modelName: 'gpt-3.5-turbo' },
      ],
    });

    // Local-only policy
    this.addPolicy({
      name: 'local-only',
      description: 'Use only local models for privacy',
      rules: [
        { agentType: 'researcher', modelName: 'llama-3.3-70b' },
        { agentType: 'structurer', modelName: 'llama-3.3-70b' },
        { agentType: 'slidewriter', modelName: 'phi-4-14b' },
        { agentType: 'copy-tightener', modelName: 'phi-4-14b' },
      ],
    });

    // Balanced policy (default)
    this.addPolicy({
      name: 'balanced',
      description: 'Balance quality, speed, and cost',
      rules: [
        { agentType: 'researcher', modelName: 'gpt-4-turbo' },
        { agentType: 'structurer', modelName: 'gpt-4-turbo' },
        { agentType: 'slidewriter', modelName: 'gpt-3.5-turbo' },
        { agentType: 'fact-checker', modelName: 'gpt-4-turbo' },
        { agentType: 'copy-tightener', modelName: 'gpt-3.5-turbo' },
      ],
    });
  }

  // ============================================================================
  // MONITORING & METRICS
  // ============================================================================

  getTaskStatus(taskId: string): AgentTask | undefined {
    return this.taskQueue.find(t => t.id === taskId) || 
           this.runningTasks.get(taskId);
  }

  getQueueStatus(): { pending: number; running: number; completed: number; failed: number } {
    const completed = this.taskQueue.filter(t => t.status === 'completed').length;
    const failed = this.taskQueue.filter(t => t.status === 'failed').length;
    const running = this.runningTasks.size;
    const pending = this.taskQueue.filter(t => t.status === 'pending').length;

    return { pending, running, completed, failed };
  }

  getModelUsage(): Map<string, { tasks: number; tokens: number; cost: number }> {
    const usage = new Map<string, { tasks: number; tokens: number; cost: number }>();
    
    // This would track actual usage in a real implementation
    for (const model of this.models.values()) {
      usage.set(model.name, { tasks: 0, tokens: 0, cost: 0 });
    }
    
    return usage;
  }
}
