import { NextRequest, NextResponse } from 'next/server';
import { RichSlideGenerator } from '@/lib/rich-slide-generator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, detail = '', theme = 'DeepSpace' } = body;

    if (!topic || typeof topic !== 'string') {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const generator = new RichSlideGenerator();
    const slides = await generator.generateRichSlides(topic, detail, theme);

    return NextResponse.json({ slides });
  } catch (error) {
    console.error('[generate-rich-slides] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Slide generation failed' },
      { status: 500 }
    );
  }
}
