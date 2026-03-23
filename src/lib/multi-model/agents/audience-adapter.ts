import { BaseAgent, AgentConfig } from '../base-agent';
import { AudienceAdapterInput, AudienceAdapterOutput } from '../schemas';

// ============================================================================
// AUDIENCE ADAPTER AGENT
// ============================================================================

export class AudienceAdapterAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'audience-adapter',
      description: 'Re-tunes an assembled deck for a different audience, tone, or time constraint',
      capabilities: ['presentation-adaptation', 'audience-analysis', 'content-reframing'],
      maxRetries: 3,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: AudienceAdapterInput, context?: unknown): Promise<AudienceAdapterOutput> {
    try {
      console.log(
        `[${this.config.name}] Adapting from "${input.originalAudience}" → "${input.targetAudience}"...`
      );

      const [adaptedDeck, changeLog] = await Promise.all([
        this.adaptPresentation(input),
        this.generateChangeLog(input),
      ]);

      const output: AudienceAdapterOutput = {
        adaptedDeck,
        changeLog,
        metadata: {
          originalSlides: input.deck.slides?.length ?? 0,
          adaptedSlides: adaptedDeck.slides?.length ?? 0,
          slidesRemoved: Math.max(
            0,
            (input.deck.slides?.length ?? 0) - (adaptedDeck.slides?.length ?? 0)
          ),
          slidesAdded: Math.max(
            0,
            (adaptedDeck.slides?.length ?? 0) - (input.deck.slides?.length ?? 0)
          ),
          toneChanged: input.originalTone !== input.targetTone,
          durationChanged: input.originalDuration !== input.targetDuration,
        },
      };

      console.log(
        `[${this.config.name}] Adapted: ${output.metadata.originalSlides} → ${output.metadata.adaptedSlides} slides`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async adaptPresentation(input: AudienceAdapterInput): Promise<any> {
    const prompt = this.buildAdaptationPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseAdaptedDeck(response.content, input.deck);
  }

  private async generateChangeLog(input: AudienceAdapterInput): Promise<string[]> {
    const prompt = this.buildChangeLogPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseChangeLog(response.content);
  }

  private buildAdaptationPrompt(input: AudienceAdapterInput): string {
    const slideList = (input.deck.slides || [])
      .map((slide: any, i: number) => {
        const heading = slide.blocks?.find((b: any) => b.type === 'Heading');
        return `${i + 1}. ${heading?.text || slide.id}: ${slide.notes?.slice(0, 80) || ''}`;
      })
      .join('\n');

    return `Re-tune this presentation for a new audience.

Original: "${input.originalAudience}" audience, ${input.originalDuration} min, ${input.originalTone} tone
Target: "${input.targetAudience}" audience, ${input.targetDuration} min, ${input.targetTone} tone

Current slides:
${slideList}

Adaptation rules:
1. Preserve all core claims and citations
2. Adjust language level and jargon for target audience
3. Trim/merge slides to fit the target duration
4. Keep essential data — only remove decorative/redundant content
5. Maintain logical flow
6. Do NOT add slides — only reorganize existing content

Return JSON only:
{
  "slides": [{ "id": "slide-id", "action": "keep|modify|merge|remove", "newTitle": "...", "newBullets": ["..."] }],
  "meta": { "audience": "${input.targetAudience}", "tone": "${input.targetTone}", "duration": ${input.targetDuration} }
}`;
  }

  private buildChangeLogPrompt(input: AudienceAdapterInput): string {
    return `List the key changes when adapting this presentation:

From: ${input.originalAudience} audience, ${input.originalDuration} min, ${input.originalTone} tone
To: ${input.targetAudience} audience, ${input.targetDuration} min, ${input.targetTone} tone

Return JSON array of change descriptions (max 8 items):
["Change 1", "Change 2", ...]`;
  }

  private parseAdaptedDeck(content: string, originalDeck: any): any {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      // Apply slide-level actions
      const originalSlides: any[] = originalDeck.slides || [];
      const adaptedSlides = originalSlides
        .map((slide: any, i: number) => {
          const instruction = parsed.slides?.find(
            (s: any) => s.id === slide.id || s.id === `${i + 1}`
          );
          if (!instruction || instruction.action === 'keep') return slide;
          if (instruction.action === 'remove') return null;
          if (instruction.action === 'modify') {
            const updated = { ...slide };
            if (instruction.newTitle) {
              const headingIdx = updated.blocks?.findIndex((b: any) => b.type === 'Heading');
              if (headingIdx >= 0) updated.blocks[headingIdx] = { ...updated.blocks[headingIdx], text: instruction.newTitle };
            }
            if (instruction.newBullets) {
              const bulletsIdx = updated.blocks?.findIndex((b: any) => b.type === 'Bullets');
              if (bulletsIdx >= 0) updated.blocks[bulletsIdx] = { ...updated.blocks[bulletsIdx], items: instruction.newBullets };
            }
            return updated;
          }
          return slide;
        })
        .filter(Boolean);

      return {
        ...originalDeck,
        slides: adaptedSlides,
        meta: {
          ...originalDeck.meta,
          ...(parsed.meta || {}),
        },
      };
    } catch {
      console.error(`[${this.config.name}] Failed to parse adapted deck, returning original`);
      return originalDeck;
    }
  }

  private parseChangeLog(content: string): string[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fallback: split by newlines
      return content
        .split('\n')
        .filter(l => l.trim().length > 0)
        .map(l => l.replace(/^[-*\d.]\s*/, '').trim())
        .slice(0, 8);
    }
    return ['Presentation adapted for new audience and time constraints'];
  }
}
