import { BaseAgent, AgentConfig } from '../base-agent';
import { Slide, SlideBlock, OutlineSection, ResearchSnippet } from '../schemas';
import { z } from 'zod';

// ============================================================================
// SLIDEWRITER AGENT - CONTENT COMPOSER
// ============================================================================

export interface LayoutHint {
  slideIndex: number;
  layout: string;
  visualEmphasis: 'text-heavy' | 'visual-heavy' | 'balanced';
}

export interface SlidewriterInput {
  section: OutlineSection;
  researchSnippets: ResearchSnippet[];
  context: {
    topic: string;
    audience: string;
    tone: string;
    theme: string;
    slideIndex: number;
    totalSlides: number;
  };
  wordBudgets: {
    titleMax: number;
    bulletMax: number;
    bulletsPerSlide: number;
  };
  layoutHints?: LayoutHint[];
}

export interface SlidewriterOutput {
  slides: Slide[];
  quality: {
    readabilityScore: number;
    wordBudgetCompliance: number;
    citationCoverage: number;
  };
}

export class SlidewriterAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'slidewriter',
      description: 'Turns outline sections + research into concrete slides',
      capabilities: ['content-generation', 'slide-formatting', 'citation-integration'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: SlidewriterInput, context?: unknown): Promise<SlidewriterOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!this.validateInput(input, this.getInputSchema())) {
        throw new Error('Invalid input for Slidewriter agent');
      }

      // Filter relevant research snippets for this section
      const relevantSnippets = this.filterRelevantSnippets(
        input.researchSnippets, 
        input.section
      );

      // Generate slides for this section
      const slides = await this.generateSlidesForSection(input, relevantSnippets, input.layoutHints);

      // Calculate quality metrics
      const quality = this.calculateQuality(slides, input);

      const output: SlidewriterOutput = {
        slides,
        quality,
      };

      const duration = Date.now() - startTime;
      this.logExecution('slidewriter-task', input, output, duration);

      return output;

    } catch (error) {
      this.handleError(error, { input, context });
    }
  }

  private filterRelevantSnippets(snippets: ResearchSnippet[], section: OutlineSection): ResearchSnippet[] {
    const sectionKeywords = [
      ...section.title.toLowerCase().split(' '),
      ...section.goal.toLowerCase().split(' '),
      ...section.keyPoints.flatMap(point => point.toLowerCase().split(' '))
    ];

    return snippets.filter(snippet => {
      const snippetText = snippet.text.toLowerCase();
      const snippetTags = snippet.tags.map(tag => tag.toLowerCase());
      
      // Check if snippet is relevant to this section
      const hasKeywordMatch = sectionKeywords.some(keyword => 
        snippetText.includes(keyword) || snippetTags.includes(keyword)
      );
      
      // Check confidence threshold
      const hasGoodConfidence = snippet.confidence >= 0.6;
      
      return hasKeywordMatch && hasGoodConfidence;
    }).slice(0, 5); // Limit to 5 most relevant snippets
  }

  private async generateSlidesForSection(
    input: SlidewriterInput,
    relevantSnippets: ResearchSnippet[],
    layoutHints?: LayoutHint[]
  ): Promise<Slide[]> {
    const slides: Slide[] = [];
    const { section, context, wordBudgets } = input;

    for (let i = 0; i < section.estSlides; i++) {
      const slide = await this.generateSingleSlide(
        section,
        relevantSnippets,
        context,
        wordBudgets,
        i + 1,
        section.estSlides,
        layoutHints
      );

      slides.push(slide);
    }

    return slides;
  }

  private async generateSingleSlide(
    section: OutlineSection,
    snippets: ResearchSnippet[],
    context: { topic: string; audience: string; tone: string; theme: string; slideIndex: number; totalSlides: number },
    wordBudgets: { titleMax: number; bulletMax: number; bulletsPerSlide: number },
    slideNumber: number,
    totalSlides: number,
    layoutHints?: LayoutHint[]
  ): Promise<Slide> {
    const hint = layoutHints?.find(h => h.slideIndex === slideNumber);
    const prompt = this.buildSlidePrompt(section, snippets, context, wordBudgets, slideNumber, totalSlides, hint);
    
    const response = await this.callLLM(prompt);
    
    if (!response || !response.content) {
      console.warn('[slidewriter] Empty response from LLM, using fallback slide data');
      return this.createFallbackSlide(section, slideNumber, totalSlides);
    }

    let slideData;
    try {
      slideData = JSON.parse(response.content);
    } catch (error) {
      console.warn('[slidewriter] Failed to parse slide data JSON:', error);
      console.warn('[slidewriter] Response content:', response.content);
      return this.createFallbackSlide(section, slideNumber, totalSlides);
    }

    // Convert to proper Slide format
    const slide: Slide = {
      id: `slide-${Date.now()}-${slideNumber}`,
      layout: this.determineLayout(slideData),
      blocks: this.createSlideBlocks(slideData, wordBudgets),
      notes: slideData.notes || '',
      cites: this.extractCitations(slideData, snippets),
      order: slideNumber,
      sectionId: section.id,
      estimatedDuration: this.estimateSlideDuration(slideData),
    };

    return slide;
  }

  private buildSlidePrompt(
    section: OutlineSection,
    snippets: ResearchSnippet[],
    context: { topic: string; audience: string; tone: string; theme: string; slideIndex: number; totalSlides: number },
    wordBudgets: { titleMax: number; bulletMax: number; bulletsPerSlide: number },
    slideNumber: number,
    totalSlides: number,
    layoutHint?: LayoutHint
  ): string {
    const snippetTexts = snippets.map(s => `"${s.text}" (confidence: ${s.confidence})`).join('\n');

    const layoutInstructions: Record<string, string> = {
      'kpi':        'Show 2-4 large statistics or metrics as the centrepiece. Minimal prose.',
      'timeline':   'Structure content as sequential steps, milestones, or a chronological list.',
      'comparison': 'Frame content as an explicit A vs B, before/after, or pros/cons comparison.',
      'two-column': 'Split content into two parallel columns: text on one side, supporting detail on the other.',
      'quote':      'Lead with one impactful quote or testimonial. Keep surrounding text minimal.',
      'diagram':    'Describe a conceptual model, process flow, or architecture in the bullets field for rendering.',
      'title+bullets': 'Standard heading + 3-6 bullet points.',
    };

    const assignedLayout = layoutHint?.layout || 'title+bullets';
    const layoutInstruction = layoutInstructions[assignedLayout] || layoutInstructions['title+bullets'];
    const emphasis = layoutHint?.visualEmphasis || 'balanced';

    return `Create slide ${slideNumber} of ${totalSlides} for section: "${section.title}"

Section goal: ${section.goal}
Key points to cover: ${section.keyPoints.join(', ')}

Relevant research:
${snippetTexts}

Context:
- Topic: ${context.topic}
- Audience: ${context.audience}
- Tone: ${context.tone}
- Theme: ${context.theme}

Layout: ${assignedLayout} — ${layoutInstruction}
Visual emphasis: ${emphasis}

Word budgets:
- Title: ≤${wordBudgets.titleMax} words
- Bullets: ≤${wordBudgets.bulletMax} words each
- Max bullets: ${wordBudgets.bulletsPerSlide}

Create a slide with:
1. A compelling title (≤${wordBudgets.titleMax} words)
2. Content matching the layout type above
3. Optional subheading if needed
4. Speaker notes (2-3 sentences)
5. Citations to research snippets (use snippet IDs)

Return as JSON:
{
  "title": "Slide Title",
  "subtitle": "Optional subtitle",
  "bullets": ["bullet1", "bullet2", "bullet3"],
  "notes": "Speaker notes here",
  "citations": ["snippet-id-1", "snippet-id-2"],
  "layout": "${assignedLayout}"
}`;
  }

  private determineLayout(slideData: { layout?: string; bullets?: string[] }): Slide['layout'] {
    if (slideData.layout) {
      return slideData.layout as Slide['layout'];
    }
    
    // Default layout based on content
    if (slideData.bullets && slideData.bullets.length > 0) {
      return 'title+bullets';
    }
    
    return 'title';
  }

  private createSlideBlocks(slideData: { title?: string; subtitle?: string; bullets?: string[] }, wordBudgets: { titleMax: number; bulletMax: number; bulletsPerSlide: number }): SlideBlock[] {
    const blocks: SlideBlock[] = [];

    // Add title block
    if (slideData.title) {
      blocks.push({
        type: 'Heading',
        text: slideData.title,
        level: 1,
        animation: 'slideInFromTop',
      });
    }

    // Add subtitle block
    if (slideData.subtitle) {
      blocks.push({
        type: 'Subheading',
        text: slideData.subtitle,
        animation: 'fadeIn',
      });
    }

    // Add bullets block
    if (slideData.bullets && slideData.bullets.length > 0) {
      const bulletTexts = slideData.bullets.slice(0, wordBudgets.bulletsPerSlide);
      blocks.push({
        type: 'Bullets',
        items: bulletTexts,
        animation: 'staggerIn',
      });
    }

    return blocks;
  }

  private extractCitations(slideData: { citations?: string[] }, snippets: ResearchSnippet[]): string[] {
    if (!slideData.citations || !Array.isArray(slideData.citations)) {
      return [];
    }

    // Build a Set for O(1) lookups
    const validSnippetIds = new Set(snippets.map(s => s.id));

    // Only keep citations that resolve to real snippets with sufficient confidence
    const validCitations = slideData.citations.filter((id: string) => {
      if (!validSnippetIds.has(id)) return false;
      const snippet = snippets.find(s => s.id === id);
      return snippet && snippet.confidence >= 0.6;
    });

    // Deduplicate
    return [...new Set(validCitations)];
  }

  private estimateSlideDuration(slideData: { bullets?: string[]; subtitle?: string }): number {
    // Estimate 30-60 seconds per slide based on content complexity
    let duration = 30; // Base duration
    
    if (slideData.bullets && slideData.bullets.length > 3) {
      duration += 15; // More bullets = more time
    }
    
    if (slideData.subtitle) {
      duration += 10; // Subtitle adds complexity
    }
    
    return Math.min(duration, 90); // Cap at 90 seconds
  }

  private calculateQuality(slides: Slide[], input: SlidewriterInput): SlidewriterOutput['quality'] {
    let totalReadabilityScore = 0;
    let totalWordBudgetCompliance = 0;
    let totalCitationCoverage = 0;

    for (const slide of slides) {
      // Calculate readability score (simplified)
      const readabilityScore = this.calculateSlideReadability(slide);
      totalReadabilityScore += readabilityScore;

      // Calculate word budget compliance
      const wordBudgetCompliance = this.calculateWordBudgetCompliance(slide, input.wordBudgets);
      totalWordBudgetCompliance += wordBudgetCompliance;

      // Calculate citation coverage
      const citationCoverage = this.calculateCitationCoverage(slide, input.researchSnippets);
      totalCitationCoverage += citationCoverage;
    }

    const slideCount = slides.length;

    return {
      readabilityScore: totalReadabilityScore / slideCount,
      wordBudgetCompliance: totalWordBudgetCompliance / slideCount,
      citationCoverage: totalCitationCoverage / slideCount,
    };
  }

  private calculateSlideReadability(slide: Slide): number {
    let score = 1.0;

    // Check title length
    const titleBlock = slide.blocks.find(b => b.type === 'Heading');
    if (titleBlock && 'text' in titleBlock) {
      const titleWords = titleBlock.text.split(' ').length;
      if (titleWords > 8) {
        score -= 0.2;
      }
    }

    // Check bullet length
    const bulletsBlock = slide.blocks.find(b => b.type === 'Bullets');
    if (bulletsBlock && 'items' in bulletsBlock) {
      for (const bullet of bulletsBlock.items) {
        const bulletWords = bullet.split(' ').length;
        if (bulletWords > 12) {
          score -= 0.1;
        }
      }
    }

    return Math.max(score, 0);
  }

  private calculateWordBudgetCompliance(slide: Slide, wordBudgets: any): number {
    let compliance = 1.0;

    // Check title compliance
    const titleBlock = slide.blocks.find(b => b.type === 'Heading');
    if (titleBlock && 'text' in titleBlock) {
      const titleWords = titleBlock.text.split(' ').length;
      if (titleWords > wordBudgets.titleMax) {
        compliance -= 0.3;
      }
    }

    // Check bullet compliance
    const bulletsBlock = slide.blocks.find(b => b.type === 'Bullets');
    if (bulletsBlock && 'items' in bulletsBlock) {
      if (bulletsBlock.items.length > wordBudgets.bulletsPerSlide) {
        compliance -= 0.2;
      }
      
      for (const bullet of bulletsBlock.items) {
        const bulletWords = bullet.split(' ').length;
        if (bulletWords > wordBudgets.bulletMax) {
          compliance -= 0.1;
        }
      }
    }

    return Math.max(compliance, 0);
  }

  private calculateCitationCoverage(slide: Slide, allSnippets: ResearchSnippet[]): number {
    if (!slide.cites || slide.cites.length === 0) {
      return 0;
    }

    const citedSnippets = allSnippets.filter(s => slide.cites?.includes(s.id));
    const highConfidenceCitations = citedSnippets.filter(s => s.confidence >= 0.8).length;
    
    return highConfidenceCitations / Math.max(slide.cites.length, 1);
  }

  private getInputSchema() {
    return z.object({
      section: z.any(), // OutlineSection
      researchSnippets: z.array(z.any()),
      context: z.object({
        topic: z.string(),
        audience: z.string(),
        tone: z.string(),
        theme: z.string(),
        slideIndex: z.number(),
        totalSlides: z.number(),
      }),
      wordBudgets: z.object({
        titleMax: z.number(),
        bulletMax: z.number(),
        bulletsPerSlide: z.number(),
      }),
    });
  }

  protected validateOutput(output: SlidewriterOutput): boolean {
    if (!output.slides || !Array.isArray(output.slides)) {
      return false;
    }

    if (output.slides.length === 0) {
      return false;
    }

    // Validate each slide has required blocks
    for (const slide of output.slides) {
      if (!slide.blocks || slide.blocks.length === 0) {
        return false;
      }
      
      // Must have at least a title
      const hasTitle = slide.blocks.some(b => b.type === 'Heading');
      if (!hasTitle) {
        return false;
      }
    }

    return true;
  }

  private createFallbackSlide(section: OutlineSection, slideNumber: number, totalSlides: number): Slide {
    return {
      id: `slide-${Date.now()}-${slideNumber}`,
      layout: 'title+bullets' as const,
      blocks: [
        {
          type: 'Heading' as const,
          text: section.title || `Slide ${slideNumber}`,
          level: 1,
        },
        {
          type: 'Bullets' as const,
          items: section.keyPoints?.slice(0, 3) || ['Key point 1', 'Key point 2', 'Key point 3'],
        },
      ],
      notes: `Discuss ${section.title || 'this topic'} in detail.`,
      cites: [],
      order: slideNumber,
    };
  }

  protected getQualityScore(output: SlidewriterOutput): number {
    const { quality } = output;
    
    // Weighted quality score
    const readabilityWeight = 0.4;
    const wordBudgetWeight = 0.3;
    const citationWeight = 0.3;
    
    return (
      quality.readabilityScore * readabilityWeight +
      quality.wordBudgetCompliance * wordBudgetWeight +
      quality.citationCoverage * citationWeight
    );
  }
}
