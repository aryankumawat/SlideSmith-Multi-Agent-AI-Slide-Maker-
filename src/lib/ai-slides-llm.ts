import { createLLMClient } from './llm';
import { AIDeck, AISlide, Input } from './ai-slides-schema';

export class AISlidesLLM {
  private llm = createLLMClient();

  // A) Outline Generator (topic → slides)
  async generateOutline(input: Input): Promise<AISlide[]> {
    const prompt = `You are a slide architect. Given a topic or long script, produce a concise, audience-friendly outline of 8–12 slides:
- Structure: Cover, Agenda, 4–8 Content slides, Summary, (References if needed)
- Titles <= 8 words, bullets <= 12 words, 3–6 bullets per slide
- Return JSON matching the "slides" array (no prose)

INPUT:
${input.topic || input.script}

OUTPUT (JSON only):
{ "slides": [ ... ] }`;

    const response = await this.llm.generateContent(prompt);
    const json = this.parseJSONResponse(response);
    return json.slides || [];
  }

  // B) Per-Slide Content Expansion
  async expandSlideContent(slide: AISlide, context: string): Promise<AISlide> {
    const prompt = `For this outline item, expand into:
- title
- bullets (<=6, <=12 words each)
- speakerNotes (80–140 words)
- visual: type + 2–5 keywords
- optional: kpis, comparison, timeline, quote

Return a JSON object that matches the slide schema.
Keep language concise, benefits-first, non-repetitive.

OUTLINE ITEM:
${JSON.stringify(slide)}

CONTEXT:
${context}

OUTPUT (JSON only):
{ ... }`;

    const response = await this.llm.generateContent(prompt);
    return this.parseJSONResponse(response);
  }

  // C) Visual Planner
  async planVisuals(slides: AISlide[]): Promise<AISlide[]> {
    const prompt = `Map each slide to a layout: ["cover","agenda","two-column","list","comparison","kpi","timeline","quote","diagram"].
Return same objects with "layout" filled and a refined "visual".
Pick visuals that are abstract, brand-consistent, and legible from 3m distance.

SLIDES:
${JSON.stringify(slides)}

OUTPUT (JSON only):
[ ... ]`;

    const response = await this.llm.generateContent(prompt);
    return this.parseJSONResponse(response);
  }

  // D) Consistency & Limits Pass
  async ensureConsistency(slides: AISlide[]): Promise<AISlide[]> {
    const prompt = `Review slides for:
- title length, bullet length/amount
- duplication across slides
- consistent voice & tense
- jargon simplification

Return the revised JSON. Do not add commentary.

SLIDES:
${JSON.stringify(slides)}

OUTPUT (JSON only):
[ ... ]`;

    const response = await this.llm.generateContent(prompt);
    return this.parseJSONResponse(response);
  }

  // Main pipeline method
  async generateSlides(input: Input): Promise<AIDeck> {
    try {
      // Step 1: Generate outline
      const outline = await this.generateOutline(input);
      
      // Step 2: Expand content for each slide
      const expandedSlides = await Promise.all(
        outline.map(slide => this.expandSlideContent(slide, input.topic || input.script || ''))
      );
      
      // Step 3: Plan visuals and layouts
      const visualPlannedSlides = await this.planVisuals(expandedSlides);
      
      // Step 4: Ensure consistency
      const finalSlides = await this.ensureConsistency(visualPlannedSlides);
      
      // Create deck
      const deck: AIDeck = {
        title: input.topic || 'AI Generated Presentation',
        subtitle: input.script ? 'Generated from Script' : undefined,
        theme: input.theme || 'nebula-dark',
        slides: finalSlides
      };
      
      return deck;
    } catch (error) {
      console.error('Error generating slides:', error);
      throw new Error('Failed to generate slides');
    }
  }

  private parseJSONResponse(response: string): any {
    try {
      // Clean the response to extract JSON
      let cleanedResponse = response.trim();
      
      // Remove any text before the first [ or {
      const jsonStart = cleanedResponse.search(/[\[\{]/);
      if (jsonStart > 0) {
        cleanedResponse = cleanedResponse.substring(jsonStart);
      }
      
      // Remove any text after the last ] or }
      const jsonEnd = Math.max(cleanedResponse.lastIndexOf(']'), cleanedResponse.lastIndexOf('}'));
      if (jsonEnd > 0 && jsonEnd < cleanedResponse.length - 1) {
        cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
      }
      
      // Try to parse the cleaned response
      return JSON.parse(cleanedResponse);
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Response:', response);
      
      // Fallback: try to extract just the array part
      try {
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
      }
      
      throw new Error('Failed to parse LLM response as JSON');
    }
  }
}
