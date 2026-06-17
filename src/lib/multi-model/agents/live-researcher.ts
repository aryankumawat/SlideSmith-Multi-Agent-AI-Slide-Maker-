import { BaseAgent, AgentConfig } from '../base-agent';
import { ResearchSnippet } from '../schemas';

export interface LiveResearcherInput {
  topic: string;
  audience: string;
  tone: string;
  maxSnippets?: number;
  minConfidence?: number;
}

export interface LiveResearcherOutput {
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
  searchMode: 'brave' | 'tavily' | 'llm-simulated';
}

interface BraveResult {
  title: string;
  url: string;
  description: string;
  extra_snippets?: string[];
}

interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export class LiveResearcherAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'live-researcher',
      description: 'Fetches real web data via Brave/Tavily search APIs with graceful LLM fallback',
      capabilities: ['web-search', 'content-analysis', 'source-verification'],
      maxRetries: 3,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: LiveResearcherInput): Promise<LiveResearcherOutput> {
    const maxSnippets = input.maxSnippets || 12;

    // Try Brave Search first
    if (process.env.BRAVE_API_KEY) {
      try {
        return await this.searchBrave(input, maxSnippets);
      } catch (err) {
        console.warn('[LiveResearcher] Brave failed, trying Tavily:', err);
      }
    }

    // Try Tavily second
    if (process.env.TAVILY_API_KEY) {
      try {
        return await this.searchTavily(input, maxSnippets);
      } catch (err) {
        console.warn('[LiveResearcher] Tavily failed, falling back to LLM:', err);
      }
    }

    // LLM-simulated fallback
    return this.simulateResearch(input, maxSnippets);
  }

  private async searchBrave(input: LiveResearcherInput, maxSnippets: number): Promise<LiveResearcherOutput> {
    const query = `${input.topic} facts statistics research ${new Date().getFullYear()}`;
    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${Math.min(maxSnippets, 20)}`, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY! },
    });
    if (!resp.ok) throw new Error(`Brave HTTP ${resp.status}`);
    const data = await resp.json();
    const results: BraveResult[] = data.web?.results || [];

    const snippets = this.deduplicateSnippets(
      results.flatMap((r, i) => {
        const texts = [r.description, ...(r.extra_snippets || [])].filter(Boolean);
        return texts.slice(0, 2).map((text, j) => ({
          id: `brave-${i}-${j}`,
          source: new URL(r.url).hostname,
          url: r.url,
          text: text.slice(0, 500),
          tags: [input.topic],
          confidence: Math.max(0.6, 1 - i * 0.04),
          title: r.title,
        }));
      })
    ).slice(0, maxSnippets);

    return this.buildOutput(snippets, input, 'brave');
  }

  private async searchTavily(input: LiveResearcherInput, maxSnippets: number): Promise<LiveResearcherOutput> {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY,
        query: `${input.topic} latest research facts`,
        search_depth: 'basic',
        max_results: maxSnippets,
      }),
    });
    if (!resp.ok) throw new Error(`Tavily HTTP ${resp.status}`);
    const data = await resp.json();
    const results: TavilyResult[] = data.results || [];

    const snippets = this.deduplicateSnippets(
      results.map((r, i) => ({
        id: `tavily-${i}`,
        source: new URL(r.url).hostname,
        url: r.url,
        text: r.content.slice(0, 500),
        tags: [input.topic],
        confidence: Math.min(0.95, r.score || 0.7),
        title: r.title,
      }))
    ).slice(0, maxSnippets);

    return this.buildOutput(snippets, input, 'tavily');
  }

  private async simulateResearch(input: LiveResearcherInput, maxSnippets: number): Promise<LiveResearcherOutput> {
    const prompt = `You are a research assistant. Generate ${maxSnippets} factual research snippets about: "${input.topic}"
Audience: ${input.audience}. Tone: ${input.tone}.

Return ONLY valid JSON:
{
  "snippets": [
    {
      "id": "s1",
      "source": "Nature Research",
      "url": null,
      "text": "Specific factual claim with a statistic or finding about the topic.",
      "tags": ["${input.topic}"],
      "confidence": 0.75,
      "title": "Research finding title"
    }
  ]
}
Rules:
- Each snippet must be a single factual claim (1-2 sentences max)
- Include real-sounding statistics, percentages, or years
- Vary sources: journals, reports, government data, industry research
- confidence between 0.6 and 0.9
JSON:`;

    const raw = await this.callLLMText(prompt);
    const parsed = this.extractJSON(raw);
    const snippets = (parsed.snippets || []).slice(0, maxSnippets).map((s: any, i: number) => ({
      id: s.id || `sim-${i}`,
      source: s.source || 'Research Database',
      url: s.url || undefined,
      text: s.text || '',
      tags: s.tags || [input.topic],
      confidence: s.confidence || 0.7,
      title: s.title || undefined,
    }));

    return this.buildOutput(snippets, input, 'llm-simulated');
  }

  private deduplicateSnippets(snippets: ResearchSnippet[]): ResearchSnippet[] {
    const seen = new Set<string>();
    return snippets.filter(s => {
      const key = s.text.slice(0, 80).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private buildOutput(snippets: ResearchSnippet[], input: LiveResearcherInput, mode: 'brave' | 'tavily' | 'llm-simulated'): LiveResearcherOutput {
    const avgConf = snippets.reduce((s, r) => s + r.confidence, 0) / (snippets.length || 1);
    return {
      snippets,
      coverage: {
        subtopics: [input.topic],
        timeRange: { start: '2020', end: String(new Date().getFullYear()) },
        sourceTypes: [...new Set(snippets.map(s => s.source))],
      },
      quality: {
        averageConfidence: avgConf,
        highConfidenceCount: snippets.filter(s => s.confidence >= 0.8).length,
        sourceDiversity: new Set(snippets.map(s => s.source)).size,
      },
      searchMode: mode,
    };
  }

  private extractJSON(raw: string): any {
    let s = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    return JSON.parse(s);
  }

  protected async callLLMText(prompt: string): Promise<string> {
    const result = await this.callLLM(prompt);
    return result.content;
  }
}
