import { LLMClient } from './llm';
import { Deck, Slide } from './schema';

export interface SpeechConfig {
  duration: number; // in minutes
  style: 'academic_conference' | 'classroom' | 'industry_presentation' | 'public_talk';
  pace: 'slow' | 'normal' | 'fast';
  includeTransitions: boolean;
  includeTiming: boolean;
}

export interface SpeechScript {
  totalDuration: number;
  slides: Array<{
    slideId: string;
    slideTitle: string;
    script: string;
    duration: number;
    timing: {
      start: number;
      end: number;
    };
  }>;
  transitions: Array<{
    fromSlide: string;
    toSlide: string;
    transition: string;
  }>;
  notes: string[];
}

export class SpeechGenerator {
  private llm: LLMClient;

  constructor() {
    this.llm = new LLMClient({
      provider: 'demo',
      apiKey: '',
      baseUrl: '',
      model: 'demo'
    });
  }

  async generateSpeech(deck: Deck, config: SpeechConfig): Promise<SpeechScript> {
    const slides = deck.slides || [];
    const speechSlides: SpeechScript['slides'] = [];
    let currentTime = 0;

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const slideScript = await this.generateSlideScript(slide, config, i + 1, slides.length);
      
      const duration = this.calculateSlideDuration(slideScript, config.pace);
      
      speechSlides.push({
        slideId: slide.id,
        slideTitle: this.extractSlideTitle(slide),
        script: slideScript,
        duration,
        timing: {
          start: currentTime,
          end: currentTime + duration
        }
      });

      currentTime += duration;
    }

    // Generate transitions
    const transitions = config.includeTransitions 
      ? this.generateTransitions(speechSlides, config.style)
      : [];

    // Generate speaker notes
    const notes = this.generateSpeakerNotes(deck, config);

