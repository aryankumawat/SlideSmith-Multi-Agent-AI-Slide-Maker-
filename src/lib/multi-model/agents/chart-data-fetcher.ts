import { BaseAgent, AgentConfig } from '../base-agent';

export interface ChartDataFetcherInput {
  chartTopic: string;
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  slideTitle: string;
}

export interface ChartDataRow {
  label: string;
  value: number;
  unit?: string;
  source?: string;
}

export interface ChartDataFetcherOutput {
  data: ChartDataRow[];
  dataSource: 'live' | 'simulated';
  searchQuery?: string;
}

export class ChartDataFetcherAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'chart-data-fetcher',
      description: 'Fetches real statistics for chart slides; falls back to LLM-generated plausible data',
      capabilities: ['web-search', 'data-extraction'],
      maxRetries: 2,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: ChartDataFetcherInput): Promise<ChartDataFetcherOutput> {
    const query = `${input.chartTopic} statistics data ${new Date().getFullYear()} numbers`;

    // Try Brave first
    if (process.env.BRAVE_API_KEY) {
      try {
        const rows = await this.fetchFromBrave(query, input);
        if (rows.length >= 3) return { data: rows, dataSource: 'live', searchQuery: query };
      } catch (err) {
        console.warn('[ChartDataFetcher] Brave failed:', err);
      }
    }

    // Try Tavily
    if (process.env.TAVILY_API_KEY) {
      try {
        const rows = await this.fetchFromTavily(query, input);
        if (rows.length >= 3) return { data: rows, dataSource: 'live', searchQuery: query };
      } catch (err) {
        console.warn('[ChartDataFetcher] Tavily failed:', err);
      }
    }

    // LLM-simulated fallback
    return this.simulateData(input);
  }

  private async fetchFromBrave(query: string, input: ChartDataFetcherInput): Promise<ChartDataRow[]> {
    const resp = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
      headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_API_KEY! },
    });
    if (!resp.ok) throw new Error(`Brave ${resp.status}`);
    const data = await resp.json();
    const text = (data.web?.results || []).map((r: any) => `${r.title}: ${r.description}`).join('\n');
    return this.extractDataPoints(text, input);
  }

  private async fetchFromTavily(query: string, input: ChartDataFetcherInput): Promise<ChartDataRow[]> {
    const resp = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: process.env.TAVILY_API_KEY, query, max_results: 5 }),
    });
    if (!resp.ok) throw new Error(`Tavily ${resp.status}`);
    const data = await resp.json();
    const text = (data.results || []).map((r: any) => `${r.title}: ${r.content}`).join('\n');
    return this.extractDataPoints(text, input);
  }

  private async extractDataPoints(text: string, input: ChartDataFetcherInput): Promise<ChartDataRow[]> {
    const prompt = `Extract numerical data points for a ${input.chartType} chart about "${input.chartTopic}" from this text:

${text.slice(0, 2000)}

Return ONLY valid JSON with 4-6 data points:
{
  "data": [
    {"label": "2020", "value": 42.3, "unit": "%", "source": "source name"},
    {"label": "2021", "value": 55.1, "unit": "%", "source": "source name"}
  ]
}
Rules:
- Extract REAL numbers from the text if present; otherwise use plausible estimates
- labels should be years, categories, or regions — appropriate for "${input.chartTopic}"
- values must be numbers (not strings)
JSON:`;

    const result = await this.callLLM(prompt);
    const parsed = this.parseJSON(result.content);
    return (parsed.data || []).filter((d: any) => typeof d.value === 'number');
  }

  private async simulateData(input: ChartDataFetcherInput): Promise<ChartDataFetcherOutput> {
    const prompt = `Generate realistic chart data for a ${input.chartType} chart about: "${input.chartTopic}"
Slide title: "${input.slideTitle}"

Return ONLY valid JSON:
{
  "data": [
    {"label": "2020", "value": 38.2, "unit": "billion USD"},
    {"label": "2021", "value": 47.5, "unit": "billion USD"},
    {"label": "2022", "value": 61.3, "unit": "billion USD"},
    {"label": "2023", "value": 78.9, "unit": "billion USD"},
    {"label": "2024", "value": 94.1, "unit": "billion USD"}
  ]
}
Rules:
- Use realistic, plausible values for "${input.chartTopic}"
- Values should show a meaningful trend (growth, decline, comparison, or distribution)
- 4-6 data points
- labels and units appropriate for the topic
JSON:`;

    const result = await this.callLLM(prompt);
    const parsed = this.parseJSON(result.content);
    return {
      data: (parsed.data || []).filter((d: any) => typeof d.value === 'number'),
      dataSource: 'simulated',
    };
  }

  private parseJSON(raw: string): any {
    let s = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch { return { data: [] }; }
  }
}
