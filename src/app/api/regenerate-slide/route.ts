import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SlideRegeneratorAgent } from '@/lib/multi-model/agents/slide-regenerator';
import { getStandaloneModel } from '@/lib/multi-model/standalone-model';

const RequestSchema = z.object({
  deck: z.object({
    title: z.string(),
    theme: z.string(),
    slides: z.array(z.any()),
  }),
  slideIndex: z.number().int().min(0),
  feedback: z.string().min(1).max(500),
  targetLayout: z.string().optional(),
  text_density: z.enum(['low', 'medium', 'text_heavy']).default('medium'),
  content_format: z.enum(['bullets', 'paragraph', 'mixed']).default('mixed'),
});

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { deck, slideIndex, feedback, targetLayout, text_density, content_format } = parsed.data;

  if (slideIndex >= deck.slides.length) {
    return NextResponse.json({ error: `slideIndex ${slideIndex} out of range (deck has ${deck.slides.length} slides)` }, { status: 400 });
  }

  const agent = new SlideRegeneratorAgent();
  agent.setModel(getStandaloneModel('fast'));

  try {
    const result = await agent.execute({ deck, slideIndex, feedback, targetLayout, text_density, content_format });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[regenerate-slide] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Regeneration failed' }, { status: 500 });
  }
}
