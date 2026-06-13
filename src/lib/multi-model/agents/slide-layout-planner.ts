import { BaseAgent, AgentConfig } from '../base-agent';
import { DeckOutline } from '../schemas';

// ============================================================================
// SLIDE LAYOUT PLANNER — runs between Structurer and Slidewriter
// Decides the visual layout type for every slide before content is written.
// ============================================================================

export type SlideLayout =
  | 'title'
  | 'title+bullets'
  | 'two-column'
  | 'comparison'
  | 'kpi'
  | 'timeline'
  | 'quote'
  | 'diagram';

export type VisualEmphasis = 'text-heavy' | 'visual-heavy' | 'balanced';

export interface LayoutPlanSlide {
  slideIndex: number; // 1-based within section
  layout: SlideLayout;
  rationale: string;
  visualEmphasis: VisualEmphasis;
}

export interface LayoutPlanSection {
  sectionId: string;
  slides: LayoutPlanSlide[];
}

export interface SlideLayoutPlannerInput {
  outline: DeckOutline;
  topic: string;
  audience: string;
  tone: string;
}

export interface SlideLayoutPlannerOutput {
  layoutPlan: LayoutPlanSection[];
  metadata: {
    totalSlides: number;
    layoutVariety: number; // 0–1, how varied the layouts are
    visualHeavyCount: number;
    textHeavyCount: number;
  };
}

const VALID_LAYOUTS: SlideLayout[] = [
  'title', 'title+bullets', 'two-column', 'comparison',
  'kpi', 'timeline', 'quote', 'diagram',
];

export class SlideLayoutPlannerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'slide-layout-planner',
      description: 'Assigns the optimal visual layout to every slide before content is written, ensuring variety and visual impact',
      capabilities: ['layout-planning', 'visual-structure', 'presentation-design'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: SlideLayoutPlannerInput, context?: unknown): Promise<SlideLayoutPlannerOutput> {
    try {
      console.log(`[${this.config.name}] Planning layouts for ${input.outline.sections.length} sections...`);

      const layoutPlan = await this.planLayouts(input);
      const allSlides = layoutPlan.flatMap(s => s.slides);
      const layouts = allSlides.map(s => s.layout);
      const uniqueLayouts = new Set(layouts).size;

      const output: SlideLayoutPlannerOutput = {
        layoutPlan,
        metadata: {
          totalSlides: allSlides.length,
          layoutVariety: uniqueLayouts / Math.max(layouts.length, 1),
          visualHeavyCount: allSlides.filter(s => s.visualEmphasis === 'visual-heavy').length,
          textHeavyCount: allSlides.filter(s => s.visualEmphasis === 'text-heavy').length,
        },
      };

      console.log(
        `[${this.config.name}] Planned ${allSlides.length} slide layouts — ` +
        `${uniqueLayouts} unique layouts (${(output.metadata.layoutVariety * 100).toFixed(0)}% variety)`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async planLayouts(input: SlideLayoutPlannerInput): Promise<LayoutPlanSection[]> {
    const prompt = this.buildLayoutPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseLayoutPlan(response.content, input.outline);
  }

  private buildLayoutPrompt(input: SlideLayoutPlannerInput): string {
    const sections = input.outline.sections
      .map(s =>
        `  id="${s.id}" title="${s.title}" slides=${s.estSlides} chart=${s.chartSuggested ? 'yes' : 'no'}\n` +
        `  goal: ${s.goal}\n` +
        `  keyPoints: ${s.keyPoints.slice(0, 3).join(' | ')}`
      )
      .join('\n\n');

    return `You are a presentation design director. Assign the best visual layout to every slide.

Topic: ${input.topic}
Audience: ${input.audience}
Tone: ${input.tone}

Sections:
${sections}

Layout options:
- title+bullets  → default: heading + 3-6 bullets
- two-column     → side-by-side: text + image, or two sets of bullets
- comparison     → explicit A vs B, before/after, pros/cons
- kpi            → 2-4 large metrics or statistics dominate the slide
- timeline       → sequential steps, milestones, or chronological events
- quote          → single impactful quote or testimonial fills the slide
- diagram        → conceptual model, process flow, or architecture

Design rules:
1. Never use title+bullets more than 2 slides in a row — vary layouts
2. Use kpi when keyPoints contain numbers, percentages, or statistics
3. Use timeline when the section is about process, steps, or history
4. Use comparison when the section contrasts two things, options, or periods
5. Use quote for testimonial or single-insight sections
6. If chart=yes, make the last slide of that section kpi or diagram
7. First slide of each section can be title+bullets as an intro
8. Distribute visual-heavy and text-heavy slides — aim for 40% visual-heavy

Return JSON only:
[
  {
    "sectionId": "exact-section-id",
    "slides": [
      { "slideIndex": 1, "layout": "title+bullets", "rationale": "section intro", "visualEmphasis": "text-heavy" },
      { "slideIndex": 2, "layout": "kpi", "rationale": "key metrics", "visualEmphasis": "visual-heavy" }
    ]
  }
]`;
  }

  private parseLayoutPlan(content: string, outline: DeckOutline): LayoutPlanSection[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(section => ({
          sectionId: section.sectionId || '',
          slides: (section.slides || []).map((slide: any) => ({
            slideIndex: slide.slideIndex || 1,
            layout: this.validateLayout(slide.layout),
            rationale: slide.rationale || '',
            visualEmphasis: (['text-heavy', 'visual-heavy', 'balanced'].includes(slide.visualEmphasis)
              ? slide.visualEmphasis
              : 'balanced') as VisualEmphasis,
          })),
        }));
      }
    } catch {
      console.warn(`[${this.config.name}] Failed to parse layout plan — using smart defaults`);
    }

    return this.generateDefaultLayouts(outline);
  }

  private validateLayout(layout: string): SlideLayout {
    return VALID_LAYOUTS.includes(layout as SlideLayout) ? (layout as SlideLayout) : 'title+bullets';
  }

  /** Smart defaults: vary layouts based on section characteristics */
  private generateDefaultLayouts(outline: DeckOutline): LayoutPlanSection[] {
    const layoutCycle: SlideLayout[] = ['title+bullets', 'two-column', 'title+bullets', 'kpi'];
    let cycleIndex = 0;

    return outline.sections.map(section => ({
      sectionId: section.id,
      slides: Array.from({ length: section.estSlides }, (_, i) => {
        let layout: SlideLayout = i === 0 ? 'title+bullets' : layoutCycle[cycleIndex++ % layoutCycle.length];
        if (section.chartSuggested && i === section.estSlides - 1) layout = 'diagram';
        return {
          slideIndex: i + 1,
          layout,
          rationale: 'smart default',
          visualEmphasis: layout === 'kpi' || layout === 'diagram' ? 'visual-heavy' : 'balanced',
        };
      }),
    }));
  }
}
