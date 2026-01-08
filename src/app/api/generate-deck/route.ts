import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  generateOutline, 
  generateSlide, 
  generateVisual, 
  harvestFactsForSlide, 
  tableMatchesTitle, 
  tableForTitle, 
  attachChartSpec, 
  parseDocuments 
} from '@/lib/deck-generator';

// Request validation schema
const GenerateDeckRequestSchema = z.object({
  mode: z.enum(['quick_prompt', 'doc_to_deck']),
  topic_or_prompt: z.string().optional(),
  instructions: z.string().optional(),
  tone: z.enum(['professional', 'casual', 'academic', 'persuasive']).default('professional'),
  audience: z.enum(['general', 'executives', 'technical', 'students']).default('general'),
  slide_count: z.number().min(3).max(50).default(10),
  theme: z.enum(['deep_space', 'ultra_violet', 'minimal', 'corporate']).default('deep_space'),
  live_widgets: z.boolean().default(false),
  assets: z.object({
    doc_urls: z.array(z.string()).optional(),
    image_urls: z.array(z.string()).optional(),
    xlsx_urls: z.array(z.string()).optional(),
  }).optional(),
});

// Response types
export type ChartSpec = {
  type: 'bar' | 'line' | 'pie' | 'area' | 'scatter';
  data?: any;
  caption?: string;
};

export type Slide = {
  layout: 'title' | 'title_bullets' | 'two_column' | 'quote' | 'chart' | 'image_full';
  title: string;
  bullets?: string[];
  notes?: string;
  chart_spec?: ChartSpec | null;
  image?: { prompt: string; alt: string; source: 'generated' | 'uploaded' | 'url' };
  citations?: string[];
};

export type Deck = {
  title: string;
  theme: string;
  slides: Slide[];
};

export type GenerateDeckResponse = {
  deck: Deck;
  exports: {
    pptx_url: string;
    pdf_url: string;
    json_url: string;
  };
};

