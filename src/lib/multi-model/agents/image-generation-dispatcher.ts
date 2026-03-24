import { BaseAgent, AgentConfig } from '../base-agent';
import { MediaFinderOutput, MediaSuggestion, Slide } from '../schemas';

// ============================================================================
// IMAGE GENERATION DISPATCHER
// Consumes Media Finder output and generates real images using Pollinations.ai
// (free, no API key required). Injects Image blocks into slides.
// ============================================================================

const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

export interface ImageGenInput {
  slides: Slide[];
  mediaEnhancements: Record<string, MediaFinderOutput>;
  themeStyle: string;
  maxImagesPerSection: number;
}

export interface GeneratedImage {
  slideId: string;
  sectionId: string;
  url: string;
  alt: string;
  prompt: string;
  width: number;
  height: number;
}

export interface ImageGenOutput {
  generatedImages: GeneratedImage[];
  enrichedSlides: Slide[];
  metadata: {
    totalGenerated: number;
    sectionsWithImages: number;
    failedGenerations: number;
  };
}

export class ImageGenerationDispatcherAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: 'image-generation-dispatcher',
      description: 'Generates real images from Media Finder prompts using Pollinations.ai (free, no API key) and injects them into slides',
      capabilities: ['image-generation', 'slide-enrichment', 'visual-enhancement'],
      maxRetries: 2,
      timeout: 60000, // Images can take a moment to generate
    };
    super(config);
  }

  async execute(input: ImageGenInput, context?: unknown): Promise<ImageGenOutput> {
    try {
      console.log(`[${this.config.name}] Generating images for ${Object.keys(input.mediaEnhancements).length} sections...`);

      const generatedImages: GeneratedImage[] = [];
      let failedCount = 0;

      // Process each section's media suggestions
      const sectionEntries = Object.entries(input.mediaEnhancements);

      for (const [sectionId, mediaOutput] of sectionEntries) {
        const imageSuggestions = mediaOutput.suggestions
          .filter(s => s.type === 'image' || s.type === 'illustration' || s.type === 'diagram')
          .slice(0, input.maxImagesPerSection);

        for (const suggestion of imageSuggestions) {
          try {
            const generated = await this.generateImage(suggestion, sectionId, input.themeStyle);
            if (generated) {
              generatedImages.push(generated);
            }
          } catch (err) {
            console.warn(`[${this.config.name}] Failed to generate image for "${suggestion.description}":`, err);
            failedCount++;
          }
        }
      }

      // Inject images into slides
      const enrichedSlides = this.injectImagesIntoSlides(input.slides, generatedImages);

      const sectionsWithImages = new Set(generatedImages.map(g => g.sectionId)).size;

      const output: ImageGenOutput = {
        generatedImages,
        enrichedSlides,
        metadata: {
          totalGenerated: generatedImages.length,
          sectionsWithImages,
          failedGenerations: failedCount,
        },
      };

      console.log(
        `[${this.config.name}] Generated ${generatedImages.length} images across ${sectionsWithImages} sections ` +
        `(${failedCount} failed)`
      );
      return output;
    } catch (error) {
      this.handleError(error, { input });
    }
  }

  private async generateImage(
    suggestion: MediaSuggestion,
    sectionId: string,
    themeStyle: string
  ): Promise<GeneratedImage | null> {
    // Build a refined prompt for Pollinations.ai
    const rawPrompt = suggestion.prompt || suggestion.description;
    const refinedPrompt = this.refinePrompt(rawPrompt, themeStyle);

    // Pollinations.ai generates images via a simple GET URL
    // The URL itself IS the image — no API call needed, just construct the URL
    const encodedPrompt = encodeURIComponent(refinedPrompt);
    const width = 1024;
    const height = 576; // 16:9 aspect ratio for slides
    const url = `${POLLINATIONS_BASE}/${encodedPrompt}?width=${width}&height=${height}&nologo=true`;

    // Verify the URL is reachable (lightweight HEAD request)
    const isReachable = await this.verifyImageUrl(url);
    if (!isReachable) {
      console.warn(`[${this.config.name}] Pollinations URL not reachable for prompt: ${refinedPrompt.slice(0, 50)}...`);
      return null;
    }

    return {
      slideId: '', // Will be assigned during injection
      sectionId,
      url,
      alt: suggestion.altText || suggestion.description,
      prompt: refinedPrompt,
      width,
      height,
    };
  }

  private refinePrompt(rawPrompt: string, themeStyle: string): string {
    // Add style modifiers based on theme
    const styleMap: Record<string, string> = {
      professional: 'clean, modern, corporate style, minimal, white background',
      creative: 'vibrant, colorful, artistic, creative illustration style',
      academic: 'scholarly, clean diagram style, informational',
      casual: 'friendly, approachable, warm colors, illustrated',
      dark: 'dark theme, moody lighting, sleek, modern',
    };

    const styleSuffix = styleMap[themeStyle] || styleMap.professional;
    return `${rawPrompt}, ${styleSuffix}, presentation slide visual, high quality, no text`;
  }

  private async verifyImageUrl(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      // If HEAD fails, still return true — Pollinations generates on GET
      // The URL will work when the browser/renderer fetches it
      return true;
    }
  }

  private injectImagesIntoSlides(slides: Slide[], images: GeneratedImage[]): Slide[] {
    if (images.length === 0) return slides;

    // Group images by sectionId
    const imagesBySectionId = new Map<string, GeneratedImage[]>();
    for (const img of images) {
      const existing = imagesBySectionId.get(img.sectionId) || [];
      existing.push(img);
      imagesBySectionId.set(img.sectionId, existing);
    }

    // Inject images into slides that belong to sections with generated images
    return slides.map(slide => {
      const sectionId = slide.sectionId;
      if (!sectionId) return slide;

      const sectionImages = imagesBySectionId.get(sectionId);
      if (!sectionImages || sectionImages.length === 0) return slide;

      // Only inject into slides that don't already have an Image block
      const hasImage = slide.blocks.some(b => b.type === 'Image');
      if (hasImage) return slide;

      // Pick the first available image for this section and consume it
      const image = sectionImages.shift()!;
      image.slideId = slide.id;

      // Add image block — prefer two-column or visual-heavy layouts
      const imageBlock = {
        type: 'Image' as const,
        src: image.url,
        alt: image.alt,
        caption: undefined,
        animation: 'fadeIn' as const,
      };

      // Insert the image block after the heading (position 1)
      const newBlocks = [...slide.blocks];
      const headingIndex = newBlocks.findIndex(b => b.type === 'Heading' || b.type === 'Subheading');
      newBlocks.splice(headingIndex + 1, 0, imageBlock);

      return { ...slide, blocks: newBlocks };
    });
  }
}
