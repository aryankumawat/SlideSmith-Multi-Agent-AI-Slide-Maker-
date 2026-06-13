import { BaseAgent, AgentConfig } from '../base-agent';
import { Slide, ResearchSnippet, QualityCheck } from '../schemas';
import { z } from 'zod';

// ============================================================================
// FACT CHECKER AGENT - REDUCE HALLUCINATIONS
// ============================================================================

export interface FactCheckerInput {
  slides: Slide[];
  researchSnippets: ResearchSnippet[];
  strictMode?: boolean;
}

export interface FactCheckerOutput {
  checks: QualityCheck[];
  overallScore: number;
  summary: {
    totalClaims: number;
    supportedClaims: number;
    unsupportedClaims: number;
    highSeverityIssues: number;
  };
}

export class FactCheckerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'fact-checker',
      description: 'Reduces hallucinations and ensures claims are supported by sources',
      capabilities: ['fact-verification', 'citation-mapping', 'claim-validation'],
      maxRetries: 2,
      timeout: 20000,
    };
    super(config);
  }

  async execute(input: FactCheckerInput, context?: unknown): Promise<FactCheckerOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!this.validateInput(input, this.getInputSchema())) {
        throw new Error('Invalid input for Fact Checker agent');
      }

      const checks: QualityCheck[] = [];
      let totalClaims = 0;
      let supportedClaims = 0;
      let unsupportedClaims = 0;
      let highSeverityIssues = 0;

      // Process each slide
      for (const slide of input.slides) {
        const slideChecks = await this.checkSlideFacts(slide, input.researchSnippets, input.strictMode);
        checks.push(...slideChecks);
        
        // Count claims
        const slideStats = this.countClaims(slide, slideChecks);
        totalClaims += slideStats.total;
        supportedClaims += slideStats.supported;
        unsupportedClaims += slideStats.unsupported;
        highSeverityIssues += slideStats.highSeverity;
      }

      // Calculate overall score
      const overallScore = this.calculateOverallScore(supportedClaims, totalClaims, highSeverityIssues);

      const output: FactCheckerOutput = {
        checks,
        overallScore,
        summary: {
          totalClaims,
          supportedClaims,
          unsupportedClaims,
          highSeverityIssues,
        },
      };

      const duration = Date.now() - startTime;
      this.logExecution('fact-checker-task', input, output, duration);

      return output;

    } catch (error) {
      this.handleError(error, { input, context });
    }
  }

  private async checkSlideFacts(
    slide: Slide, 
    snippets: ResearchSnippet[], 
    strictMode: boolean = false
  ): Promise<QualityCheck[]> {
    const checks: QualityCheck[] = [];
    
    // Extract claims from slide content
    const claims = this.extractClaims(slide);
    
    for (const claim of claims) {
      const check = await this.verifyClaim(claim, snippets, strictMode);
      if (check) {
        checks.push(check);
      }
    }

    // Check for missing citations
    const citationChecks = this.checkCitations(slide, snippets);
    checks.push(...citationChecks);

    return checks;
  }

  private extractClaims(slide: Slide): Array<{
    text: string;
    type: 'statistical' | 'factual' | 'claim' | 'opinion';
    blockId?: string;
    confidence: number;
  }> {
    const claims: Array<{
      text: string;
      type: 'statistical' | 'factual' | 'claim' | 'opinion';
      blockId?: string;
      confidence: number;
    }> = [];

    for (const block of slide.blocks) {
      if (block.type === 'Heading' && 'text' in block) {
        const claim = this.analyzeTextForClaims(block.text);
        if (claim) claims.push(claim);
      } else if (block.type === 'Subheading' && 'text' in block) {
        const claim = this.analyzeTextForClaims(block.text);
        if (claim) claims.push(claim);
      } else if (block.type === 'Bullets' && 'items' in block) {
        for (const item of block.items) {
          const claim = this.analyzeTextForClaims(item);
          if (claim) claims.push(claim);
        }
      }
    }

    return claims;
  }

  private analyzeTextForClaims(text: string, blockId?: string): {
    text: string;
    type: 'statistical' | 'factual' | 'claim' | 'opinion';
    blockId?: string;
    confidence: number;
  } | null {
    // Look for statistical claims (numbers, percentages, etc.)
    const statisticalPattern = /\b\d+%|\b\d+\.\d+%|\b\d+\s*(million|billion|thousand)|\b\d+\s*(times|fold)\b/i;
    if (statisticalPattern.test(text)) {
      return {
        text,
        type: 'statistical',
        blockId,
        confidence: 0.9,
      };
    }

    // Look for factual claims (definitive statements)
    const factualPattern = /\b(is|are|was|were|will be|has been|have been)\b.*\b(always|never|all|every|none|no)\b/i;
    if (factualPattern.test(text)) {
      return {
        text,
        type: 'factual',
        blockId,
        confidence: 0.8,
      };
    }

    // Look for general claims
    const claimPattern = /\b(leads to|causes|results in|increases|decreases|improves|reduces)\b/i;
    if (claimPattern.test(text)) {
      return {
        text,
        type: 'claim',
        blockId,
        confidence: 0.7,
      };
    }

    // Look for opinion statements
    const opinionPattern = /\b(believe|think|feel|suggest|recommend|should|must)\b/i;
    if (opinionPattern.test(text)) {
      return {
        text,
        type: 'opinion',
        blockId,
        confidence: 0.6,
      };
    }

    return null;
  }

  private async verifyClaim(
    claim: {
      text: string;
      type: string;
      blockId?: string;
      confidence: number;
    },
    snippets: ResearchSnippet[],
    strictMode: boolean
  ): Promise<QualityCheck | null> {
    // Find relevant snippets
    const relevantSnippets = this.findRelevantSnippets(claim.text, snippets);
    
    if (relevantSnippets.length === 0) {
      return {
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'fact-check',
        severity: strictMode ? 'high' : 'medium',
        message: `Unsupported claim: "${claim.text}"`,
        slideId: claim.blockId,
        suggestion: 'Add supporting evidence or remove the claim',
        autoFixable: false,
      };
    }

    // Check if snippets actually support the claim
    const supportScore = await this.calculateSupportScore(claim.text, relevantSnippets);
    
    if (supportScore < 0.6) {
      return {
        id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'fact-check',
        severity: supportScore < 0.3 ? 'high' : 'medium',
        message: `Weakly supported claim: "${claim.text}"`,
        slideId: claim.blockId,
        suggestion: 'Strengthen evidence or qualify the statement',
        autoFixable: false,
      };
    }

    return null; // No issues found
  }

  private findRelevantSnippets(claimText: string, snippets: ResearchSnippet[]): ResearchSnippet[] {
    const keywords = claimText.toLowerCase().split(' ').filter(word => word.length > 3);
    
    return snippets.filter(snippet => {
      const snippetText = snippet.text.toLowerCase();
      const snippetTags = snippet.tags.map(tag => tag.toLowerCase());
      
      // Check for keyword matches
      const keywordMatches = keywords.filter(keyword => 
        snippetText.includes(keyword) || snippetTags.includes(keyword)
      ).length;
      
      // Check confidence threshold
      const hasGoodConfidence = snippet.confidence >= 0.7;
      
      return keywordMatches > 0 && hasGoodConfidence;
    }).slice(0, 3); // Limit to top 3 most relevant
  }

  private async calculateSupportScore(claimText: string, snippets: ResearchSnippet[]): Promise<number> {
    if (snippets.length === 0) return 0;

    const prompt = `Rate how well these research snippets support the given claim (0-1 scale).

Claim: "${claimText}"

Research snippets:
${snippets.map((s, i) => `${i + 1}. "${s.text}" (confidence: ${s.confidence})`).join('\n')}

Consider:
- Direct relevance to the claim
- Quality of the source
- Strength of the evidence
- Any contradictions

Return as JSON:
{
  "supportScore": 0.8,
  "reasoning": "Brief explanation of the score"
}`;

    try {
      const response = await this.callLLM(prompt);
      const result = JSON.parse(response.content);
      return Math.max(0, Math.min(1, result.supportScore || 0));
    } catch (error) {
      console.warn('Support score calculation failed:', error);
      // Fallback: use average snippet confidence
      return snippets.reduce((sum, s) => sum + s.confidence, 0) / snippets.length;
    }
  }

  private checkCitations(slide: Slide, snippets: ResearchSnippet[]): QualityCheck[] {
    const checks: QualityCheck[] = [];
    
    // Check if slide has citations
    if (!slide.cites || slide.cites.length === 0) {
      // Check if slide has claims that need citations
      const claims = this.extractClaims(slide);
      const hasUnsupportedClaims = claims.some(claim => 
        claim.type === 'statistical' || claim.type === 'factual'
      );
      
      if (hasUnsupportedClaims) {
        checks.push({
          id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'fact-check',
          severity: 'medium',
          message: 'Slide contains claims but no citations',
          slideId: slide.id,
          suggestion: 'Add citations to support the claims',
          autoFixable: false,
        });
      }
    } else {
      // Validate that cited snippets exist and are relevant
      for (const citeId of slide.cites) {
        const snippet = snippets.find(s => s.id === citeId);
        if (!snippet) {
          checks.push({
            id: `check-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'fact-check',
            severity: 'low',
            message: `Invalid citation: ${citeId}`,
            slideId: slide.id,
            suggestion: 'Remove invalid citation or update with correct ID',
            autoFixable: true,
          });
        }
      }
    }

    return checks;
  }

  private countClaims(slide: Slide, checks: QualityCheck[]): {
    total: number;
    supported: number;
    unsupported: number;
    highSeverity: number;
  } {
    const claims = this.extractClaims(slide);
    const total = claims.length;
    const unsupported = checks.filter(c => c.type === 'fact-check' && c.slideId === slide.id).length;
    const supported = total - unsupported;
    const highSeverity = checks.filter(c => c.severity === 'high' && c.slideId === slide.id).length;

    return { total, supported, unsupported, highSeverity };
  }

  private calculateOverallScore(supportedClaims: number, totalClaims: number, highSeverityIssues: number): number {
    if (totalClaims === 0) return 1.0; // No claims to check

    const supportRatio = supportedClaims / totalClaims;
    const severityPenalty = highSeverityIssues * 0.2; // 20% penalty per high severity issue

    return Math.max(0, Math.min(1, supportRatio - severityPenalty));
  }

  private getInputSchema() {
    return z.object({
      slides: z.array(z.any()),
      researchSnippets: z.array(z.any()),
      strictMode: z.boolean().optional(),
    });
  }

  protected validateOutput(output: FactCheckerOutput): boolean {
    if (!output.checks || !Array.isArray(output.checks)) {
      return false;
    }

    if (typeof output.overallScore !== 'number' || output.overallScore < 0 || output.overallScore > 1) {
      return false;
    }

    if (!output.summary || typeof output.summary.totalClaims !== 'number') {
      return false;
    }

    return true;
  }

  protected getQualityScore(output: FactCheckerOutput): number {
    return output.overallScore;
  }
}
