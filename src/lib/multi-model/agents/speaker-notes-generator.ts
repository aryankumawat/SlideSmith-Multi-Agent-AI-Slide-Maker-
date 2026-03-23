import { BaseAgent, AgentConfig } from '../base-agent';
import { SpeakerNotesInput, SpeakerNotesOutput, SpeakerNote } from '../schemas';

// ============================================================================
// SPEAKER NOTES GENERATOR AGENT
// ============================================================================

export class SpeakerNotesGeneratorAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'speaker-notes-generator',
      description: 'Generates speaker notes with timing cues and audience engagement guidance for each slide',
      capabilities: ['note-composition', 'timing-guidance', 'audience-engagement'],
      maxRetries: 3,
      timeout: 45000,
    };
    super(config);
  }

  async execute(input: SpeakerNotesInput, context?: unknown): Promise<SpeakerNotesOutput> {
    try {
      console.log(`[${this.config.name}] Generating speaker notes for ${input.slides.length} slides...`);

      const speakerNotes = await this.generateSpeakerNotes(input);

      const output: SpeakerNotesOutput = {
        notes: speakerNotes,
        metadata: {
          totalSlides: speakerNotes.length,
          averageDuration: this.calculateAverageDuration(speakerNotes),
          totalDuration: this.calculateTotalDuration(speakerNotes),
        },
      };

      console.log(`[${this.config.name}] Generated notes for ${speakerNotes.length} slides`);
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async generateSpeakerNotes(input: SpeakerNotesInput): Promise<SpeakerNote[]> {
    // Generate all slide notes in parallel for speed
    const notePromises = input.slides.map(async (slide) => {
      const prompt = this.buildSpeakerNotesPrompt(input, slide);
      const response = await this.callLLM(prompt);
      return this.parseSpeakerNote(response.content, slide.id);
    });

    return Promise.all(notePromises);
  }

  private buildSpeakerNotesPrompt(input: SpeakerNotesInput, slide: any): string {
    const titleBlock = slide.blocks?.find((b: any) => b.type === 'Heading');
    const bulletsBlock = slide.blocks?.find((b: any) => b.type === 'Bullets');
    const title = titleBlock?.text || slide.id;
    const bullets = bulletsBlock?.items?.join('; ') || '';

    return `Generate speaker notes for this presentation slide.

Slide: "${title}"
Bullets: ${bullets}
Existing notes: ${slide.notes || 'none'}

Presentation context:
- Audience: ${input.audience}
- Tone: ${input.tone}
- Total duration: ${input.estimatedDuration} minutes
- Purpose: ${input.purpose}

Return JSON only:
{
  "notes": "Full spoken script for this slide (2-4 sentences, do NOT repeat bullet text)",
  "duration": "30-45 seconds",
  "keyPoints": ["emphasis point 1", "emphasis point 2"],
  "transitions": ["transition from previous", "lead-in to next"],
  "audienceEngagement": ["pause for reaction", "ask question if relevant"],
  "timing": "pace guidance (e.g. slow and deliberate)"
}`;
  }

  private parseSpeakerNote(content: string, slideId: string): SpeakerNote {
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        slideId,
        notes: parsed.notes || content,
        duration: parsed.duration || '30-45 seconds',
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        transitions: Array.isArray(parsed.transitions) ? parsed.transitions : [],
        audienceEngagement: Array.isArray(parsed.audienceEngagement) ? parsed.audienceEngagement : [],
        timing: parsed.timing || 'Normal pace',
      };
    } catch {
      return {
        slideId,
        notes: content,
        duration: '30-45 seconds',
        keyPoints: this.extractKeyPoints(content),
        transitions: [],
        audienceEngagement: [],
        timing: 'Normal pace',
      };
    }
  }

  private extractKeyPoints(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .filter(s => s.trim().length > 10)
      .slice(0, 3)
      .map(s => s.trim());
  }

  private calculateAverageDuration(notes: SpeakerNote[]): number {
    if (notes.length === 0) return 0;
    const total = notes.reduce((sum, note) => {
      const match = note.duration.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 30);
    }, 0);
    return Math.round(total / notes.length);
  }

  private calculateTotalDuration(notes: SpeakerNote[]): number {
    return notes.reduce((sum, note) => {
      const match = note.duration.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 30);
    }, 0);
  }
}
