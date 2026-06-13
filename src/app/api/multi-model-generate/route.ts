import { NextRequest, NextResponse } from 'next/server';
import { MultiModelOrchestrator } from '@/lib/multi-model/orchestrator';
import { checkRateLimit } from '@/lib/llm';
import { z } from 'zod';

// ============================================================================
// MULTI-MODEL GENERATION API ROUTE
// ============================================================================

const MultiModelRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  audience: z.string().min(1).max(100),
  tone: z.string().min(1).max(50),
  desiredSlideCount: z.number().min(4).max(50).default(10),
  theme: z.string().optional().default('professional'),
  duration: z.number().min(5).max(180).optional(),
  sources: z.array(z.string()).optional(),
  urls: z.array(z.string().url()).optional(),
  enableLive: z.boolean().optional().default(false),
  policy: z.enum(['quality', 'speed', 'cost', 'balanced', 'local-only']).optional().default('balanced'),
  generateExecutiveSummary: z.boolean().optional().default(false),
  adaptForAudience: z.object({
    targetAudience: z.string(),
    targetDuration: z.number().optional(),
  }).optional(),
});

// Module-level singleton — agents are initialized once per server process,
// not on every request (avoids 17 dynamic imports on each POST).
const orchestrator = new MultiModelOrchestrator();

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip, 10, 3600000)) { // 10 requests per hour for multi-model
      return NextResponse.json(
        { error: 'Rate limit exceeded. Multi-model generation is resource-intensive.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validatedData = MultiModelRequestSchema.parse(body);

    console.log('[Multi-Model API] Starting generation with policy:', validatedData.policy);
    
    // Generate presentation — pass all flags into the pipeline directly
    const result = await orchestrator.generatePresentation({
      topic: validatedData.topic,
      audience: validatedData.audience,
      tone: validatedData.tone,
      desiredSlideCount: validatedData.desiredSlideCount,
      theme: validatedData.theme,
      duration: validatedData.duration,
      sources: validatedData.sources,
      urls: validatedData.urls,
      enableLive: validatedData.enableLive,
      policy: validatedData.policy,
      generateExecutiveSummary: validatedData.generateExecutiveSummary,
      targetAudience: validatedData.adaptForAudience?.targetAudience,
      targetDuration: validatedData.adaptForAudience?.targetDuration,
    });

    // Return the result
    return NextResponse.json({
      success: true,
      deck: result.deck,
      metadata: result.metadata,
      executiveSummary: result.executiveSummary,
      qualityChecks: result.qualityChecks,
      audienceAdaptation: result.audienceAdaptation,
    });

  } catch (error) {
    console.error('[Multi-Model API] Generation failed:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
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
    message: 'Multi-Model AI Slide Generator API',
    version: '2.0.0',
    description: 'Advanced multi-agent slide generation with quality assurance',
    endpoints: {
      generate: 'POST /api/multi-model-generate',
      health: 'GET /api/multi-model-generate/health',
      status: 'GET /api/multi-model-generate/status',
    },
    features: [
      'Multi-agent architecture',
      'Quality assurance pipeline',
      'Fact checking and citation mapping',
      'Accessibility and design linting',
      'Executive summary generation',
      'Audience adaptation',
      'Multiple routing policies',
      'Local and cloud model support',
    ],
    policies: {
      quality: 'Prioritizes accuracy and thoroughness',
      speed: 'Prioritizes fast generation',
      cost: 'Minimizes token usage and costs',
      balanced: 'Balances quality, speed, and cost',
      'local-only': 'Uses only local models for privacy',
    },
  });
}

// Health check endpoint
export async function GET_health() {
  try {
    const status = orchestrator.getRouterStatus();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      router: status,
      agents: Object.fromEntries(orchestrator.getAgentStatus()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Status endpoint for monitoring
export async function GET_status() {
  try {
    return NextResponse.json({
      orchestrator: {
        agents: Object.fromEntries(orchestrator.getAgentStatus()),
        router: orchestrator.getRouterStatus(),
        taskHistory: Object.fromEntries(orchestrator.getTaskHistory()),
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        nodeVersion: process.version,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
