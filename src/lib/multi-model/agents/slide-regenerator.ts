import { BaseAgent, AgentConfig } from '../base-agent';

export interface RegenerateSlideInput {
  deck: {
    title: string;
    theme: string;
    slides: any[];
  };
  slideIndex: number;
  feedback: string;
  targetLayout?: string;
  text_density?: string;
  content_format?: 'bullets' | 'paragraph' | 'mixed';
}

export interface RegenerateSlideOutput {
  deck: {
    title: string;
    theme: string;
    slides: any[];
  };
  regeneratedSlide: any;
  slideIndex: number;
}

export class SlideRegeneratorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'slide-regenerator',
      description: 'Rewrites a single slide based on user feedback without re-running the full pipeline',
      capabilities: ['content-generation', 'slide-editing'],
      maxRetries: 3,
      timeout: 60000,
    };
    super(config);
  }

  async execute(input: RegenerateSlideInput): Promise<RegenerateSlideOutput> {
    const { deck, slideIndex, feedback, targetLayout, text_density = 'medium', content_format = 'mixed' } = input;
    const targetSlide = deck.slides[slideIndex];
    if (!targetSlide) throw new Error(`Slide index ${slideIndex} out of range`);

    const prevSlide = slideIndex > 0 ? deck.slides[slideIndex - 1] : null;
    const nextSlide = slideIndex < deck.slides.length - 1 ? deck.slides[slideIndex + 1] : null;
    const layout = targetLayout || targetSlide.layout || 'split';
    const bulletCount = text_density === 'low' ? 2 : text_density === 'text_heavy' ? 6 : 4;

    const paraInstruction = content_format === 'bullets'
      ? '"paragraph": null,'
      : `"paragraph": "2-3 sentences of flowing prose about the slide topic. Write as an expert, not a list.",`;

    const bulletsInstruction = content_format === 'paragraph'
      ? '"bullets": ["One key takeaway bullet"],'
      : `"bullets": ["**Key point 1**: specific fact", "**Key point 2**: another fact with a number", "**Key point 3**: supporting evidence"],`;

    const prompt = `You are rewriting slide ${slideIndex + 1} of ${deck.slides.length} from a presentation titled: "${deck.title}"

CURRENT SLIDE:
Title: "${targetSlide.title}"
Layout: ${targetSlide.layout}
Current content: ${JSON.stringify(targetSlide.bullets || [], null, 2)}

USER FEEDBACK: "${feedback}"

${prevSlide ? `PREVIOUS SLIDE: "${prevSlide.title}"` : ''}
${nextSlide ? `NEXT SLIDE: "${nextSlide.title}"` : ''}

Rewrite this slide addressing the feedback. Use layout: "${layout}"

Return ONLY valid JSON:
{
  "title": "${targetSlide.title}",
  "subtitle": null,
  ${paraInstruction}
  ${bulletsInstruction}
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "Updated speaker notes addressing the feedback",
  "citations": []
}
Rules:
- Address "${feedback}" directly in the rewrite
- Keep the slide title unless the feedback implies changing it
- ${bulletCount} bullets maximum
- Content must flow logically between the prev and next slides
JSON:`;

    const result = await this.callLLM(prompt);
    const regenerated = this.parseJSON(result.content);

    regenerated.layout = layout;
    regenerated.title = regenerated.title || targetSlide.title;
    regenerated.content_format = content_format;

    // Preserve image if it existed and wasn't the issue
    if (targetSlide.image && !feedback.toLowerCase().includes('image')) {
      regenerated.image = targetSlide.image;
    }

    const updatedSlides = [...deck.slides];
    updatedSlides[slideIndex] = regenerated;

    return {
      deck: { ...deck, slides: updatedSlides },
      regeneratedSlide: regenerated,
      slideIndex,
    };
  }

  private parseJSON(raw: string): any {
    let s = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const start = s.indexOf('{'), end = s.lastIndexOf('}');
    if (start !== -1 && end > start) s = s.slice(start, end + 1);
    try { return JSON.parse(s); } catch {
      // Best-effort cleanup
      s = s.replace(/,\s*([}\]])/g, '$1').replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
      try { return JSON.parse(s); } catch { return {}; }
    }
  }
}
