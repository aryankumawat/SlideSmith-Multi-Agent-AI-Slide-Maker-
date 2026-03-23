import { ModelRouter, TaskContext } from './router';
import { BaseAgent } from './base-agent';
import {
  Deck,
  DeckOutline,
  ResearchSnippet,
  Slide,
  ExecutiveSummary,
  AudienceAdaptation,
  QualityCheck,
  DataVizOutput,
  MediaFinderOutput,
  SpeakerNotesOutput,
  AccessibilityOutput,
  ExecutiveSummaryOutput,
  AudienceAdapterOutput,
} from './schemas';

// ============================================================================
// MULTI-MODEL ORCHESTRATOR
// ============================================================================

export interface OrchestratorInput {
  topic: string;
  audience: string;
  tone: string;
  desiredSlideCount: number;
  theme?: string;
  duration?: number;
  sources?: string[];
  urls?: string[];
  enableLive?: boolean;
  /** Trigger executive summary regardless of audience type */
  generateExecutiveSummary?: boolean;
  /** Re-tune the assembled deck for a secondary audience */
  targetAudience?: string;
  targetTone?: string;
  targetDuration?: number;
  policy?: 'quality' | 'speed' | 'cost' | 'balanced' | 'local-only';
}

export interface OrchestratorOutput {
  deck: Deck;
  metadata: {
    totalTokens: number;
    totalCost: number;
    processingTime: number;
    qualityScores: {
      factCheck: number;
      accessibility: number;
      readability: number;
      consistency: number;
    };
  };
  executiveSummary?: ExecutiveSummaryOutput;
  audienceAdaptation?: AudienceAdapterOutput;
  qualityChecks?: QualityCheck[];
  speakerNotes?: SpeakerNotesOutput;
  mediaEnhancements?: Record<string, MediaFinderOutput>;
  dataVizEnhancements?: Record<string, DataVizOutput>;
}

export class MultiModelOrchestrator {
  private router: ModelRouter;
  private agents: Map<string, BaseAgent> = new Map();
  private taskHistory: Map<string, unknown> = new Map();
  private initializationPromise: Promise<void>;
  private isInitialized = false;

  constructor() {
    this.router = new ModelRouter();
    this.initializationPromise = this.initializeAgents();
  }

  // ============================================================================
  // MAIN ORCHESTRATION PIPELINE
  // ============================================================================

