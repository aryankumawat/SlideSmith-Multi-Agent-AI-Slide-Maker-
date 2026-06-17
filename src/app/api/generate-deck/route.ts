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
  audience: z.enum(['general', 'executives', 'technical', 'students', 'researchers']).default('general'),
  slide_count: z.number().min(3).max(50).default(10),
  theme: z.enum(['deep_space', 'ultra_violet', 'minimal', 'corporate', 'academic', 'navy_gold']).default('academic'),
  text_density: z.enum(['low', 'medium', 'text_heavy']).default('medium'),
  content_format: z.enum(['bullets', 'paragraph', 'mixed']).default('mixed'),
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
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  paragraph?: string;
  content_format?: 'bullets' | 'paragraph' | 'mixed';
  stat_blocks?: Array<{ value: string; label: string }> | null;
  cards?: Array<{ icon: string; title: string; description: string }> | null;
  notes?: string;
  chart_spec?: ChartSpec | null;
  diagram_spec?: any | null;
  image?: { prompt: string; alt: string; source: string; url?: string };
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
const themes: Record<string, { bg: string; surface: string; primary: string; accent: string; text: string; muted: string; font: string; image_style: string }> = {
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
  },
  academic: {
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    primary: '#1A3A5C',
    accent: '#C0392B',
    text: '#1A1A1A',
    muted: '#5A6A7A',
    font: 'Georgia, "Times New Roman", serif',
    image_style: 'scholarly, clean white background, academic diagrams, scientific illustrations'
  },
  navy_gold: {
    bg: '#0A1628',
    surface: '#0F2040',
    primary: '#F4C430',
    accent: '#E8A020',
    text: '#F0F4F8',
    muted: '#8EA8C3',
    font: 'Georgia, "Palatino Linotype", serif',
    image_style: 'prestigious, navy and gold, formal, institutional'
  }
};

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  let body: any;
  let validatedData: z.infer<typeof GenerateDeckRequestSchema>;

  try {
    body = await request.json();
    validatedData = GenerateDeckRequestSchema.parse(body);
  } catch (parseError) {
    return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
  }

  const meta = {
    slide_count: validatedData.slide_count,
    audience: validatedData.audience,
    tone: validatedData.tone,
    theme: validatedData.theme,
    text_density: validatedData.text_density,
    content_format: validatedData.content_format,
    live_widgets: validatedData.live_widgets,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {}
      };

      try {
        send({ type: 'planning', message: 'Planning your presentation…', progress: 3 });

        let docSummary = '';
        if (validatedData.mode === 'doc_to_deck' && validatedData.assets?.doc_urls) {
          docSummary = await parseDocuments(validatedData.assets.doc_urls);
        }

        const outline = await Promise.race([
          generateOutline({
            slide_count: meta.slide_count,
            audience: meta.audience,
            tone: meta.tone,
            topic_or_prompt_or_instructions: validatedData.topic_or_prompt || validatedData.instructions || '',
            doc_summary_or_empty: docSummary,
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Outline generation timed out after 60 seconds')), 60000)
          ),
        ]);

        // Normalise slide count
        const totalSlidesInOutline = outline.sections.reduce((s, sec) => s + sec.slides.length, 0);
        if (totalSlidesInOutline < meta.slide_count) {
          const last = outline.sections[outline.sections.length - 1];
          for (let i = 0; i < meta.slide_count - totalSlidesInOutline; i++) {
            last.slides.push({ title: `Key Point ${i + 1}`, layout: 'title_bullets', section: last.name });
          }
        } else if (totalSlidesInOutline > meta.slide_count) {
          const last = outline.sections[outline.sections.length - 1];
          last.slides = last.slides.slice(0, last.slides.length - (totalSlidesInOutline - meta.slide_count));
        }

        const totalSlides = outline.sections.reduce((s, sec) => s + sec.slides.length, 0);
        const slideTopics = outline.sections.flatMap(sec => sec.slides.map(s => s.title));

        send({
          type: 'outline',
          title: outline.title,
          totalSlides,
          slideTopics,
          progress: 10,
        });

        const slides: Slide[] = [];
        const themeConfig = themes[meta.theme] || themes['academic'];

        for (const section of outline.sections) {
          for (const slot of section.slides) {
            const idx = slides.length + 1;

            try {
              const perSlideFacts = docSummary ? harvestFactsForSlide(docSummary, slot.title) : '';
              const draft = await Promise.race([
                generateSlide({
                  slide_context: slot,
                  per_slide_extracted_text_or_empty: perSlideFacts,
                  text_density: meta.text_density,
                  content_format: meta.content_format,
                }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error(`Slide timed out: ${slot.title}`)), 90000)
                ),
              ]);

              let withChart = draft;
              if (!draft.chart_spec && tableMatchesTitle(docSummary, slot.title)) {
                withChart = attachChartSpec(draft, tableForTitle(docSummary, slot.title));
              }

              const visual = await Promise.race([
                generateVisual({ title: draft.title, bullets: draft.bullets, theme_style: themeConfig.image_style }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Visual timed out')), 10000)
                ),
              ]);

              slides.push({
                layout: slot.layout as Slide['layout'],
                title: draft.title,
                subtitle: draft.subtitle,
                bullets: draft.bullets,
                stat_blocks: draft.stat_blocks,
                cards: draft.cards,
                notes: draft.notes,
                chart_spec: withChart.chart_spec || null,
                diagram_spec: draft.diagram_spec || null,
                image: { prompt: visual.prompt, alt: visual.alt, source: 'generated', url: visual.url },
                citations: draft.citations || [],
              });
            } catch {
              slides.push({
                layout: slot.layout as Slide['layout'],
                title: slot.title,
                bullets: ['Content generation in progress…'],
                notes: '',
                chart_spec: null,
                image: { prompt: '', alt: slot.title, source: 'generated' },
                citations: [],
              });
            }

            send({
              type: 'slide',
              index: idx,
              title: slot.title,
              totalSlides,
              progress: Math.round(10 + (idx / totalSlides) * 85),
            });
          }
        }

        const deck: Deck = { title: outline.title, theme: meta.theme, slides };
        send({ type: 'complete', deck, progress: 100 });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        const isNetwork = msg.includes('fetch') || msg.includes('ECONNREFUSED') || msg.includes('network');
        const isTimeout = msg.includes('timeout') || msg.includes('aborted');
        send({
          type: 'error',
          message: isNetwork
            ? 'Cannot connect to AI service. Make sure Ollama is running (ollama serve).'
            : isTimeout
            ? 'Request timed out — the AI service may be slow. Try again.'
            : `Generation failed: ${msg}`,
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

