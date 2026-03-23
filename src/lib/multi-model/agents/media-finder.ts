import { BaseAgent, AgentConfig } from '../base-agent';
import { MediaFinderInput, MediaFinderOutput, MediaSuggestion } from '../schemas';

// ============================================================================
// MEDIA FINDER AGENT
// ============================================================================

export class MediaFinderAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'media-finder',
      description: 'Finds and describes appropriate visual media for each slide section',
      capabilities: ['media-search', 'alt-text-generation', 'visual-enhancement'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: MediaFinderInput, context?: unknown): Promise<MediaFinderOutput> {
    try {
      console.log(`[${this.config.name}] Finding media for: ${input.sectionContext}`);

      const suggestions = await this.findMediaSuggestions(input);
      const enriched = await this.enrichWithAltTexts(input, suggestions);

      const output: MediaFinderOutput = {
        suggestions: enriched,
        metadata: {
          totalSuggestions: enriched.length,
          imageCount: enriched.filter(s => s.type === 'image').length,
          videoCount: enriched.filter(s => s.type === 'video').length,
          diagramCount: enriched.filter(s => s.type === 'diagram').length,
        },
      };

      console.log(`[${this.config.name}] Found ${enriched.length} media suggestions`);
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async findMediaSuggestions(input: MediaFinderInput): Promise<MediaSuggestion[]> {
    const prompt = this.buildMediaSearchPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseMediaSuggestions(response.content, input.keywords[0] || 'content');
  }

  private async enrichWithAltTexts(
    input: MediaFinderInput,
    suggestions: MediaSuggestion[]
  ): Promise<MediaSuggestion[]> {
    // Run alt-text generation in parallel
    const enriched = await Promise.all(
      suggestions.map(async (suggestion) => {
        const prompt = this.buildAltTextPrompt(input, suggestion);
        const response = await this.callLLM(prompt);
        return { ...suggestion, altText: response.content.trim().slice(0, 125) || suggestion.altText };
      })
    );
    return enriched;
  }

  private buildMediaSearchPrompt(input: MediaFinderInput): string {
    return `You are a visual content specialist. Suggest appropriate media for this presentation section.

Section: ${input.sectionContext}
Keywords: ${input.keywords.join(', ')}
Theme style: ${input.themeStyle}
Content type: ${input.contentType}

Rules:
1. Prefer CC0/public domain or officially licensed assets
2. No identifiable people without consent
3. Match the theme and tone
4. Suggest 2-3 high-relevance items (images, diagrams, icons)

Return JSON array only:
[
  {
    "type": "image",
    "url": "https://example.com/image.jpg or null if unknown",
    "prompt": "AI generation prompt if no URL",
    "altText": "descriptive alt text",
    "credit": "attribution or null",
    "relevance": 8,
    "description": "what it shows and why it fits"
  }
]`;
  }

  private buildAltTextPrompt(input: MediaFinderInput, suggestion: MediaSuggestion): string {
    return `Write concise alt text (max 125 chars) for this image:

Type: ${suggestion.type}
Description: ${suggestion.description}
Context: ${input.sectionContext}

Alt text (function-first, no "image of"):`;
  }

  private parseMediaSuggestions(content: string, fallbackKeyword: string): MediaSuggestion[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(s => ({
          type: s.type || 'image',
          url: s.url && s.url !== 'null' ? s.url : undefined,
          prompt: s.prompt || undefined,
          altText: s.altText || s.alt || 'Visual content',
          credit: s.credit || undefined,
          relevance: s.relevance || 5,
          description: s.description || 'Media content',
        }));
      }

      return [];
    } catch {
      console.error(`[${this.config.name}] Failed to parse media suggestions`);
      return [
        {
          type: 'image',
          url: undefined,
          prompt: `Professional illustration related to ${fallbackKeyword}`,
          altText: 'Relevant visual content for this section',
          credit: undefined,
          relevance: 5,
          description: 'Visual content for slide section',
        },
      ];
    }
  }
}
