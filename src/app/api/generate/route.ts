import { NextRequest, NextResponse } from 'next/server';
import { GenerateRequestSchema, Deck, Slide, Theme } from '@/lib/schema';
import { generateOutline } from '@/lib/outline';
import { generateSlide, createTitleSlide, createAgendaSlide, createConclusionSlide, createThankYouSlide } from '@/lib/slidewriter';
import { checkRateLimit } from '@/lib/llm';
import { PresentationPlanner } from '@/lib/planner';
import { RichSlideGenerator } from '@/lib/rich-slide-generator';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = GenerateRequestSchema.parse(body);
    
    const { topic, detail, tone, audience, length, theme, enableLive, mode = 'plan' } = validatedData;

    if (mode === 'plan') {
      // Generate plan only
      console.log('Generating plan for mode:', mode);
      const planner = new PresentationPlanner();
      const plan = await planner.generatePlan({
        topic,
        detail: detail || '',
        tone: tone || 'Professional',
        audience: audience || 'General audience',
        length: length || 10,
        theme: theme || 'DeepSpace',
        includeLiveWidgets: enableLive || false,
      });

      console.log('Generated plan:', plan);
      return NextResponse.json({ plan });
    }

    // Generate outline
    const outline = await generateOutline(validatedData);
    
    // Create deck
    const deckId = `deck-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const slides: Slide[] = [];
    
    // Add title slide
    slides.push(createTitleSlide(outline.title, outline.subtitle));
    
    // Add agenda slide
    slides.push(createAgendaSlide(outline.agenda));
    
    // Generate rich content slides using the new generator
    try {
      console.log('Generating rich content slides...');
      const richGenerator = new RichSlideGenerator();
      const contentSlides = await richGenerator.generateRichSlides(
        outline.title,
        detail || '',
        theme || 'DeepSpace'
      );
      
      // Add content slides (skip title slide if present)
      const slidesToAdd = contentSlides.length > 1 ? contentSlides.slice(1) : contentSlides;
      slides.push(...slidesToAdd);
      
      console.log(`Successfully generated ${slidesToAdd.length} rich content slides`);
    } catch (error) {
      console.error('Error generating rich slides, using fallback:', error);
      
      // Fallback to original method with enhanced content
      let slideIndex = 2; // Start after title and agenda
      const totalSlides = outline.agenda.reduce((sum, item) => sum + item.slideCount, 0) + 4;
      
      for (const section of outline.agenda) {
        for (let i = 0; i < section.slideCount; i++) {
          try {
            console.log(`Generating slide ${slideIndex} for section: ${section.title}`);
            const slide = await generateSlide(
              section,
              slideIndex,
              totalSlides,
              theme || 'DeepSpace',
              enableLive || false
            );
            console.log(`Successfully generated slide ${slideIndex}:`, slide.id);
            slides.push(slide);
            slideIndex++;
          } catch (error) {
            console.error(`Error generating slide ${slideIndex}:`, error);
            // Add enhanced fallback slide with rich content
            slides.push({
              id: `slide-${Date.now()}-${slideIndex}-${Math.random().toString(36).substr(2, 9)}`,
              layout: 'title+bullets',
              animation: 'fadeIn',
              blocks: [
                {
                  type: 'Heading',
                  text: section.title,
                  animation: 'slideInFromTop'
                },
                {
                  type: 'Subheading',
                  text: section.objective,
                  animation: 'fadeIn'
                },
                {
                  type: 'Markdown',
                  md: `**Key Focus:** ${section.objective}\n\nThis section explores the essential aspects of ${section.title.toLowerCase()} and provides actionable insights for implementation.`,
                  animation: 'slideInFromLeft'
                },
                {
                  type: 'Bullets',
                  items: section.keyPoints.slice(0, 5).map(point => `• ${point}`),
                  animation: 'staggerIn'
                },
                {
                  type: 'Quote',
                  text: `"Understanding ${section.title.toLowerCase()} is crucial for success in today's dynamic environment."`,
                  author: 'Industry Expert',
                  animation: 'fadeIn'
                }
              ],
              notes: `Speaker Notes for ${section.title}:\n\nKey Talking Points:\n• ${section.objective}\n• ${section.keyPoints.slice(0, 3).join('\n• ')}\n\nEngagement Tips:\n- Start with a compelling statistic or story\n- Use specific examples and case studies\n- Encourage audience interaction with questions\n- Provide actionable takeaways\n- Connect to real-world applications`,
            });
            slideIndex++;
          }
        }
      }
    }
    
    // Add conclusion slide
    slides.push(createConclusionSlide(outline.conclusion, outline.references));
    
    // Add thank you slide
    slides.push(createThankYouSlide());
    
    const deck: Deck = {
      id: deckId,
      title: outline.title,
      subtitle: outline.subtitle,
      theme: (theme || 'DeepSpace') as Theme,
      slides,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '1',
        author: 'AI Slide Maker',
      },
    };

    return NextResponse.json({ deck });
  } catch (error) {
    console.error('Error generating deck:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'AI Slide Maker API',
    version: '1.0.0',
    endpoints: {
      generate: 'POST /api/generate',
      exportPdf: 'POST /api/export/pdf',
      exportPptx: 'POST /api/export/pptx',
      liveProxy: 'GET /api/live-proxy',
    }
  });
}