  async generatePresentation(input: OrchestratorInput): Promise<OrchestratorOutput> {
    if (!this.isInitialized) {
      await this.initializationPromise;
    }

    const startTime = Date.now();

    try {
      console.log(`[Orchestrator] Starting presentation generation for: ${input.topic}`);

      // Step 1: Research (Evidence Collection)
      console.log('[Orchestrator] Step 1: Research');
      const researchResult = await this.executeAgent('researcher', {
        topic: input.topic,
        audience: input.audience,
        tone: input.tone,
        sources: input.sources,
        urls: input.urls,
        maxSnippets: 20,
        minConfidence: 0.6,
      }, input.policy) as any;

      // Step 2: Structure (Deck Outline Planning)
      console.log('[Orchestrator] Step 2: Structure');
      const structureResult = await this.executeAgent('structurer', {
        topic: input.topic,
        audience: input.audience,
        tone: input.tone,
        desiredSlideCount: input.desiredSlideCount,
        researchSnippets: researchResult.snippets,
        theme: input.theme,
        duration: input.duration,
      }, input.policy) as any;

      // Step 3: Content Generation + per-section Media/DataViz (parallel)
      console.log('[Orchestrator] Step 3: Content Generation + Media/DataViz');
      const { slides, mediaEnhancements, dataVizEnhancements } =
        await this.generateSlidesWithEnhancements(
          structureResult.outline,
          researchResult.snippets,
          input
        );

      // Step 4: Quality Assurance Pipeline (parallel)
      console.log('[Orchestrator] Step 4: Quality Assurance');
      const qualityResults = await this.runQualityPipeline(
        slides,
        researchResult.snippets,
        input
      );

      // Step 5: Speaker Notes (parallel with QA but after slides are ready)
      console.log('[Orchestrator] Step 5: Speaker Notes');
      const speakerNotes = await this.generateSpeakerNotes(
        slides,
        input,
        structureResult.outline.estimatedDuration
      );

      // Enrich slide notes with speaker notes output
      if (speakerNotes) {
        this.enrichSlidesWithNotes(slides, speakerNotes);
      }

      // Step 6: Final Assembly
      console.log('[Orchestrator] Step 6: Final Assembly');
      const deck = this.assembleDeck(
        structureResult.outline,
        slides,
        researchResult.snippets,
        input,
        qualityResults.scores
      );

      // Step 7: Executive Summary (always available, gated by flag or exec audience)
      let executiveSummary: ExecutiveSummaryOutput | undefined;
      const wantsExecSummary =
        input.generateExecutiveSummary ||
        input.audience.toLowerCase().includes('executive');
      if (wantsExecSummary) {
        console.log('[Orchestrator] Step 7: Executive Summary');
        executiveSummary = await this.generateExecutiveSummary(deck, input);
      }

      // Step 8: Audience Adaptation (optional, if targetAudience specified)
      let audienceAdaptation: AudienceAdapterOutput | undefined;
      if (input.targetAudience && input.targetAudience !== input.audience) {
        console.log('[Orchestrator] Step 8: Audience Adaptation');
        audienceAdaptation = await this.adaptForAudienceInPipeline(deck, input);
      }

      const processingTime = Date.now() - startTime;
      const metadata = this.calculateMetadata(processingTime, qualityResults.scores);

      const output: OrchestratorOutput = {
        deck,
        metadata,
        executiveSummary,
        audienceAdaptation,
        qualityChecks: qualityResults.checks,
        speakerNotes: speakerNotes || undefined,
        mediaEnhancements,
        dataVizEnhancements,
      };

      console.log(`[Orchestrator] Completed in ${processingTime}ms`);
      return output;

    } catch (error) {
      console.error('[Orchestrator] Generation failed:', error);
      throw new Error(
        `Presentation generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // ============================================================================
  // PARALLEL SLIDE GENERATION + PER-SECTION MEDIA & DATA VIZ
  // ============================================================================

  private async generateSlidesWithEnhancements(
    outline: DeckOutline,
    snippets: ResearchSnippet[],
    input: OrchestratorInput
  ): Promise<{
    slides: Slide[];
    mediaEnhancements: Record<string, MediaFinderOutput>;
    dataVizEnhancements: Record<string, DataVizOutput>;
  }> {
    const sectionResults = await Promise.all(
      outline.sections.map(async (section, sectionIndex) => {
        // 1. Generate slides for this section
        const slidewriterInput = {
          section,
          researchSnippets: snippets,
          context: {
            topic: input.topic,
            audience: input.audience,
            tone: input.tone,
            theme: input.theme || 'professional',
            slideIndex: sectionIndex + 1,
            totalSlides: outline.sections.length,
          },
          wordBudgets: {
            titleMax: 8,
            bulletMax: 12,
            bulletsPerSlide: 6,
          },
        };
        const slideResult = await this.executeAgent('slidewriter', slidewriterInput, input.policy) as any;
        const slides: Slide[] = slideResult.slides || [];

        // 2. In parallel: Media Finder + Data Viz Planner for this section
        const [mediaResult, dataVizResult] = await Promise.all([
          this.executeAgent('media-finder', {
            sectionContext: `${section.title}: ${section.goal}`,
            keywords: section.keyPoints.slice(0, 5),
            themeStyle: input.theme || 'professional',
            contentType: 'presentation slide',
          }, input.policy).catch(err => {
            console.warn(`[Orchestrator] Media finder failed for section "${section.title}":`, err);
            return null;
          }),

          section.chartSuggested
            ? this.executeAgent('data-viz-planner', {
                analyticalQuestion: section.goal,
                dataSchema: {},
                sampleData: [],
                slideContext: `${section.title} — ${section.goal}`,
              }, input.policy).catch(err => {
                console.warn(`[Orchestrator] Data viz planner failed for section "${section.title}":`, err);
                return null;
              })
            : Promise.resolve(null),
        ]);

        return {
          sectionId: section.id,
          slides,
          mediaResult: mediaResult as MediaFinderOutput | null,
          dataVizResult: dataVizResult as DataVizOutput | null,
        };
      })
    );

    const allSlides = sectionResults.flatMap(r => r.slides);

    const mediaEnhancements: Record<string, MediaFinderOutput> = {};
    const dataVizEnhancements: Record<string, DataVizOutput> = {};

    sectionResults.forEach(r => {
      if (r.mediaResult) mediaEnhancements[r.sectionId] = r.mediaResult;
      if (r.dataVizResult) dataVizEnhancements[r.sectionId] = r.dataVizResult;
    });

    return { slides: allSlides, mediaEnhancements, dataVizEnhancements };
  }

  // ============================================================================
  // QUALITY ASSURANCE PIPELINE
  // ============================================================================

  private async runQualityPipeline(
    slides: Slide[],
    snippets: ResearchSnippet[],
    input: OrchestratorInput
  ): Promise<{ checks: QualityCheck[]; scores: Record<string, number> }> {
    const checks: QualityCheck[] = [];
    const scores: Record<string, number> = {};

    const qualityPromises = [
      // Copy Tightening (modifies slide content)
      this.executeAgent('copy-tightener', {
        slides,
        audience: input.audience,
        tone: input.tone,
      }, input.policy).then((result: any) => {
        if (result?.slides) Object.assign(slides, result.slides);
        return { type: 'consistency', score: result?.qualityScore ?? 0.75 };
      }).catch(err => {
        console.warn('[Orchestrator] Copy tightening failed:', err);
        return { type: 'consistency', score: 0.5 };
      }),

      // Fact Checking
      this.executeAgent('fact-checker', {
        slides,
        researchSnippets: snippets,
      }, input.policy).then((result: any) => {
        if (result?.checks) checks.push(...result.checks);
        return { type: 'factCheck', score: result?.overallScore ?? 0.75 };
      }).catch(err => {
        console.warn('[Orchestrator] Fact checking failed:', err);
        return { type: 'factCheck', score: 0.5 };
      }),

      // Accessibility Linting
      this.executeAgent('accessibility-linter', {
        deck: { slides, title: input.topic },
        theme: input.theme || 'professional',
        themeTokens: {
          colors: { primary: '#1a1a2e', background: '#ffffff', text: '#000000' },
          typography: { bodySize: '14px', headingSize: '24px' },
          spacing: { slide: '40px' },
        },
      }, input.policy).then((result: any) => {
        return { type: 'accessibility', score: result ? this.accessibilityScore(result) : 0.75 };
      }).catch(err => {
        console.warn('[Orchestrator] Accessibility checking failed:', err);
        return { type: 'accessibility', score: 0.5 };
      }),

      // Readability Analysis
      this.executeAgent('readability-analyzer', {
        slides,
        audience: input.audience,
      }, input.policy).then((result: any) => {
        return { type: 'readability', score: result?.overallScore ?? 0.75 };
      }).catch(err => {
        console.warn('[Orchestrator] Readability analysis failed:', err);
        return { type: 'readability', score: 0.5 };
      }),
    ];

    const results = await Promise.all(qualityPromises);
    results.forEach(({ type, score }) => { scores[type] = score; });

    return { checks, scores };
  }

  /** Derive a 0-1 accessibility score from the linter output */
  private accessibilityScore(result: AccessibilityOutput): number {
    const total = result.metadata.totalIssues;
    if (total === 0) return 1.0;
    const criticalWeight = result.metadata.criticalIssues * 0.3;
    const warningWeight = result.metadata.warningIssues * 0.1;
    const penalty = Math.min(criticalWeight + warningWeight, 1.0);
    return Math.max(0, 1.0 - penalty);
  }

  // ============================================================================
  // SPEAKER NOTES GENERATION
  // ============================================================================

  private async generateSpeakerNotes(
    slides: Slide[],
    input: OrchestratorInput,
    estimatedDuration?: number
  ): Promise<SpeakerNotesOutput | null> {
    try {
      const result = await this.executeAgent('speaker-notes-generator', {
        slides,
        audience: input.audience,
        tone: input.tone,
        estimatedDuration: estimatedDuration || input.duration || 15,
        purpose: `Presentation on "${input.topic}" for ${input.audience}`,
      }, input.policy) as SpeakerNotesOutput;
      return result;
    } catch (err) {
      console.warn('[Orchestrator] Speaker notes generation failed:', err);
      return null;
    }
  }

  /** Overwrite each slide's .notes with the richer speaker note content */
  private enrichSlidesWithNotes(slides: Slide[], speakerNotes: SpeakerNotesOutput): void {
    const noteMap = new Map(speakerNotes.notes.map(n => [n.slideId, n]));
    slides.forEach(slide => {
      const note = noteMap.get(slide.id);
      if (note) {
        slide.notes = [
          note.notes,
          note.keyPoints.length ? `Key points: ${note.keyPoints.join(' | ')}` : '',
          note.transitions.length ? `Transition: ${note.transitions[0]}` : '',
          `Timing: ${note.timing} (~${note.duration})`,
        ].filter(Boolean).join('\n\n');
      }
    });
  }

  // ============================================================================
  // EXECUTIVE SUMMARY GENERATION
  // ============================================================================

  private async generateExecutiveSummary(
    deck: Deck,
    input: OrchestratorInput
  ): Promise<ExecutiveSummaryOutput> {
    return await this.executeAgent('executive-summary', {
      deck,
      audience: input.audience,
      tone: input.tone,
    }, 'quality') as ExecutiveSummaryOutput;
  }

  // ============================================================================
  // AUDIENCE ADAPTATION (in-pipeline)
  // ============================================================================

  private async adaptForAudienceInPipeline(
    deck: Deck,
    input: OrchestratorInput
  ): Promise<AudienceAdapterOutput> {
    return await this.executeAgent('audience-adapter', {
      deck,
      originalAudience: input.audience,
      targetAudience: input.targetAudience!,
      originalTone: input.tone,
      targetTone: input.targetTone || input.tone,
      originalDuration: input.duration || 15,
      targetDuration: input.targetDuration || input.duration || 15,
    }, 'balanced') as AudienceAdapterOutput;
  }

  /** Public convenience method (unchanged API) */
  async adaptForAudience(
    deck: Deck,
    targetAudience: string,
    targetDuration?: number
  ): Promise<AudienceAdaptation> {
    const result = await this.executeAgent('audience-adapter', {
      deck,
      originalAudience: deck.meta.audience,
      targetAudience,
      originalTone: deck.meta.tone,
      targetTone: deck.meta.tone,
      originalDuration: deck.meta.duration || 15,
      targetDuration: targetDuration || deck.meta.duration || 15,
    }, 'balanced') as any;
    return result;
  }

  // ============================================================================
  // AGENT EXECUTION
  // ============================================================================

  private async executeAgent(agentType: string, input: unknown, policy?: string): Promise<unknown> {
    const context: TaskContext = {
      priority: (policy as TaskContext['priority']) || 'balanced',
      localOnly: policy === 'local-only',
    };

    console.log(`[Orchestrator] Executing agent: ${agentType}`);

    const agent = this.agents.get(agentType);
    if (!agent) {
      throw new Error(
        `Agent not found: ${agentType}. Available: ${Array.from(this.agents.keys()).join(', ')}`
      );
    }

    const model = this.router.selectModel(agentType, context, policy);
    if (!model) {
      throw new Error(`No available model for agent: ${agentType}`);
    }

    agent.setModel(model);
    return await agent.execute(input, context);
  }

  // ============================================================================
  // DECK ASSEMBLY
  // ============================================================================

  private assembleDeck(
    outline: DeckOutline,
    slides: Slide[],
    snippets: ResearchSnippet[],
    input: OrchestratorInput,
    qualityScores: Record<string, number>
  ): Deck {
    const titleSlide: Slide = {
      id: 'title-slide',
      layout: 'title',
      blocks: [
        { type: 'Heading', text: outline.title, level: 1, animation: 'fadeIn' },
        { type: 'Subheading', text: outline.subtitle || '', animation: 'slideInFromBottom' },
      ],
      notes: `Welcome to "${outline.title}". Today we'll cover ${outline.sections.length} key areas.`,
      order: 0,
    };

    const agendaSlide: Slide = {
      id: 'agenda-slide',
      layout: 'title+bullets',
      blocks: [
        { type: 'Heading', text: 'Agenda', level: 1, animation: 'slideInFromTop' },
        { type: 'Bullets', items: outline.sections.map(s => s.title), animation: 'staggerIn' },
      ],
      notes: "Here's what we'll cover today. Each section builds on the previous one.",
      order: 1,
    };

    const conclusionSlide: Slide = {
      id: 'conclusion-slide',
      layout: 'title+bullets',
      blocks: [
        { type: 'Heading', text: 'Conclusion', level: 1, animation: 'fadeIn' },
        {
          type: 'Bullets',
          items: [
            'Key takeaways from our discussion',
            'Next steps and recommendations',
            'Questions and discussion',
          ],
          animation: 'staggerIn',
        },
      ],
      notes: outline.conclusion,
      order: slides.length + 2,
    };

    const allSlides = [titleSlide, agendaSlide, ...slides, conclusionSlide];

    if (outline.references.length > 0) {
      allSlides.push({
        id: 'references-slide',
        layout: 'title+bullets',
        blocks: [
          { type: 'Heading', text: 'References', level: 1, animation: 'fadeIn' },
          { type: 'Bullets', items: outline.references, animation: 'staggerIn' },
        ],
        notes: 'Sources and references used in this presentation.',
        order: slides.length + 3,
      });
    }

    allSlides.forEach((slide, index) => { slide.order = index; });

    return {
      id: `deck-${Date.now()}`,
      meta: {
        title: outline.title,
        subtitle: outline.subtitle,
        author: 'AI Slide Maker',
        date: new Date().toISOString().split('T')[0],
        audience: input.audience,
        tone: input.tone,
        theme: input.theme || 'professional',
        duration: outline.estimatedDuration,
        wordCount: outline.wordCount,
      },
      slides: allSlides,
      researchSnippets: snippets,
      quality: {
        factCheckScore: qualityScores.factCheck ?? 0.75,
        accessibilityScore: qualityScores.accessibility ?? 0.75,
        readabilityScore: qualityScores.readability ?? 0.75,
        consistencyScore: qualityScores.consistency ?? 0.75,
      },
    };
  }

  // ============================================================================
  // METADATA CALCULATION
  // ============================================================================

  private calculateMetadata(
    processingTime: number,
    qualityScores: Record<string, number>
  ): OrchestratorOutput['metadata'] {
    return {
      totalTokens: 0,
      totalCost: 0,
      processingTime,
      qualityScores: {
        factCheck: qualityScores.factCheck ?? 0.75,
        accessibility: qualityScores.accessibility ?? 0.75,
        readability: qualityScores.readability ?? 0.75,
        consistency: qualityScores.consistency ?? 0.75,
      },
    };
  }

  // ============================================================================
  // AGENT INITIALIZATION
  // ============================================================================

  private async initializeAgents(): Promise<void> {
    console.log('[Orchestrator] Initializing agents...');

    try {
      const [
        { ResearcherAgent },
        { StructurerAgent },
        { SlidewriterAgent },
        { CopyTightenerAgent },
        { FactCheckerAgent },
        { DataVizPlannerAgent },
        { MediaFinderAgent },
        { SpeakerNotesGeneratorAgent },
        { AccessibilityLinterAgent },
        { LiveWidgetPlannerAgent },
        { ExecutiveSummaryAgent },
        { AudienceAdapterAgent },
        { ReadabilityAnalyzerAgent },
      ] = await Promise.all([
        import('./agents/researcher'),
        import('./agents/structurer'),
        import('./agents/slidewriter'),
        import('./agents/copy-tightener'),
        import('./agents/fact-checker'),
        import('./agents/data-viz-planner'),
        import('./agents/media-finder'),
        import('./agents/speaker-notes-generator'),
        import('./agents/accessibility-linter'),
        import('./agents/live-widget-planner'),
        import('./agents/executive-summary'),
        import('./agents/audience-adapter'),
        import('./agents/readability-analyzer'),
      ]);

      const agentPairs: [string, BaseAgent][] = [
        ['researcher', new ResearcherAgent()],
        ['structurer', new StructurerAgent()],
        ['slidewriter', new SlidewriterAgent()],
        ['copy-tightener', new CopyTightenerAgent()],
        ['fact-checker', new FactCheckerAgent()],
        ['data-viz-planner', new DataVizPlannerAgent()],
        ['media-finder', new MediaFinderAgent()],
        ['speaker-notes-generator', new SpeakerNotesGeneratorAgent()],
        ['accessibility-linter', new AccessibilityLinterAgent()],
        ['live-widget-planner', new LiveWidgetPlannerAgent()],
        ['executive-summary', new ExecutiveSummaryAgent()],
        ['audience-adapter', new AudienceAdapterAgent()],
        ['readability-analyzer', new ReadabilityAnalyzerAgent()],
      ];

      for (const [name, agent] of agentPairs) {
        agent.setRouter(this.router);
        this.agents.set(name, agent);
      }

      console.log(`[Orchestrator] Initialized ${this.agents.size} agents`);
      this.isInitialized = true;
    } catch (error) {
      console.error('[Orchestrator] Failed to initialize agents:', error);
      this.isInitialized = false;
      throw new Error('Agent initialization failed');
    }
  }

  // ============================================================================
  // MONITORING & METRICS
  // ============================================================================

  getTaskHistory(): Map<string, unknown> {
    return this.taskHistory;
  }

  getAgentStatus(): Map<string, unknown> {
    const status = new Map();
    for (const [name, agent] of this.agents) {
      status.set(name, {
        name: agent.config.name,
        description: agent.config.description,
        capabilities: agent.config.capabilities,
      });
    }
    return status;
  }

  getRouterStatus(): unknown {
    return {
      models: this.router.listModels().length,
      policies: ['quality', 'speed', 'cost', 'balanced', 'local-only'],
      queueStatus: this.router.getQueueStatus(),
    };
  }
}
