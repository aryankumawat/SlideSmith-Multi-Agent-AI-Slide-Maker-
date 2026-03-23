import { BaseAgent, AgentConfig } from '../base-agent';
import { ResearchSnippet, ResearchSnippetSchema } from '../schemas';
import { z } from 'zod';

// ============================================================================
// RESEARCHER AGENT — EVIDENCE COLLECTOR
// ============================================================================

export interface ResearcherInput {
  topic: string;
  audience: string;
  tone: string;
  sources?: string[];
  urls?: string[];
  maxSnippets?: number;
  minConfidence?: number;
}

export interface ResearcherOutput {
  snippets: ResearchSnippet[];
  coverage: {
    subtopics: string[];
    timeRange: { start: string; end: string };
    sourceTypes: string[];
  };
  quality: {
    averageConfidence: number;
    highConfidenceCount: number;
    sourceDiversity: number;
  };
  searchMode: 'live' | 'llm-simulated';
}

interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export class ResearcherAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'researcher',
      description: 'Gathers concise, citeable snippets that answer the topic — uses live web search when API keys are available',
      capabilities: ['web-search', 'content-analysis', 'source-verification'],
      maxRetries: 3,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: ResearcherInput, context?: unknown): Promise<ResearcherOutput> {
    const startTime = Date.now();

    try {
      if (!this.validateInput(input, this.getInputSchema())) {
        throw new Error('Invalid input for Researcher agent');
      }

      const subtopics = await this.extractSubtopics(input.topic);
      const searchQueries = this.generateSearchQueries(input.topic, subtopics, input.audience);

      // Attempt live search first; fall back to LLM simulation
      let rawSnippets: Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>;
      let searchMode: 'live' | 'llm-simulated';

      const liveResults = await this.tryLiveSearch(searchQueries, input);
      if (liveResults.length > 0) {
        rawSnippets = liveResults;
        searchMode = 'live';
        console.log(`[researcher] Live search returned ${rawSnippets.length} results`);
      } else {
        rawSnippets = await this.simulateWithLLM(searchQueries, input);
        searchMode = 'llm-simulated';
        console.log(`[researcher] LLM simulation returned ${rawSnippets.length} results`);
      }

      const processed = this.processSearchResults(rawSnippets, input);
      const filtered = this.filterSnippets(processed, input);
      const snippets = this.generateFinalSnippets(filtered, input);

      const coverage = this.calculateCoverage(snippets);
      const quality = this.calculateQuality(snippets);

      const output: ResearcherOutput = { snippets, coverage, quality, searchMode };

      const duration = Date.now() - startTime;
      this.logExecution('researcher-task', input, { snippetCount: snippets.length, searchMode }, duration);

      return output;

    } catch (error) {
      this.handleError(error, { input, context });
    }
  }

  // ============================================================================
  // LIVE SEARCH — BRAVE SEARCH API (primary) → TAVILY (fallback)
  // ============================================================================

  private async tryLiveSearch(
    queries: string[],
    input: ResearcherInput
  ): Promise<Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>> {
    // Try Brave Search first
    const braveKey = process.env.BRAVE_SEARCH_API_KEY;
    if (braveKey) {
      try {
        const results = await this.searchBrave(queries, braveKey);
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('[researcher] Brave Search failed:', err);
      }
    }

    // Try Tavily as fallback
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
      try {
        const results = await this.searchTavily(queries, tavilyKey, input.topic);
        if (results.length > 0) return results;
      } catch (err) {
        console.warn('[researcher] Tavily Search failed:', err);
      }
    }

    return [];
  }

  private async searchBrave(
    queries: string[],
    apiKey: string
  ): Promise<Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>> {
    // Run top 4 queries in parallel to stay within rate limits
    const topQueries = queries.slice(0, 4);
    const results = await Promise.all(
      topQueries.map(async (query) => {
        const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5&result_filter=web`;
        const res = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip',
            'X-Subscription-Token': apiKey,
          },
          signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) {
          console.warn(`[researcher] Brave API error ${res.status} for query: ${query}`);
          return [];
        }

        const data = await res.json();
        return this.normalizeBraveResults(data.web?.results || [], query);
      })
    );

    return results.flat();
  }

  private normalizeBraveResults(
    results: BraveSearchResult[],
    query: string
  ): Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }> {
    return results
      .filter(r => r.description && r.description.length >= 30)
      .map(r => ({
        text: this.cleanText(r.description + (r.extra_snippets?.[0] ? ' ' + r.extra_snippets[0] : '')),
        source: new URL(r.url).hostname.replace('www.', ''),
        url: r.url,
        confidence: 0.8, // Live search results get high base confidence
        tags: query.toLowerCase().split(' ').filter(w => w.length > 3),
      }));
  }

  private async searchTavily(
    queries: string[],
    apiKey: string,
    topic: string
  ): Promise<Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>> {
    // Tavily works well with a single combined query
    const combinedQuery = queries.slice(0, 3).join(' OR ');
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query: combinedQuery,
        search_depth: 'advanced',
        max_results: 10,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Tavily error: ${res.status}`);

    const data = await res.json();
    return this.normalizeTavilyResults(data.results || [], topic);
  }

  private normalizeTavilyResults(
    results: TavilySearchResult[],
    topic: string
  ): Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }> {
    return results
      .filter(r => r.content && r.content.length >= 30)
      .map(r => ({
        text: this.cleanText(r.content),
        source: new URL(r.url).hostname.replace('www.', ''),
        url: r.url,
        confidence: Math.min(0.95, 0.6 + (r.score || 0.5) * 0.35),
        tags: topic.toLowerCase().split(' ').filter(w => w.length > 3),
      }));
  }

  // ============================================================================
  // LLM SIMULATION (fallback when no search API keys are present)
  // ============================================================================

  private async simulateWithLLM(
    queries: string[],
    input: ResearcherInput
  ): Promise<Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>> {
    const searchResults = await Promise.all(
      queries.map(query => this.searchForInformation(query, input))
    );
    return searchResults.flat();
  }

  private async searchForInformation(
    query: string,
    input: ResearcherInput
  ): Promise<Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>> {
    const prompt = `Research information about: "${query}"

Provide 2-3 concise, factual snippets useful for a presentation on "${input.topic}" for a "${input.audience}" audience.

Return JSON array only:
[
  {
    "text": "Factual statement (1-3 sentences, cite statistics when possible)",
    "source": "Source name (e.g. McKinsey, Harvard Business Review, Gartner)",
    "url": "https://example.com/relevant-url",
    "confidence": 0.75,
    "tags": ["tag1", "tag2"]
  }
]`;

    try {
      const response = await this.callLLM(prompt);
      if (!response?.content) return [];
      const results = JSON.parse(response.content);
      return Array.isArray(results) ? results : [];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // SUBTOPIC EXTRACTION & QUERY GENERATION
  // ============================================================================

  private async extractSubtopics(topic: string): Promise<string[]> {
    const prompt = `List 3-5 key research subtopics for: "${topic}"

Return JSON array of strings only: ["subtopic1", "subtopic2", ...]`;

    try {
      const response = await this.callLLM(prompt);
      if (!response?.content) return this.fallbackSubtopics(topic);
      const subtopics = JSON.parse(response.content);
      return Array.isArray(subtopics) ? subtopics : this.fallbackSubtopics(topic);
    } catch {
      return this.fallbackSubtopics(topic);
    }
  }

  private fallbackSubtopics(topic: string): string[] {
    return [`${topic} overview`, `${topic} trends`, `${topic} applications`, `${topic} future`];
  }

  private generateSearchQueries(topic: string, subtopics: string[], audience: string): string[] {
    const queries = [
      `${topic} overview`,
      `${topic} trends 2024`,
      `${topic} best practices`,
    ];

    if (audience.toLowerCase().includes('technical')) {
      queries.push(`${topic} technical implementation`, `${topic} architecture patterns`);
    } else if (audience.toLowerCase().includes('business')) {
      queries.push(`${topic} business value`, `${topic} ROI statistics`);
    }

    subtopics.forEach(sub => queries.push(`${topic} ${sub}`));
    return queries.slice(0, 8);
  }

  // ============================================================================
  // PROCESSING, FILTERING, FINAL GENERATION
  // ============================================================================

  private processSearchResults(
    results: Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>,
    input: ResearcherInput
  ): typeof results {
    const unique = this.deduplicateSnippets(results);
    return unique.map(snippet => ({
      ...snippet,
      text: this.cleanText(snippet.text),
      confidence: Math.max(0, Math.min(1, snippet.confidence || 0.5)),
      tags: Array.isArray(snippet.tags) ? snippet.tags : [],
    }));
  }

  private deduplicateSnippets<T extends { text: string }>(snippets: T[]): T[] {
    const seen = new Set<string>();
    return snippets.filter(s => {
      const key = s.text.toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private cleanText(text: string): string {
    return text.replace(/\s+/g, ' ').trim().substring(0, 500);
  }

  private filterSnippets<T extends { confidence: number }>(snippets: T[], input: ResearcherInput): T[] {
    const minConfidence = input.minConfidence || 0.6;
    const maxSnippets = input.maxSnippets || 15;
    return snippets
      .filter(s => s.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSnippets);
  }

  private generateFinalSnippets(
    snippets: Array<{ text: string; source: string; url?: string; confidence: number; tags: string[] }>,
    input: ResearcherInput
  ): ResearchSnippet[] {
    return snippets.map((snippet, index) => ({
      id: `snippet-${Date.now()}-${index}`,
      source: snippet.source || 'Research',
      url: snippet.url,
      text: snippet.text,
      tags: snippet.tags || [],
      confidence: snippet.confidence,
      timestamp: new Date().toISOString(),
    }));
  }

  // ============================================================================
  // COVERAGE & QUALITY METRICS
  // ============================================================================

  private calculateCoverage(snippets: ResearchSnippet[]): ResearcherOutput['coverage'] {
    const allTags = snippets.flatMap(s => s.tags);
    const uniqueTags = [...new Set(allTags)];
    const sources = snippets.map(s => s.source);
    const uniqueSources = [...new Set(sources)];

    return {
      subtopics: uniqueTags,
      timeRange: {
        start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        end: new Date().toISOString(),
      },
      sourceTypes: uniqueSources,
    };
  }

  private calculateQuality(snippets: ResearchSnippet[]): ResearcherOutput['quality'] {
    if (snippets.length === 0) {
      return { averageConfidence: 0, highConfidenceCount: 0, sourceDiversity: 0 };
    }
    const confidences = snippets.map(s => s.confidence);
    const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const highConfidenceCount = confidences.filter(c => c >= 0.8).length;
    const uniqueSources = new Set(snippets.map(s => s.source)).size;
    const sourceDiversity = uniqueSources / Math.max(snippets.length, 1);
    return { averageConfidence, highConfidenceCount, sourceDiversity };
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  private getInputSchema() {
    return z.object({
      topic: z.string().min(1),
      audience: z.string().min(1),
      tone: z.string().min(1),
      sources: z.array(z.string()).optional(),
      urls: z.array(z.string().url()).optional(),
      maxSnippets: z.number().min(1).max(50).optional(),
      minConfidence: z.number().min(0).max(1).optional(),
    });
  }

  protected validateOutput(output: ResearcherOutput): boolean {
    if (!output.snippets || !Array.isArray(output.snippets) || output.snippets.length === 0) {
      return false;
    }
    for (const snippet of output.snippets) {
      try { ResearchSnippetSchema.parse(snippet); } catch { return false; }
    }
    return true;
  }

  protected getQualityScore(output: ResearcherOutput): number {
    const { quality } = output;
    return quality.averageConfidence * 0.4 + quality.sourceDiversity * 0.3 +
      (quality.highConfidenceCount / Math.max(output.snippets.length, 1)) * 0.3;
  }
}
