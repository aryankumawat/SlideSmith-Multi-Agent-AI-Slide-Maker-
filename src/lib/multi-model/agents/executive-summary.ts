import { BaseAgent, AgentConfig } from '../base-agent';
import { ExecutiveSummaryInput, ExecutiveSummaryOutput } from '../schemas';

// ============================================================================
// EXECUTIVE SUMMARY AGENT
// ============================================================================

export class ExecutiveSummaryAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'executive-summary',
      description: 'Distills a full deck into a summary slide and a 100-120 word email',
      capabilities: ['slide-synthesis', 'email-composition', 'key-point-extraction'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: ExecutiveSummaryInput, context?: unknown): Promise<ExecutiveSummaryOutput> {
    try {
      console.log(`[${this.config.name}] Generating executive summary...`);

      const [summarySlide, emailSummary] = await Promise.all([
        this.generateSummarySlide(input),
        this.generateEmailSummary(input),
      ]);

      const output: ExecutiveSummaryOutput = {
        summarySlide,
        emailSummary,
        metadata: {
          keyPoints: this.extractKeyPoints(input.deck),
          totalSlides: input.deck.slides?.length ?? 0,
          estimatedReadTime: this.calculateReadTime(emailSummary),
        },
      };

      console.log(`[${this.config.name}] Executive summary generated`);
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async generateSummarySlide(input: ExecutiveSummaryInput): Promise<any> {
    const prompt = this.buildSummarySlidePrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseSummarySlide(response.content);
  }

  private async generateEmailSummary(input: ExecutiveSummaryInput): Promise<string> {
    const prompt = this.buildEmailSummaryPrompt(input);
    const response = await this.callLLM(prompt);
    return response.content.trim();
  }

  private buildSummarySlidePrompt(input: ExecutiveSummaryInput): string {
    const keyPoints = this.extractKeyPoints(input.deck);
    return `Create an executive summary slide for this presentation.

Title: ${input.deck.meta?.title || input.deck.title || 'Presentation'}
Audience: ${input.audience}
Tone: ${input.tone}
Total slides: ${input.deck.slides?.length ?? 0}

Key points from the deck:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Requirements:
- Title: "Key Takeaways" or "Executive Summary"
- 3-5 concise bullet takeaways (≤10 words each)
- One clear next step
- No new facts — only synthesize existing content

Return JSON only:
{
  "title": "Key Takeaways",
  "keyPoints": ["takeaway 1", "takeaway 2", "takeaway 3"],
  "nextStep": "Recommended next action",
  "notes": "Spoken intro for this slide"
}`;
  }

  private buildEmailSummaryPrompt(input: ExecutiveSummaryInput): string {
    const keyPoints = this.extractKeyPoints(input.deck);
    return `Write a professional email summary of this presentation (100-120 words).

Presentation: ${input.deck.meta?.title || input.deck.title || 'Presentation'}
Audience: ${input.audience}
Tone: ${input.tone}

Key points:
${keyPoints.map(p => `- ${p}`).join('\n')}

Format:
Subject: [Concise subject line]

[Email body — highlight outcomes, be action-oriented, match the ${input.tone} tone]

Return the full email text only.`;
  }

  private extractKeyPoints(deck: any): string[] {
    const keyPoints: string[] = [];

    (deck.slides || []).forEach((slide: any) => {
      (slide.blocks || []).forEach((block: any) => {
        if (block.type === 'Bullets' && Array.isArray(block.items)) {
          keyPoints.push(...block.items.slice(0, 2));
        } else if (block.type === 'Heading' && block.text) {
          keyPoints.push(block.text);
        }
        // Legacy lowercase block types
        if (block.type === 'bullets' && Array.isArray(block.items)) {
          keyPoints.push(...block.items.slice(0, 2));
        } else if (block.type === 'heading' && block.text) {
          keyPoints.push(block.text);
        }
      });
    });

    return [...new Set(keyPoints)].slice(0, 5);
  }

  private parseSummarySlide(content: string): any {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        id: 'executive-summary',
        layout: 'title+bullets',
        blocks: [
          { type: 'Heading', text: parsed.title || 'Key Takeaways', level: 1 },
          {
            type: 'Bullets',
            items: [
              ...(parsed.keyPoints || ['Key takeaway 1', 'Key takeaway 2', 'Key takeaway 3']),
              ...(parsed.nextStep ? [`Next: ${parsed.nextStep}`] : []),
            ],
          },
        ],
        notes: parsed.notes || 'Summary of key points and recommended next steps.',
        order: -1,
      };
    } catch {
      return {
        id: 'executive-summary',
        layout: 'title+bullets',
        blocks: [
          { type: 'Heading', text: 'Key Takeaways', level: 1 },
          { type: 'Bullets', items: ['Key takeaway 1', 'Key takeaway 2', 'Key takeaway 3'] },
        ],
        notes: 'Summary of key points and outcomes.',
        order: -1,
      };
    }
  }

  private calculateReadTime(text: string): number {
    const words = text.split(/\s+/).length;
    return Math.ceil(words / 200); // ~200 wpm reading speed
  }
}