// Theme tokens
const themes = {
  deep_space: {
    bg: '#0B0F1A',
    surface: '#101828',
    primary: '#7C3AED',
    accent: '#22D3EE',
    text: '#E2E8F0',
    muted: '#94A3B8',
    font: 'Inter, system-ui, -apple-system',
    image_style: 'dark, subtle starfield, soft glow, high contrast'
  },
  ultra_violet: {
    bg: '#0F0820',
    surface: '#1B1035',
    primary: '#A855F7',
    accent: '#06B6D4',
    text: '#F8FAFC',
    muted: '#A1A1AA',
    font: 'Inter, system-ui, -apple-system',
    image_style: 'vibrant violet gradients, glassmorphism, soft blur'
  },
  minimal: {
    bg: '#FFFFFF',
    surface: '#F8FAFC',
    primary: '#1F2937',
    accent: '#3B82F6',
    text: '#111827',
    muted: '#6B7280',
    font: 'Inter, system-ui, -apple-system',
    image_style: 'clean, minimalist, high contrast, geometric'
  },
  corporate: {
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    primary: '#1E40AF',
    accent: '#059669',
    text: '#111827',
    muted: '#6B7280',
    font: 'Inter, system-ui, -apple-system',
    image_style: 'professional, clean, corporate blue accents'
  }
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = GenerateDeckRequestSchema.parse(body);
    
    console.log('[Generate Deck API] Starting generation with mode:', validatedData.mode);
    
    // Normalize metadata
    const meta = {
      slide_count: validatedData.slide_count,
      audience: validatedData.audience,
      tone: validatedData.tone,
      theme: validatedData.theme,
      live_widgets: validatedData.live_widgets
    };
    
    // Process documents if in doc_to_deck mode
    let docSummary = '';
    if (validatedData.mode === 'doc_to_deck' && validatedData.assets?.doc_urls) {
      docSummary = await parseDocuments(validatedData.assets.doc_urls);
    }
    
    // Generate outline with timeout
    console.log('[Generate Deck API] Generating outline...');
    const outline = await Promise.race([
      generateOutline({
        slide_count: meta.slide_count,
        audience: meta.audience,
        tone: meta.tone,
        topic_or_prompt_or_instructions: validatedData.topic_or_prompt || validatedData.instructions || '',
        doc_summary_or_empty: docSummary
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Outline generation timed out after 60 seconds')), 60000)
      )
    ]);
    
    console.log('[Generate Deck API] Outline generated, creating slides...');
    
    // Validate exact slide count from outline
    const totalSlidesInOutline = outline.sections.reduce((sum, section) => sum + section.slides.length, 0);
    if (totalSlidesInOutline !== meta.slide_count) {
      console.warn(`[Generate Deck API] Outline has ${totalSlidesInOutline} slides, but need exactly ${meta.slide_count}. Adjusting...`);
      
      // Adjust outline to match exact count
      if (totalSlidesInOutline < meta.slide_count) {
        // Add slides to last section
        const lastSection = outline.sections[outline.sections.length - 1];
        const needed = meta.slide_count - totalSlidesInOutline;
        for (let i = 0; i < needed; i++) {
          lastSection.slides.push({
            title: `Additional Key Point ${i + 1}`,
            layout: 'title_bullets',
            section: lastSection.name
          });
        }
      } else if (totalSlidesInOutline > meta.slide_count) {
        // Remove slides from last section
        const lastSection = outline.sections[outline.sections.length - 1];
        const toRemove = totalSlidesInOutline - meta.slide_count;
        lastSection.slides = lastSection.slides.slice(0, lastSection.slides.length - toRemove);
      }
    }
    
    // Generate slides with progress logging
    const slides: Slide[] = [];
    const totalSlides = outline.sections.reduce((sum, section) => sum + section.slides.length, 0);
    console.log(`[Generate Deck API] Generating exactly ${totalSlides} slides (requested: ${meta.slide_count})`);
    let currentSlide = 0;
    
    for (const section of outline.sections) {
      for (const slot of section.slides) {
        currentSlide++;
        console.log(`[Generate Deck API] Generating slide ${currentSlide}/${totalSlides}: ${slot.title}`);
        
        try {
          const perSlideFacts = docSummary ? harvestFactsForSlide(docSummary, slot.title) : '';
          const draft = await Promise.race([
            generateSlide({
              slide_context: slot,
              per_slide_extracted_text_or_empty: perSlideFacts
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error(`Slide generation timed out for: ${slot.title}`)), 30000)
            )
          ]);
          
          let withChart = draft;
          if (!draft.chart_spec && tableMatchesTitle(docSummary, slot.title)) {
            withChart = attachChartSpec(draft, tableForTitle(docSummary, slot.title));
          }
          
          const visual = await Promise.race([
            generateVisual({
              title: draft.title,
              bullets: draft.bullets,
              theme_style: themes[meta.theme].image_style
            }),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Visual generation timed out')), 10000)
            )
          ]);
          
          slides.push({
            layout: slot.layout,
            title: draft.title,
            bullets: draft.bullets,
            notes: draft.notes,
            chart_spec: withChart.chart_spec || null,
            image: { prompt: visual.prompt, alt: visual.alt, source: 'generated' },
            citations: draft.citations || []
          });
        } catch (slideError) {
          console.error(`[Generate Deck API] Error generating slide ${currentSlide}:`, slideError);
          // Continue with fallback slide instead of failing completely
          slides.push({
            layout: slot.layout,
            title: slot.title,
            bullets: ['Content generation in progress...'],
            notes: 'This slide content is being generated.',
            chart_spec: null,
            image: { prompt: `Visual for ${slot.title}`, alt: slot.title, source: 'generated' },
            citations: []
          });
        }
      }
    }
    
    const deck: Deck = {
      title: outline.title,
      theme: meta.theme,
      slides
    };
    
    // Generate export URLs (placeholder for now)
    const exports = {
      pptx_url: `export://deck-${Date.now()}.pptx`,
      pdf_url: `export://deck-${Date.now()}.pdf`,
      json_url: `export://deck-${Date.now()}.json`
    };
    
    const response: GenerateDeckResponse = {
      deck,
      exports
    };
    
    console.log('[Generate Deck API] Generation completed successfully');
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Generate Deck API] Generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    // Provide more detailed error messages
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isNetworkError = errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('ECONNREFUSED');
    const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('aborted');
    
    let userFriendlyError = 'Deck generation failed';
    if (isNetworkError) {
      userFriendlyError = 'Cannot connect to AI service. Please ensure Ollama is running on http://localhost:11434 or configure your LLM provider in environment variables.';
    } else if (isTimeoutError) {
      userFriendlyError = 'Request timed out. The AI service may be slow or unavailable. Please try again.';
    } else if (errorMessage) {
      userFriendlyError = `Generation failed: ${errorMessage}`;
    }
    
    return NextResponse.json(
      { 
        error: userFriendlyError,
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

