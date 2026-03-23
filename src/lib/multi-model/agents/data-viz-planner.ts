import { BaseAgent, AgentConfig } from '../base-agent';
import { ChartSpec, DataVizInput, DataVizOutput } from '../schemas';

// ============================================================================
// DATA VIZ PLANNER AGENT
// ============================================================================

export class DataVizPlannerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'data-viz-planner',
      description: 'Selects the best chart type and specification to answer an analytical question',
      capabilities: ['data-analysis', 'chart-selection', 'visualization-planning'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: DataVizInput, context?: unknown): Promise<DataVizOutput> {
    try {
      console.log(`[${this.config.name}] Planning data visualizations...`);

      const chartSpecs = await this.analyzeAndSuggestCharts(input);
      const rationale = await this.generateRationale(input, chartSpecs);

      const output: DataVizOutput = {
        chartSpecs,
        rationale,
        metadata: {
          totalCharts: chartSpecs.length,
          dataTypes: this.extractDataTypes(input),
          complexity: this.assessComplexity(chartSpecs),
        },
      };

      console.log(`[${this.config.name}] Generated ${chartSpecs.length} chart specifications`);
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async analyzeAndSuggestCharts(input: DataVizInput): Promise<ChartSpec[]> {
    const prompt = this.buildChartAnalysisPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseChartSpecs(response.content);
  }

  private async generateRationale(input: DataVizInput, chartSpecs: ChartSpec[]): Promise<string> {
    if (chartSpecs.length === 0) return 'No charts recommended for this section.';
    const prompt = this.buildRationalePrompt(input, chartSpecs);
    const response = await this.callLLM(prompt);
    return response.content.trim();
  }

  private buildChartAnalysisPrompt(input: DataVizInput): string {
    return `You are a data visualization expert. Recommend the best chart type for this question.

Question: ${input.analyticalQuestion}
Context: ${input.slideContext}
Data schema: ${JSON.stringify(input.dataSchema)}
Sample data: ${JSON.stringify(input.sampleData).slice(0, 500)}

Rules:
1. Simplest chart that answers the question
2. Line charts for time series; bar for categories; pie only ≤6 parts
3. No dual-axis unless unavoidable
4. Maximum 2 chart suggestions

Return JSON array only:
[
  {
    "kind": "bar",
    "x": "field_name",
    "y": "field_name",
    "title": "Descriptive Chart Title",
    "xLabel": "X axis label",
    "yLabel": "Y axis label",
    "rationale": "one sentence why this chart",
    "dataExample": [{"x": "A", "y": 10}]
  }
]`;
  }

  private buildRationalePrompt(input: DataVizInput, chartSpecs: ChartSpec[]): string {
    return `Briefly explain (2 sentences) why these charts were chosen:

Question: ${input.analyticalQuestion}
Charts: ${chartSpecs.map(s => `${s.kind} - ${s.title}`).join(', ')}`;
  }

  private parseChartSpecs(content: string): ChartSpec[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(s => ({
          kind: s.kind || 'bar',
          x: s.x || 'x',
          y: s.y || 'y',
          title: s.title || 'Chart',
          xLabel: s.xLabel,
          yLabel: s.yLabel,
          rationale: s.rationale || 'Data visualization',
          dataExample: s.dataExample || null,
        }));
      }

      return [];
    } catch {
      console.error(`[${this.config.name}] Failed to parse chart specs`);
      return [
        {
          kind: 'bar',
          x: 'category',
          y: 'value',
          title: 'Data Overview',
          rationale: 'Bar chart for categorical comparison',
          dataExample: null,
        },
      ];
    }
  }

  private extractDataTypes(input: DataVizInput): string[] {
    const types = new Set<string>();
    if (input.dataSchema) {
      Object.values(input.dataSchema).forEach(field => {
        if (typeof field === 'object' && field !== null && 'type' in field) {
          types.add((field as any).type);
        }
      });
    }
    return Array.from(types);
  }

  private assessComplexity(chartSpecs: ChartSpec[]): 'simple' | 'moderate' | 'complex' {
    if (chartSpecs.length <= 1) return 'simple';
    if (chartSpecs.length <= 3) return 'moderate';
    return 'complex';
  }
}
