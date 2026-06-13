import { AgentConfig, BaseAgent } from '../base-agent';
import { LiveWidgetInput, LiveWidgetOutput, WidgetRecommendation } from '../schemas';

export class LiveWidgetPlannerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'live-widget-planner',
      description: 'Plans live widgets for interactive presentation slides',
      capabilities: ['widget-planning', 'data-visualization', 'interactivity'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: LiveWidgetInput): Promise<LiveWidgetOutput> {
    try {
      console.log(`[${this.config.name}] Planning live widgets...`);

      const recommendations = await this.planLiveWidgets(input);

      const output: LiveWidgetOutput = {
        recommendations,
        metadata: {
          totalRecommendations: recommendations.length,
          chartWidgets: recommendations.filter(r => r.widgetSpec.type === 'LiveChart').length,
          tickerWidgets: recommendations.filter(r => r.widgetSpec.type === 'Ticker').length,
          mapWidgets: recommendations.filter(r => r.widgetSpec.type === 'Map').length,
          countdownWidgets: recommendations.filter(r => r.widgetSpec.type === 'Countdown').length,
          iframeWidgets: recommendations.filter(r => r.widgetSpec.type === 'Iframe').length
        }
      };

      console.log(`[${this.config.name}] Generated ${recommendations.length} widget recommendations`);
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async planLiveWidgets(input: LiveWidgetInput): Promise<WidgetRecommendation[]> {
    const prompt = this.buildWidgetPlanningPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseWidgetRecommendations(response.content);
  }

  private buildWidgetPlanningPrompt(input: LiveWidgetInput): string {
    return `
You are a live presentation specialist. Suggest practical live widgets for this presentation.

Presentation Context:
- Topic: ${input.topic}
- Audience: ${input.audience}
- Tone: ${input.tone}
- Duration: ${input.duration} minutes
- Mode: ${input.mode}

Outline Sections:
${input.outline.map(section => `- ${section.title}: ${section.description}`).join('\n')}

Available Endpoints:
${input.safeEndpoints.map(endpoint => `- ${endpoint.name}: ${endpoint.url}`).join('\n')}

Guidelines:
1. Only suggest widgets that add real value
2. Keep refresh rates modest (3-10 seconds)
3. Use only trustworthy endpoints or demo proxies
4. Consider audience engagement and interaction
5. Match the presentation tone and style
6. Ensure widgets don't distract from content
7. Suggest appropriate placement in slides

Widget Types Available:
- LiveChart: Real-time data visualization
- Ticker: Scrolling text or data feed
- Map: Interactive maps with data
- Countdown: Timer or countdown display
- Iframe: Embedded external content

For each recommendation, provide:
- slideIndex: which slide to add to (0-based)
- widgetSpec: detailed widget configuration
- explanation: why this widget helps
- refreshRate: how often to update (seconds)
- priority: high/medium/low
- audienceEngagement: how it engages audience

Return as JSON array of widget recommendations.
`;
  }

  private parseWidgetRecommendations(response: string): WidgetRecommendation[] {
    try {
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(rec => ({
          slideIndex: rec.slideIndex || 0,
          widgetSpec: {
            type: rec.widgetSpec?.type || 'LiveChart',
            config: rec.widgetSpec?.config || {},
            dataSource: rec.widgetSpec?.dataSource || null,
            refreshRate: rec.widgetSpec?.refreshRate || 5
          },
          explanation: rec.explanation || 'Live widget for engagement',
          refreshRate: rec.refreshRate || 5,
          priority: rec.priority || 'medium',
          audienceEngagement: rec.audienceEngagement || 'Visual interest'
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to parse widget recommendations:', error);
      return [];
    }
  }
}
