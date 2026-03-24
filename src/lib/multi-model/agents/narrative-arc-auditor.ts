import { BaseAgent, AgentConfig } from '../base-agent';
import { Slide, QualityCheck } from '../schemas';

// ============================================================================
// NARRATIVE ARC AUDITOR
// Runs post-assembly on the full deck. Evaluates whether the presentation
// tells a compelling story: hook → tension → evidence → resolution → CTA.
// Flags weak transitions, missing story beats, and pacing issues.
// ============================================================================

export interface NarrativeArcInput {
  slides: Slide[];
  topic: string;
  audience: string;
  tone: string;
}

export interface StoryBeat {
  name: 'hook' | 'context' | 'tension' | 'evidence' | 'resolution' | 'call-to-action';
  present: boolean;
  slideId?: string;
  strength: number; // 0–1
  feedback: string;
}

export interface TransitionIssue {
  fromSlideId: string;
  toSlideId: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface NarrativeArcOutput {
  storyBeats: StoryBeat[];
  transitionIssues: TransitionIssue[];
  overallNarrativeScore: number; // 0–1
  pacingScore: number; // 0–1
  qualityChecks: QualityCheck[];
  summary: string; // 1-2 sentence overall verdict
  metadata: {
    totalSlides: number;
    missingBeats: string[];
    weakTransitions: number;
    strongSections: string[];
  };
}

export class NarrativeArcAuditorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'narrative-arc-auditor',
      description: 'Evaluates the full deck for narrative flow, story beats, transitions, and pacing',
      capabilities: ['narrative-analysis', 'story-structure', 'pacing-audit'],
      maxRetries: 2,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: NarrativeArcInput, context?: unknown): Promise<NarrativeArcOutput> {
    try {
      console.log(`[${this.config.name}] Auditing narrative arc across ${input.slides.length} slides...`);

      const analysis = await this.analyzeNarrative(input);
      const qualityChecks = this.buildQualityChecks(analysis);

      const output: NarrativeArcOutput = {
        ...analysis,
        qualityChecks,
      };

      console.log(
        `[${this.config.name}] Narrative score: ${(analysis.overallNarrativeScore * 100).toFixed(0)}% — ` +
        `pacing: ${(analysis.pacingScore * 100).toFixed(0)}% — ` +
        `missing beats: ${analysis.metadata.missingBeats.length}`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async analyzeNarrative(input: NarrativeArcInput): Promise<Omit<NarrativeArcOutput, 'qualityChecks'>> {
    const slideSummaries = input.slides.map(slide => {
      const texts = slide.blocks.map(block => {
        if (block.type === 'Heading' || block.type === 'Subheading' || block.type === 'Quote') return block.text;
        if (block.type === 'Bullets') return block.items.join('; ');
        if (block.type === 'Markdown') return block.md;
        return '';
      }).filter(Boolean).join(' | ');
      return `Slide[${slide.id}] layout=${slide.layout}: ${texts}`;
    }).join('\n');

    const prompt = `You are a presentation storytelling expert. Analyze this deck's narrative arc.

Topic: ${input.topic}
Audience: ${input.audience}
Tone: ${input.tone}

All slides (in order):
${slideSummaries}

Evaluate the deck against the classic presentation story arc:
1. **hook** — Does the opening grab attention? (surprise, question, bold statement)
2. **context** — Is the problem/situation established clearly?
3. **tension** — Is there a challenge, gap, or conflict that creates stakes?
4. **evidence** — Are claims backed by data, examples, or proof?
5. **resolution** — Is there a clear answer, solution, or insight?
6. **call-to-action** — Does it end with a clear next step or ask?

Also check:
- **Transitions**: Do consecutive slides flow logically? Flag abrupt jumps.
- **Pacing**: Is the deck front-heavy, back-heavy, or well-distributed?

Return JSON only:
{
  "storyBeats": [
    { "name": "hook", "present": true, "slideId": "slide-id", "strength": 0.8, "feedback": "Strong opening question" },
    { "name": "context", "present": true, "slideId": "slide-id", "strength": 0.6, "feedback": "..." },
    { "name": "tension", "present": false, "slideId": null, "strength": 0.0, "feedback": "No clear problem statement" },
    { "name": "evidence", "present": true, "slideId": "slide-id", "strength": 0.9, "feedback": "..." },
    { "name": "resolution", "present": true, "slideId": "slide-id", "strength": 0.7, "feedback": "..." },
    { "name": "call-to-action", "present": false, "slideId": null, "strength": 0.0, "feedback": "Ends without a clear CTA" }
  ],
  "transitionIssues": [
    { "fromSlideId": "slide-1", "toSlideId": "slide-2", "severity": "medium", "description": "Abrupt topic shift", "suggestion": "Add a bridging sentence" }
  ],
  "overallNarrativeScore": 0.65,
  "pacingScore": 0.7,
  "summary": "The deck has strong evidence but lacks a clear hook and CTA. The middle section drags.",
  "metadata": {
    "totalSlides": ${input.slides.length},
    "missingBeats": ["hook", "call-to-action"],
    "weakTransitions": 2,
    "strongSections": ["evidence"]
  }
}`;

    const response = await this.callLLM(prompt);
    return this.parseAnalysis(response.content, input.slides.length);
  }

  private parseAnalysis(content: string, slideCount: number): Omit<NarrativeArcOutput, 'qualityChecks'> {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const storyBeats: StoryBeat[] = (parsed.storyBeats || []).map((beat: any) => ({
        name: this.validateBeatName(beat.name),
        present: beat.present === true,
        slideId: beat.slideId || undefined,
        strength: Math.min(1, Math.max(0, beat.strength || 0)),
        feedback: beat.feedback || '',
      }));

      const transitionIssues: TransitionIssue[] = (parsed.transitionIssues || []).map((t: any) => ({
        fromSlideId: t.fromSlideId || '',
        toSlideId: t.toSlideId || '',
        severity: (['low', 'medium', 'high'].includes(t.severity) ? t.severity : 'low') as 'low' | 'medium' | 'high',
        description: t.description || '',
        suggestion: t.suggestion || '',
      }));

      const missingBeats = storyBeats.filter(b => !b.present).map(b => b.name);

      return {
        storyBeats,
        transitionIssues,
        overallNarrativeScore: Math.min(1, Math.max(0, parsed.overallNarrativeScore || 0.5)),
        pacingScore: Math.min(1, Math.max(0, parsed.pacingScore || 0.5)),
        summary: parsed.summary || 'Narrative analysis completed.',
        metadata: {
          totalSlides: slideCount,
          missingBeats,
          weakTransitions: transitionIssues.length,
          strongSections: parsed.metadata?.strongSections || [],
        },
      };
    } catch {
      console.warn(`[${this.config.name}] Failed to parse narrative analysis — returning defaults`);
      return this.defaultOutput(slideCount);
    }
  }

  private validateBeatName(name: string): StoryBeat['name'] {
    const valid: StoryBeat['name'][] = ['hook', 'context', 'tension', 'evidence', 'resolution', 'call-to-action'];
    return valid.includes(name as StoryBeat['name']) ? (name as StoryBeat['name']) : 'context';
  }

  private buildQualityChecks(analysis: Omit<NarrativeArcOutput, 'qualityChecks'>): QualityCheck[] {
    const checks: QualityCheck[] = [];

    // Missing story beats
    analysis.storyBeats.filter(b => !b.present).forEach((beat, idx) => {
      checks.push({
        id: `narrative-missing-${idx}`,
        type: 'consistency',
        severity: beat.name === 'hook' || beat.name === 'call-to-action' ? 'high' : 'medium',
        message: `Missing story beat: ${beat.name} — ${beat.feedback}`,
        suggestion: `Add a ${beat.name} element to strengthen the narrative`,
        autoFixable: false,
      });
    });

    // Weak story beats
    analysis.storyBeats.filter(b => b.present && b.strength < 0.4).forEach((beat, idx) => {
      checks.push({
        id: `narrative-weak-${idx}`,
        type: 'consistency',
        severity: 'medium',
        message: `Weak story beat: ${beat.name} (${(beat.strength * 100).toFixed(0)}%) — ${beat.feedback}`,
        slideId: beat.slideId,
        suggestion: `Strengthen the ${beat.name} on this slide`,
        autoFixable: false,
      });
    });

    // Transition issues
    analysis.transitionIssues.forEach((issue, idx) => {
      checks.push({
        id: `narrative-transition-${idx}`,
        type: 'consistency',
        severity: issue.severity,
        message: `Transition issue: ${issue.description}`,
        slideId: issue.fromSlideId,
        suggestion: issue.suggestion,
        autoFixable: false,
      });
    });

    return checks;
  }

  private defaultOutput(slideCount: number): Omit<NarrativeArcOutput, 'qualityChecks'> {
    return {
      storyBeats: [
        { name: 'hook', present: true, strength: 0.5, feedback: 'Could not fully analyze' },
        { name: 'context', present: true, strength: 0.5, feedback: 'Could not fully analyze' },
        { name: 'tension', present: false, strength: 0, feedback: 'Could not determine' },
        { name: 'evidence', present: true, strength: 0.6, feedback: 'Content present' },
        { name: 'resolution', present: true, strength: 0.5, feedback: 'Could not fully analyze' },
        { name: 'call-to-action', present: false, strength: 0, feedback: 'Could not determine' },
      ],
      transitionIssues: [],
      overallNarrativeScore: 0.5,
      pacingScore: 0.5,
      summary: 'Narrative analysis could not be fully completed. Default scores applied.',
      metadata: {
        totalSlides: slideCount,
        missingBeats: ['tension', 'call-to-action'],
        weakTransitions: 0,
        strongSections: [],
      },
    };
  }
}
