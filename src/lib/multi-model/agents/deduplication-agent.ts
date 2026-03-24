import { BaseAgent, AgentConfig } from '../base-agent';
import { Slide, QualityCheck } from '../schemas';

// ============================================================================
// DEDUPLICATION & COHERENCE AGENT
// Runs post-assembly on the full deck. Detects duplicate content, repeated
// statistics, contradictory claims, and thematic drift across slides.
// ============================================================================

export interface DeduplicationInput {
  slides: Slide[];
  topic: string;
  audience: string;
}

export interface DuplicateIssue {
  type: 'duplicate-content' | 'repeated-statistic' | 'contradictory-claim' | 'thematic-drift';
  severity: 'low' | 'medium' | 'high';
  slideIds: string[];
  description: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface DeduplicationOutput {
  issues: DuplicateIssue[];
  coherenceScore: number; // 0–1
  qualityChecks: QualityCheck[];
  metadata: {
    totalIssues: number;
    duplicateContentCount: number;
    repeatedStatCount: number;
    contradictionCount: number;
    thematicDriftCount: number;
  };
}

export class DeduplicationAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'deduplication',
      description: 'Scans the full assembled deck for duplicate content, repeated statistics, contradictory claims, and thematic drift',
      capabilities: ['deduplication', 'coherence-check', 'consistency-analysis'],
      maxRetries: 2,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: DeduplicationInput, context?: unknown): Promise<DeduplicationOutput> {
    try {
      console.log(`[${this.config.name}] Scanning ${input.slides.length} slides for duplicates and coherence issues...`);

      const issues = await this.analyzeCoherence(input);
      const qualityChecks = this.toQualityChecks(issues);
      const coherenceScore = this.calculateCoherenceScore(issues, input.slides.length);

      const output: DeduplicationOutput = {
        issues,
        coherenceScore,
        qualityChecks,
        metadata: {
          totalIssues: issues.length,
          duplicateContentCount: issues.filter(i => i.type === 'duplicate-content').length,
          repeatedStatCount: issues.filter(i => i.type === 'repeated-statistic').length,
          contradictionCount: issues.filter(i => i.type === 'contradictory-claim').length,
          thematicDriftCount: issues.filter(i => i.type === 'thematic-drift').length,
        },
      };

      console.log(
        `[${this.config.name}] Found ${issues.length} issues — coherence score: ${(coherenceScore * 100).toFixed(0)}%`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async analyzeCoherence(input: DeduplicationInput): Promise<DuplicateIssue[]> {
    const slideSummaries = input.slides.map(slide => {
      const texts = slide.blocks.map(block => {
        if (block.type === 'Heading' || block.type === 'Subheading' || block.type === 'Quote') return block.text;
        if (block.type === 'Bullets') return block.items.join('; ');
        if (block.type === 'Markdown') return block.md;
        if (block.type === 'Code') return block.code;
        return '';
      }).filter(Boolean).join(' | ');
      return `Slide[${slide.id}] layout=${slide.layout}: ${texts}`;
    }).join('\n');

    const prompt = `You are a presentation coherence auditor. Analyze this full deck for issues.

Topic: ${input.topic}
Audience: ${input.audience}

All slides:
${slideSummaries}

Find these issues:
1. **duplicate-content**: Two or more slides say essentially the same thing
2. **repeated-statistic**: The same number/percentage/metric appears on multiple slides
3. **contradictory-claim**: One slide says X, another says not-X or a conflicting figure
4. **thematic-drift**: A slide doesn't connect to the overall topic or its section

For each issue assign severity:
- high: contradictions, or exact duplicate slides
- medium: repeated stats, or near-duplicate paragraphs
- low: minor thematic drift, or similar phrasing (not a real problem)

Return JSON only:
[
  {
    "type": "duplicate-content",
    "severity": "medium",
    "slideIds": ["slide-id-1", "slide-id-2"],
    "description": "Both slides present the same market growth data",
    "suggestion": "Merge into one slide or differentiate the angle",
    "autoFixable": false
  }
]

If no issues found, return an empty array [].`;

    const response = await this.callLLM(prompt);
    return this.parseIssues(response.content);
  }

  private parseIssues(content: string): DuplicateIssue[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(item => ({
          type: this.validateIssueType(item.type),
          severity: (['low', 'medium', 'high'].includes(item.severity) ? item.severity : 'low') as 'low' | 'medium' | 'high',
          slideIds: Array.isArray(item.slideIds) ? item.slideIds : [],
          description: item.description || '',
          suggestion: item.suggestion || '',
          autoFixable: item.autoFixable === true,
        }));
      }
      return [];
    } catch {
      console.warn(`[${this.config.name}] Failed to parse coherence analysis — returning clean`);
      return [];
    }
  }

  private validateIssueType(type: string): DuplicateIssue['type'] {
    const valid: DuplicateIssue['type'][] = ['duplicate-content', 'repeated-statistic', 'contradictory-claim', 'thematic-drift'];
    return valid.includes(type as DuplicateIssue['type']) ? (type as DuplicateIssue['type']) : 'duplicate-content';
  }

  private toQualityChecks(issues: DuplicateIssue[]): QualityCheck[] {
    return issues.map((issue, idx) => ({
      id: `dedup-${idx}`,
      type: 'consistency' as const,
      severity: issue.severity,
      message: `[${issue.type}] ${issue.description}`,
      slideId: issue.slideIds[0],
      suggestion: issue.suggestion,
      autoFixable: issue.autoFixable,
    }));
  }

  private calculateCoherenceScore(issues: DuplicateIssue[], slideCount: number): number {
    if (issues.length === 0) return 1.0;
    const weights = { high: 0.25, medium: 0.1, low: 0.03 };
    const penalty = issues.reduce((sum, i) => sum + (weights[i.severity] || 0.05), 0);
    return Math.max(0, Math.min(1, 1 - penalty));
  }
}
