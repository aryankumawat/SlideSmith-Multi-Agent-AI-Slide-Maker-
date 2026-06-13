import { BaseAgent, AgentConfig } from '../base-agent';
import { DeckOutline, OutlineSection, ResearchSnippet } from '../schemas';
import { z } from 'zod';

// ============================================================================
// STRUCTURER AGENT - DECK OUTLINE PLANNER
// ============================================================================

export interface StructurerInput {
  topic: string;
  audience: string;
  tone: string;
  desiredSlideCount: number;
  researchSnippets: ResearchSnippet[];
  theme?: string;
  duration?: number; // minutes
}

export interface StructurerOutput {
  outline: DeckOutline;
  recommendations: {
    visualSuggestions: string[];
    interactiveElements: string[];
    pacingNotes: string[];
  };
}

export class StructurerAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'structurer',
      description: 'Converts topic + research into a compelling deck plan',
      capabilities: ['outline-generation', 'audience-analysis', 'narrative-structure'],
      maxRetries: 3,
      timeout: 60000, // Increased to 60 seconds
    };
    super(config);
  }

  async execute(input: StructurerInput, context?: unknown): Promise<StructurerOutput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      if (!this.validateInput(input, this.getInputSchema())) {
        throw new Error('Invalid input for Structurer agent');
      }

      // Analyze research snippets to understand content depth
      const contentAnalysis = this.analyzeResearchContent(input.researchSnippets);
      
      // Generate narrative structure based on audience and tone
      const narrativeStructure = await this.generateNarrativeStructure(input, contentAnalysis);
      
      // Create outline sections with proper pacing
      const sections = await this.createOutlineSections(input, narrativeStructure, contentAnalysis);
      
      // Generate title and conclusion
      const title = await this.generateTitle(input, contentAnalysis);
      const conclusion = await this.generateConclusion(input, sections);
      
      // Create the complete outline
      const outline: DeckOutline = {
        id: `outline-${Date.now()}`,
        title,
        subtitle: this.generateSubtitle(input),
        audience: input.audience,
        tone: input.tone,
        theme: input.theme || 'professional',
        sections,
        conclusion,
        references: this.extractReferences(input.researchSnippets),
        estimatedDuration: input.duration || this.calculateEstimatedDuration(sections),
        wordCount: this.estimateWordCount(sections),
      };

      // Generate recommendations
      const recommendations = this.generateRecommendations(outline, contentAnalysis);

      const output: StructurerOutput = {
        outline,
        recommendations,
      };

      const duration = Date.now() - startTime;
      this.logExecution('structurer-task', input, output, duration);

      return output;

    } catch (error) {
      this.handleError(error, { input, context });
    }
  }

  private analyzeResearchContent(snippets: ResearchSnippet[]): { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number } {
    const topics = snippets.flatMap(s => s.tags);
    const topicCounts = topics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const sortedTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    const averageConfidence = snippets.reduce((sum, s) => sum + s.confidence, 0) / snippets.length;
    
    const hasData = snippets.some(s => s.tags.includes('data') || s.tags.includes('statistics'));
    const hasTrends = snippets.some(s => s.tags.includes('trends') || s.tags.includes('forecast'));
    const hasCaseStudies = snippets.some(s => s.tags.includes('case-study') || s.tags.includes('example'));

    return {
      mainTopics: sortedTopics,
      averageConfidence,
      hasData,
      hasTrends,
      hasCaseStudies,
      totalSnippets: snippets.length,
    };
  }

  private async generateNarrativeStructure(input: StructurerInput, contentAnalysis: { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number }): Promise<{ narrativeArc: string; sections: Array<{ purpose: string; emotionalTone: string; keyMessage: string; evidenceTypes: string[] }> }> {
    const prompt = `Create a narrative structure for a presentation on "${input.topic}" for a "${input.audience}" audience.

Key research topics found: ${contentAnalysis.mainTopics.join(', ')}
Has data/statistics: ${contentAnalysis.hasData}
Has trends: ${contentAnalysis.hasTrends}
Has case studies: ${contentAnalysis.hasCaseStudies}

Create a compelling narrative arc with 4-6 sections that:
1. Builds understanding progressively
2. Uses evidence from research
3. Matches the "${input.tone}" tone
4. Fits within ${input.desiredSlideCount} slides

Return as JSON:
{
  "narrativeArc": "description of overall story",
  "sections": [
    {
      "purpose": "why this section exists",
      "emotionalTone": "curiosity|concern|excitement|confidence",
      "keyMessage": "main takeaway",
      "evidenceTypes": ["data", "examples", "trends"]
    }
  ]
}`;

    const response = await this.callLLM(prompt);
    
    if (!response || !response.content) {
      console.warn('[structurer] Empty response from LLM, using fallback narrative structure');
      return {
        narrativeArc: `A comprehensive exploration of ${input.topic} for ${input.audience}`,
        sections: [
          {
            purpose: 'Introduction and context setting',
            emotionalTone: 'curiosity',
            keyMessage: 'Understanding the current landscape',
            evidenceTypes: ['data', 'examples']
          },
          {
            purpose: 'Core concepts and insights',
            emotionalTone: 'excitement',
            keyMessage: 'Key findings and developments',
            evidenceTypes: ['data', 'trends']
          },
          {
            purpose: 'Practical applications',
            emotionalTone: 'confidence',
            keyMessage: 'Real-world impact and implementation',
            evidenceTypes: ['examples', 'case studies']
          },
          {
            purpose: 'Future outlook and next steps',
            emotionalTone: 'excitement',
            keyMessage: 'What lies ahead',
            evidenceTypes: ['trends', 'data']
          }
        ]
      };
    }

    try {
      return JSON.parse(response.content);
    } catch (error) {
      console.warn('[structurer] Failed to parse narrative structure JSON:', error);
      console.warn('[structurer] Response content:', response.content);
      return {
        narrativeArc: `A comprehensive exploration of ${input.topic} for ${input.audience}`,
        sections: [
          {
            purpose: 'Introduction and context setting',
            emotionalTone: 'curiosity',
            keyMessage: 'Understanding the current landscape',
            evidenceTypes: ['data', 'examples']
          },
          {
            purpose: 'Core concepts and insights',
            emotionalTone: 'excitement',
            keyMessage: 'Key findings and developments',
            evidenceTypes: ['data', 'trends']
          },
          {
            purpose: 'Practical applications',
            emotionalTone: 'confidence',
            keyMessage: 'Real-world impact and implementation',
            evidenceTypes: ['examples', 'case studies']
          },
          {
            purpose: 'Future outlook and next steps',
            emotionalTone: 'excitement',
            keyMessage: 'What lies ahead',
            evidenceTypes: ['trends', 'data']
          }
        ]
      };
    }
  }

  private async createOutlineSections(
    input: StructurerInput, 
    narrativeStructure: { narrativeArc: string; sections: Array<{ purpose: string; emotionalTone: string; keyMessage: string; evidenceTypes: string[] }> }, 
    contentAnalysis: { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number }
  ): Promise<OutlineSection[]> {
    const sections: OutlineSection[] = [];
    const slidesPerSection = Math.floor(input.desiredSlideCount / narrativeStructure.sections.length);
    const remainingSlides = input.desiredSlideCount % narrativeStructure.sections.length;

    for (let i = 0; i < narrativeStructure.sections.length; i++) {
      const sectionInfo = narrativeStructure.sections[i];
      const slideCount = slidesPerSection + (i < remainingSlides ? 1 : 0);
      
      const section = await this.createSection(
        sectionInfo,
        i,
        slideCount,
        input,
        contentAnalysis
      );
      
      sections.push(section);
    }

    return sections;
  }

  private async createSection(
    sectionInfo: { purpose: string; emotionalTone: string; keyMessage: string; evidenceTypes: string[] },
    index: number,
    slideCount: number,
    input: StructurerInput,
    contentAnalysis: { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number }
  ): Promise<OutlineSection> {
    const prompt = `Create a section for a presentation on "${input.topic}".

Section purpose: ${sectionInfo.purpose}
Emotional tone: ${sectionInfo.emotionalTone}
Key message: ${sectionInfo.keyMessage}
Evidence types: ${sectionInfo.evidenceTypes.join(', ')}
Target slides: ${slideCount}
Audience: ${input.audience}

Create a section with:
- A compelling title (≤8 words)
- Clear objective
- 3-6 key points that support the message
- Suggestions for where charts/data would help

Return as JSON:
{
  "title": "Section Title",
  "goal": "What this section achieves",
  "keyPoints": ["point1", "point2", "point3"],
  "chartSuggested": true/false,
  "chartReason": "why a chart would help"
}`;

    const response = await this.callLLM(prompt);
    
    if (!response || !response.content) {
      console.warn('[structurer] Empty response from LLM, using fallback section data');
      return {
        id: `section-${index + 1}`,
        title: `Section ${index + 1}`,
        goal: 'Key insights and information',
        estSlides: slideCount,
        keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
        order: index + 1,
        chartSuggested: false,
      };
    }

    let sectionData;
    try {
      sectionData = JSON.parse(response.content);
    } catch (error) {
      console.warn('[structurer] Failed to parse section data JSON:', error);
      console.warn('[structurer] Response content:', response.content);
      sectionData = {
        title: `Section ${index + 1}`,
        goal: 'Key insights and information',
        keyPoints: ['Key point 1', 'Key point 2', 'Key point 3'],
        chartSuggested: false,
      };
    }

    return {
      id: `section-${index + 1}`,
      title: sectionData.title,
      goal: sectionData.goal,
      estSlides: slideCount,
      keyPoints: sectionData.keyPoints,
      order: index + 1,
      chartSuggested: sectionData.chartSuggested || false,
      liveWidgetSuggested: this.shouldSuggestLiveWidget(sectionData, input),
    };
  }

  private shouldSuggestLiveWidget(sectionData: { title: string; goal: string; chartSuggested?: boolean; chartReason?: string }, input: StructurerInput): boolean {
    // Suggest live widgets for data-heavy or time-sensitive content
    const dataKeywords = ['data', 'statistics', 'trends', 'real-time', 'live', 'current'];
    const hasDataKeywords = dataKeywords.some(keyword => 
      sectionData.title.toLowerCase().includes(keyword) ||
      sectionData.goal.toLowerCase().includes(keyword)
    );
    
    return hasDataKeywords && input.audience.toLowerCase().includes('technical');
  }

  private async generateTitle(input: StructurerInput, contentAnalysis: { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number }): Promise<string> {
    const prompt = `Generate a compelling presentation title for "${input.topic}".

Audience: ${input.audience}
Tone: ${input.tone}
Key topics: ${contentAnalysis.mainTopics.join(', ')}
Has data: ${contentAnalysis.hasData}

Create a title that:
- Is 3-8 words
- Captures the main value proposition
- Matches the tone
- Appeals to the audience

Return only the title, no quotes or extra text.`;

    const response = await this.callLLM(prompt);
    
    if (!response || !response.content) {
      console.warn('[structurer] Empty response for title generation, using fallback');
      return `${input.topic} - A Comprehensive Overview`;
    }
    
    return response.content.trim().replace(/['"]/g, '');
  }

  private generateSubtitle(input: StructurerInput): string {
    const audienceMap: Record<string, string> = {
      'technical': 'Technical Implementation Guide',
      'business': 'Business Value & Strategy',
      'executive': 'Strategic Overview',
      'general': 'Comprehensive Guide',
    };

    const audienceKey = Object.keys(audienceMap).find(key => 
      input.audience.toLowerCase().includes(key)
    );

    return (audienceKey ? audienceMap[audienceKey] : undefined) || 'Comprehensive Overview';
  }

  private async generateConclusion(input: StructurerInput, sections: OutlineSection[]): Promise<string> {
    const keyTakeaways = sections.map(s => s.title).slice(0, 3);
    
    const prompt = `Create a compelling conclusion for a presentation on "${input.topic}".

Key sections covered: ${keyTakeaways.join(', ')}
Audience: ${input.audience}
Tone: ${input.tone}

Create a conclusion that:
- Summarizes the main value
- Provides clear next steps
- Ends on an inspiring note
- Is 1-2 sentences

Return only the conclusion text.`;

    const response = await this.callLLM(prompt);
    
    if (!response || !response.content) {
      console.warn('[structurer] Empty response for conclusion generation, using fallback');
      return `Thank you for your attention. Questions and discussion welcome.`;
    }
    
    return response.content.trim();
  }

  private extractReferences(snippets: ResearchSnippet[]): string[] {
    const sources = snippets
      .map(s => s.source)
      .filter((source, index, self) => self.indexOf(source) === index)
      .slice(0, 5); // Limit to 5 references

    return sources;
  }

  private calculateEstimatedDuration(sections: OutlineSection[]): number {
    // Estimate 2-3 minutes per slide
    const totalSlides = sections.reduce((sum, s) => sum + s.estSlides, 0);
    return Math.ceil(totalSlides * 2.5);
  }

  private estimateWordCount(sections: OutlineSection[]): number {
    // Rough estimate: 50-100 words per slide
    const totalSlides = sections.reduce((sum, s) => sum + s.estSlides, 0);
    return totalSlides * 75;
  }

  private generateRecommendations(outline: DeckOutline, contentAnalysis: { mainTopics: string[]; averageConfidence: number; hasData: boolean; hasTrends: boolean; hasCaseStudies: boolean; totalSnippets: number }): StructurerOutput['recommendations'] {
    const visualSuggestions: string[] = [];
    const interactiveElements: string[] = [];
    const pacingNotes: string[] = [];

    // Visual suggestions based on content
    if (contentAnalysis.hasData) {
      visualSuggestions.push('Include data visualizations and charts');
    }
    if (contentAnalysis.hasTrends) {
      visualSuggestions.push('Use timeline or trend visualizations');
    }
    if (contentAnalysis.hasCaseStudies) {
      visualSuggestions.push('Include case study examples and diagrams');
    }

    // Interactive elements
    if (outline.audience.toLowerCase().includes('technical')) {
      interactiveElements.push('Live code demonstrations');
      interactiveElements.push('Interactive Q&A sections');
    }
    if (outline.audience.toLowerCase().includes('business')) {
      interactiveElements.push('Polling and audience engagement');
      interactiveElements.push('Breakout discussion points');
    }

    // Pacing notes
    const totalSlides = outline.sections.reduce((sum, s) => sum + s.estSlides, 0);
    if (totalSlides > 15) {
      pacingNotes.push('Consider breaking into multiple sessions');
    }
    if (outline.estimatedDuration && outline.estimatedDuration > 60) {
      pacingNotes.push('Include breaks every 20-30 minutes');
    }

    return {
      visualSuggestions,
      interactiveElements,
      pacingNotes,
    };
  }

  private getInputSchema() {
    return z.object({
      topic: z.string().min(1),
      audience: z.string().min(1),
      tone: z.string().min(1),
      desiredSlideCount: z.number().min(4).max(50),
      researchSnippets: z.array(z.any()),
      theme: z.string().optional(),
      duration: z.number().optional(),
    });
  }

  protected validateOutput(output: StructurerOutput): boolean {
    if (!output.outline || !output.outline.sections) {
      return false;
    }

    if (output.outline.sections.length < 3) {
      return false;
    }

    // Validate section titles are within word limit
    for (const section of output.outline.sections) {
      const wordCount = section.title.split(' ').length;
      if (wordCount > 8) {
        return false;
      }
    }

    return true;
  }

  protected getQualityScore(output: StructurerOutput): number {
    const { outline } = output;
    
    let score = 0;
    
    // Check narrative flow
    if (outline.sections.length >= 4 && outline.sections.length <= 6) {
      score += 0.3;
    }
    
    // Check title quality
    const titleWords = outline.title.split(' ').length;
    if (titleWords >= 3 && titleWords <= 8) {
      score += 0.2;
    }
    
    // Check section balance
    const slideCounts = outline.sections.map(s => s.estSlides);
    const avgSlides = slideCounts.reduce((sum, count) => sum + count, 0) / slideCounts.length;
    const variance = slideCounts.reduce((sum, count) => sum + Math.pow(count - avgSlides, 2), 0) / slideCounts.length;
    
    if (variance < 2) { // Low variance = good balance
      score += 0.3;
    }
    
    // Check conclusion quality
    if (outline.conclusion && outline.conclusion.length > 20) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }
}
