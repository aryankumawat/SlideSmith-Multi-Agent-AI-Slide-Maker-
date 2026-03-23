import { BaseAgent, AgentConfig } from '../base-agent';
import { AccessibilityInput, AccessibilityOutput, AccessibilityIssue, AccessibilityFix } from '../schemas';

// ============================================================================
// ACCESSIBILITY LINTER AGENT — WCAG AA + DESIGN BEST PRACTICES
// ============================================================================

// Rules that can be auto-fixed without LLM assistance
const AUTO_FIX_RULES: Record<string, {
  check: (deck: any) => { slideId: string; element: string; description: string; impact: string }[];
  fix: (deck: any, slideId: string, element: string) => string;
}> = {
  'title-too-long': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        const heading = slide.blocks?.find((b: any) => b.type === 'Heading');
        if (heading?.text) {
          const words = heading.text.trim().split(/\s+/).length;
          if (words > 8) {
            issues.push({
              slideId: slide.id,
              element: 'Heading',
              description: `Title has ${words} words (max 8): "${heading.text}"`,
              impact: 'Long titles reduce scannability and overflow on small screens',
            });
          }
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Truncate title to ≤8 words. Keep the most specific/impactful words.';
    },
  },

  'too-many-bullets': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        const bullets = slide.blocks?.find((b: any) => b.type === 'Bullets');
        if (bullets?.items && bullets.items.length > 6) {
          issues.push({
            slideId: slide.id,
            element: 'Bullets',
            description: `${bullets.items.length} bullets on one slide (max 6)`,
            impact: 'Audiences cannot absorb >6 items; excess bullets reduce retention',
          });
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Split bullets across two slides or group into 2-3 categories.';
    },
  },

  'bullet-too-long': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        const bullets = slide.blocks?.find((b: any) => b.type === 'Bullets');
        if (bullets?.items) {
          for (const item of bullets.items) {
            const words = item.trim().split(/\s+/).length;
            if (words > 12) {
              issues.push({
                slideId: slide.id,
                element: 'Bullets',
                description: `Bullet has ${words} words (max 12): "${item.slice(0, 60)}…"`,
                impact: 'Long bullets force the audience to read, killing presenter authority',
              });
            }
          }
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Shorten bullet to ≤12 words. Move detail to speaker notes.';
    },
  },

  'missing-alt-text': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        for (const block of slide.blocks || []) {
          if (block.type === 'Image' && (!block.alt || block.alt.trim().length === 0)) {
            issues.push({
              slideId: slide.id,
              element: 'Image',
              description: `Image block missing alt text (src: ${block.src?.slice(0, 60) || 'unknown'})`,
              impact: 'Screen reader users cannot understand the image content',
            });
          }
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Add descriptive alt text. Describe function, not just appearance.';
    },
  },

  'heading-hierarchy': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        const headings = slide.blocks?.filter((b: any) => b.type === 'Heading') || [];
        if (headings.length > 1) {
          const levels = headings.map((h: any) => h.level || 1);
          for (let i = 1; i < levels.length; i++) {
            if (levels[i] <= levels[i - 1]) {
              issues.push({
                slideId: slide.id,
                element: 'Heading',
                description: `Heading level does not increase (H${levels[i - 1]} → H${levels[i]})`,
                impact: 'Incorrect heading hierarchy confuses screen readers and assistive technology',
              });
              break;
            }
          }
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Ensure heading levels increase sequentially (H1 → H2 → H3). Do not skip levels.';
    },
  },

  'empty-slide': {
    check(deck) {
      const issues = [];
      for (const slide of deck.slides || []) {
        const hasContent = slide.blocks?.some((b: any) =>
          (b.type === 'Heading' && b.text?.trim()) ||
          (b.type === 'Bullets' && b.items?.length > 0) ||
          (b.type === 'Markdown' && b.md?.trim())
        );
        if (!hasContent) {
          issues.push({
            slideId: slide.id,
            element: 'Slide',
            description: 'Slide has no text content',
            impact: 'Empty slides disorient audiences and waste presentation time',
          });
        }
      }
      return issues;
    },
    fix(deck, slideId, element) {
      return 'Add a heading or remove the slide entirely.';
    },
  },
};

