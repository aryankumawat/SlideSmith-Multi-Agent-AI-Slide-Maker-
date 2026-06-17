import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ContentRepurposerAgent } from '@/lib/multi-model/agents/content-repurposer';
import { getStandaloneModel } from '@/lib/multi-model/standalone-model';

const RequestSchema = z.object({
  deck: z.object({
    title: z.string(),
    slides: z.array(z.object({
      title: z.string(),
      bullets: z.array(z.string()).optional(),
      paragraph: z.string().optional(),
      notes: z.string().optional(),
      stat_blocks: z.array(z.object({ value: z.string(), label: z.string() })).nullable().optional(),
    })),
  }),
  formats: z.array(z.enum(['linkedin', 'twitter_thread', 'blog', 'email'])).min(1),
  tone: z.string().optional(),
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

  const agent = new ContentRepurposerAgent();
  agent.setModel(getStandaloneModel('quality'));

  try {
    const result = await agent.execute(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[repurpose] Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Repurposing failed' }, { status: 500 });
  }
}