    return {
      totalDuration: currentTime,
      slides: speechSlides,
      transitions,
      notes
    };
  }

  private async generateSlideScript(slide: Slide, config: SpeechConfig, slideNumber: number, totalSlides: number): Promise<string> {
    const prompt = this.createSlideScriptPrompt(slide, config, slideNumber, totalSlides);
    
    try {
      const response = await this.llm.generateContent(prompt);
      return response;
    } catch (error) {
      console.error('Error generating slide script:', error);
      return this.generateFallbackScript(slide, config);
    }
  }

  private createSlideScriptPrompt(slide: Slide, config: SpeechConfig, slideNumber: number, totalSlides: number): string {
    const slideContent = this.extractSlideContent(slide);
    const styleInstructions = this.getStyleInstructions(config.style);
    const paceInstructions = this.getPaceInstructions(config.pace);

    return `Generate a speech script for slide ${slideNumber} of ${totalSlides} in a presentation.

Slide Content:
${slideContent}

Presentation Style: ${config.style}
Pace: ${config.pace}
Target Duration: ${config.duration} minutes total

${styleInstructions}
${paceInstructions}

Requirements:
- Write in first person ("I will show you...", "Let me explain...")
- Include smooth transitions between points
- Use appropriate academic/technical language for the style
- Keep the script engaging and clear
- Include natural pauses and emphasis points
- Make it sound conversational, not robotic

Generate a speech script that would take approximately ${Math.round(config.duration * 60 / totalSlides)} seconds to deliver.`;
  }

  private getStyleInstructions(style: SpeechConfig['style']): string {
    switch (style) {
      case 'academic_conference':
        return 'Use formal academic language, cite relevant research, and maintain scholarly tone. Include technical terminology appropriately.';
      case 'classroom':
        return 'Use clear, educational language. Explain concepts step-by-step. Ask rhetorical questions to engage students.';
      case 'industry_presentation':
        return 'Use professional, business-oriented language. Focus on practical applications and ROI. Keep it concise and actionable.';
      case 'public_talk':
        return 'Use accessible language that general audiences can understand. Avoid jargon, use analogies, and make it engaging.';
      default:
        return 'Use clear, professional language appropriate for the audience.';
    }
  }

  private getPaceInstructions(pace: SpeechConfig['pace']): string {
    switch (pace) {
      case 'slow':
        return 'Write for a slower delivery pace. Include more pauses and detailed explanations.';
      case 'normal':
        return 'Write for a normal speaking pace. Balance detail with conciseness.';
      case 'fast':
        return 'Write for a faster delivery pace. Be concise and direct.';
      default:
        return 'Write for a normal speaking pace.';
    }
  }

  private extractSlideContent(slide: Slide): string {
    return slide.blocks.map(block => {
      switch (block.type) {
        case 'Heading':
          return `# ${block.text}`;
        case 'Subheading':
          return `## ${block.text}`;
        case 'Markdown':
          return block.md || '';
        case 'Bullets':
          return block.items.map(item => `- ${item}`).join('\n');
        case 'Quote':
          return `> ${block.text}`;
        case 'Code':
          return `\`\`\`${block.language}\n${block.code}\n\`\`\``;
        default:
          return '';
      }
    }).join('\n\n');
  }

  private extractSlideTitle(slide: Slide): string {
    const headingBlock = slide.blocks.find(block => block.type === 'Heading');
    return headingBlock ? headingBlock.text : `Slide ${slide.id}`;
  }

  private calculateSlideDuration(script: string, pace: SpeechConfig['pace']): number {
    const wordCount = script.split(/\s+/).length;
    const wordsPerMinute = pace === 'slow' ? 120 : pace === 'fast' ? 200 : 160;
    return (wordCount / wordsPerMinute) * 60; // Convert to seconds
  }

  private generateTransitions(slides: SpeechScript['slides'], style: SpeechConfig['style']): SpeechScript['transitions'] {
    const transitions: SpeechScript['transitions'] = [];
    
    for (let i = 0; i < slides.length - 1; i++) {
      const currentSlide = slides[i];
      const nextSlide = slides[i + 1];
      
      transitions.push({
        fromSlide: currentSlide.slideId,
        toSlide: nextSlide.slideId,
        transition: this.generateTransitionText(currentSlide.slideTitle, nextSlide.slideTitle, style)
      });
    }

    return transitions;
  }

  private generateTransitionText(fromTitle: string, toTitle: string, style: SpeechConfig['style']): string {
    const transitions = {
      academic_conference: [
        `Now that we've covered ${fromTitle.toLowerCase()}, let's move on to ${toTitle.toLowerCase()}.`,
        `Building on our discussion of ${fromTitle.toLowerCase()}, the next section focuses on ${toTitle.toLowerCase()}.`,
        `Having established ${fromTitle.toLowerCase()}, we can now examine ${toTitle.toLowerCase()}.`
      ],
      classroom: [
        `Great! Now that we understand ${fromTitle.toLowerCase()}, let's learn about ${toTitle.toLowerCase()}.`,
        `Next, we're going to look at ${toTitle.toLowerCase()}, which builds on what we just learned.`,
        `Moving forward, let's explore ${toTitle.toLowerCase()}.`
      ],
      industry_presentation: [
        `Now let's shift our focus to ${toTitle.toLowerCase()}.`,
        `The next important aspect to consider is ${toTitle.toLowerCase()}.`,
        `Let's move on to ${toTitle.toLowerCase()}.`
      ],
      public_talk: [
        `Now, let me tell you about ${toTitle.toLowerCase()}.`,
        `This brings us to our next topic: ${toTitle.toLowerCase()}.`,
        `Let's explore ${toTitle.toLowerCase()} together.`
      ]
    };

    const styleTransitions = transitions[style] || transitions.public_talk;
    return styleTransitions[Math.floor(Math.random() * styleTransitions.length)];
  }

  private generateSpeakerNotes(deck: Deck, config: SpeechConfig): string[] {
    return [
      `Total presentation duration: ${config.duration} minutes`,
      `Speaking style: ${config.style}`,
      `Pace: ${config.pace}`,
      `Number of slides: ${deck.slides?.length || 0}`,
      'Remember to maintain eye contact with the audience',
      'Use gestures to emphasize key points',
      'Pause after important statements for emphasis',
      'Check for audience understanding periodically'
    ];
  }

  private generateFallbackScript(slide: Slide, config: SpeechConfig): string {
    const title = this.extractSlideTitle(slide);
    return `Let me discuss ${title.toLowerCase()}. This slide covers important information that I'll walk you through step by step. I'll explain the key concepts and provide context for better understanding.`;
  }
}