export class AccessibilityLinterAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'accessibility-linter',
      description: 'Audits a slide deck for WCAG AA compliance and design best practices; auto-fixes common rule violations',
      capabilities: ['accessibility-audit', 'design-review', 'wcag-compliance', 'auto-fix'],
      maxRetries: 3,
      timeout: 30000,
    };
    super(config);
  }

  async execute(input: AccessibilityInput, context?: unknown): Promise<AccessibilityOutput> {
    try {
      console.log(`[${this.config.name}] Starting accessibility audit...`);

      // Run deterministic rule-based checks (fast, always auto-fixable)
      const ruleIssues = this.runRuleBasedChecks(input.deck);

      // Run LLM-based checks for nuanced issues (contrast, reading level, navigation)
      const llmIssues = await this.auditWithLLM(input);

      const allIssues = [...ruleIssues.issues, ...llmIssues];

      // Generate fixes: rule-based are auto-fixable; LLM issues get LLM fixes
      const ruleFixes = ruleIssues.fixes;
      const llmFixes = await this.generateLLMFixes(input, llmIssues);

      const allFixes = [...ruleFixes, ...llmFixes];

      const output: AccessibilityOutput = {
        issues: allIssues,
        fixes: allFixes,
        metadata: {
          totalIssues: allIssues.length,
          criticalIssues: allIssues.filter(i => i.severity === 'critical').length,
          warningIssues: allIssues.filter(i => i.severity === 'warning').length,
          infoIssues: allIssues.filter(i => i.severity === 'info').length,
          autoFixable: allFixes.filter(f => f.autoFixable).length,
        },
      };

      console.log(
        `[${this.config.name}] Found ${allIssues.length} issues (${output.metadata.autoFixable} auto-fixable)`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  // ============================================================================
  // RULE-BASED CHECKS (deterministic, all auto-fixable)
  // ============================================================================

  private runRuleBasedChecks(deck: any): {
    issues: AccessibilityIssue[];
    fixes: AccessibilityFix[];
  } {
    const issues: AccessibilityIssue[] = [];
    const fixes: AccessibilityFix[] = [];

    const ruleSeverity: Record<string, AccessibilityIssue['severity']> = {
      'title-too-long': 'warning',
      'too-many-bullets': 'warning',
      'bullet-too-long': 'warning',
      'missing-alt-text': 'critical',
      'heading-hierarchy': 'warning',
      'empty-slide': 'critical',
    };

    for (const [ruleId, rule] of Object.entries(AUTO_FIX_RULES)) {
      const ruleMatches = rule.check(deck);
      for (const match of ruleMatches) {
        const issueId = `${match.slideId}_${ruleId}`;
        issues.push({
          type: ruleId.includes('alt') || ruleId.includes('heading') ? 'structure' : 'content',
          severity: ruleSeverity[ruleId] || 'warning',
          slideId: match.slideId,
          element: match.element,
          description: match.description,
          impact: match.impact,
          wcagLevel: ruleId === 'missing-alt-text' ? 'AA' : 'AA',
        });
        fixes.push({
          issueId,
          description: rule.fix(deck, match.slideId, match.element),
          autoFixable: true,
          priority: ruleSeverity[ruleId] === 'critical' ? 'high' : 'medium',
          effort: 'quick',
          code: null,
          explanation: `Rule "${ruleId}" violation — this can be corrected automatically.`,
        });
      }
    }

    return { issues, fixes };
  }

  // ============================================================================
  // LLM-BASED CHECKS (contrast, reading level, navigation)
  // ============================================================================

  private async auditWithLLM(input: AccessibilityInput): Promise<AccessibilityIssue[]> {
    const prompt = this.buildLLMAuditPrompt(input);
    const response = await this.callLLM(prompt);
    return this.parseAccessibilityIssues(response.content);
  }

  private buildLLMAuditPrompt(input: AccessibilityInput): string {
    const slideCount = input.deck?.slides?.length ?? 0;
    return `You are a WCAG 2.1 accessibility expert. Audit this slide deck for issues that CANNOT be caught by simple rules.

Deck: ${input.deck?.title || 'Untitled'} (${slideCount} slides)
Theme: ${input.theme}
Colors: ${JSON.stringify(input.themeTokens?.colors || {})}
Typography: ${JSON.stringify(input.themeTokens?.typography || {})}

Focus ONLY on these nuanced issues (skip title length, bullet count — those are handled):
1. Color contrast ratio below 4.5:1 (WCAG AA) — check text vs background
2. Reading level above grade 10 (too complex for broad audiences)
3. Jargon without explanation for non-specialist audiences
4. Missing logical navigation / slide flow gaps
5. Decorative elements that may confuse screen readers

For each issue, return JSON:
[
  {
    "type": "contrast|typography|structure|content|navigation",
    "severity": "critical|warning|info",
    "slideId": "slide-id or 'all'",
    "element": "specific element",
    "description": "what is wrong",
    "impact": "how it affects users",
    "wcagLevel": "AA"
  }
]

Return empty array [] if no issues found. Return JSON only.`;
  }

  private async generateLLMFixes(
    input: AccessibilityInput,
    issues: AccessibilityIssue[]
  ): Promise<AccessibilityFix[]> {
    if (issues.length === 0) return [];

    const prompt = `Generate fixes for these accessibility issues. Mark as autoFixable:true if the fix can be applied programmatically (e.g. a color value swap, a CSS change). Mark false if it needs human judgment.

Issues:
${issues.map((i, n) => `${n + 1}. [${i.severity}] ${i.description} (slide: ${i.slideId}, element: ${i.element})`).join('\n')}

Theme colors: ${JSON.stringify(input.themeTokens?.colors || {})}

Return JSON array only:
[
  {
    "issueId": "slideId_type",
    "description": "what to change",
    "autoFixable": true,
    "priority": "high|medium|low",
    "effort": "quick|moderate|extensive",
    "code": "CSS or value change if autoFixable, else null",
    "explanation": "why this fix works"
  }
]`;

    const response = await this.callLLM(prompt);
    return this.parseLLMFixes(response.content, issues);
  }

  private parseAccessibilityIssues(content: string): AccessibilityIssue[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map(issue => ({
          type: issue.type || 'content',
          severity: issue.severity || 'warning',
          slideId: issue.slideId || 'unknown',
          element: issue.element || 'unknown',
          description: issue.description || 'Accessibility issue',
          impact: issue.impact || 'May affect user experience',
          wcagLevel: issue.wcagLevel || 'AA',
        }));
      }

      return [];
    } catch {
      return [];
    }
  }

  private parseLLMFixes(content: string, issues: AccessibilityIssue[]): AccessibilityFix[] {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.map((fix, i) => ({
          issueId: fix.issueId || `${issues[i]?.slideId || 'unknown'}_${issues[i]?.type || 'issue'}`,
          description: fix.description || 'Fix for accessibility issue',
          autoFixable: fix.autoFixable === true,
          priority: fix.priority || 'medium',
          effort: fix.effort || 'moderate',
          code: fix.code || null,
          explanation: fix.explanation || 'Improves accessibility',
        }));
      }
    } catch {
      // Fallback: create manual-fix entries for each issue
    }

    return issues.map(issue => ({
      issueId: `${issue.slideId}_${issue.type}`,
      description: 'Manual review required',
      autoFixable: false,
      priority: issue.severity === 'critical' ? 'high' : 'medium',
      effort: 'moderate',
      code: null,
      explanation: 'Please review and fix manually',
    }));
  }
}
