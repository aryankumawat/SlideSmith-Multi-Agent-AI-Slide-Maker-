import { ModelConfig, AgentTask } from './schemas';

// ============================================================================
// BASE AGENT CLASS FOR MULTI-MODEL SYSTEM
// ============================================================================

export interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  maxRetries: number;
  timeout: number;
}

export abstract class BaseAgent {
  public readonly config: AgentConfig;
  protected model: ModelConfig | null = null;
  protected router: any; // Will be injected

  constructor(config: AgentConfig) {
    this.config = config;
  }

  setRouter(router: any): void {
    this.router = router;
  }

  setModel(model: ModelConfig): void {
    this.model = model;
  }

  abstract execute(input: unknown, context?: unknown): Promise<unknown>;

  protected async callLLM(prompt: string, options: Record<string, unknown> = {}): Promise<{ content: string; usage?: unknown }> {
    if (!this.model) {
      throw new Error(`No model configured for agent: ${this.config.name}`);
    }

    const response = await this.makeLLMRequest(prompt, options);
    const parsedContent = this.parseResponse(response);
    return {
      content: parsedContent,
      usage: response.usage
    };
  }

  private async makeLLMRequest(prompt: string, options: Record<string, unknown>): Promise<{ content: string; usage?: unknown }> {
    const { provider, apiKey, baseUrl, model, maxTokens, temperature } = this.model!;

    const requestBody = {
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: temperature || 0.7,
      ...options,
    };

    // Add timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0].message.content,
        usage: data.usage,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }
      
      throw error;
    }
  }

  protected parseResponse(response: { content: string; usage?: unknown }): string {
    // Default implementation - can be overridden by specific agents
    // Strip markdown code blocks if present
    if (!response || !response.content) {
      console.warn(`[${this.config.name}] Empty response from LLM`);
      return '';
    }
    
    let content = response.content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    return content;
  }

  protected validateInput(input: unknown, schema: unknown): boolean {
    try {
      schema.parse(input);
      return true;
    } catch (error) {
      console.error(`Input validation failed for ${this.config.name}:`, error);
      return false;
    }
  }

  protected handleError(error: unknown, context?: unknown): never {
    console.error(`Agent ${this.config.name} failed:`, error);
    
    // Provide more specific error messages based on error type
    let errorMessage = 'Unknown error';
    
    if (error instanceof Error) {
      if (error.message.includes('fetch failed')) {
        errorMessage = 'Network connection failed - check if Ollama is running';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Invalid response format from LLM';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timed out - try again with a faster model';
      } else {
        errorMessage = error.message;
      }
    }
    
    throw new Error(`${this.config.name} execution failed: ${errorMessage}`);
  }

  protected async retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.config.maxRetries
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  protected logExecution(taskId: string, input: unknown, output: unknown, duration: number): void {
    console.log(`[${this.config.name}] Task ${taskId} completed in ${duration}ms`);
    console.log(`[${this.config.name}] Input:`, JSON.stringify(input, null, 2));
    console.log(`[${this.config.name}] Output:`, JSON.stringify(output, null, 2));
  }

  // Quality checks that can be overridden
  protected validateOutput(output: unknown): boolean {
    return true; // Default: always valid
  }

  protected getQualityScore(output: unknown): number {
    return 1.0; // Default: perfect quality
  }
}
