import { z } from 'zod';

export type Theme = "DeepSpace" | "Ultraviolet" | "Minimal" | "Corporate" | "NeonGrid" | "Academic" | "Conference" | "Journal" | "Thesis" | "Beamer";

export type AnimationType = 
  | "fadeIn" 
  | "slideInFromTop" 
  | "slideInFromBottom" 
  | "slideInFromLeft" 
  | "slideInFromRight" 
  | "scaleIn" 
  | "bounceIn" 
  | "staggerIn" 
  | "pulse" 
  | "hero";

export const LiveWidgetSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('LiveChart'),
    apiUrl: z.string().url(),
    xKey: z.string(),
    yKey: z.string(),
    refreshMs: z.number().min(1000),
  }),
  z.object({
    kind: z.literal('Ticker'),
    symbols: z.array(z.string()),
    refreshMs: z.number().min(1000),
  }),
  z.object({
    kind: z.literal('Countdown'),
    targetIso: z.string(),
  }),
  z.object({
    kind: z.literal('Map'),
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    zoom: z.number().min(1).max(20).optional(),
  }),
  z.object({
    kind: z.literal('Iframe'),
    src: z.string().url(),
    height: z.number().min(100).max(2000).optional(),
  }),
]);

export const ChartDataSchema = z.object({
  labels: z.array(z.string()),
  datasets: z.array(z.object({
    label: z.string(),
    data: z.array(z.number()),
    backgroundColor: z.array(z.string()).optional(),
    borderColor: z.array(z.string()).optional(),
    borderWidth: z.number().optional(),
  })),
});

export const SlideBlockSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Heading'),
    text: z.string().max(100),
    animation: z.enum(['fadeIn', 'slideInFromTop', 'bounceIn', 'scaleIn']).optional(),
  }),
  z.object({
    type: z.literal('Subheading'),
    text: z.string().max(200),
    animation: z.enum(['fadeIn', 'slideInFromBottom', 'slideInFromLeft']).optional(),
  }),
  z.object({
    type: z.literal('Markdown'),
    md: z.string(),
    animation: z.enum(['fadeIn', 'slideInFromLeft', 'slideInFromRight']).optional(),
  }),
  z.object({
    type: z.literal('Bullets'),
    items: z.array(z.string()).max(8),
    animation: z.enum(['staggerIn', 'slideInFromLeft', 'fadeIn']).optional(),
  }),
  z.object({
    type: z.literal('Image'),
    src: z.string().url(),
    alt: z.string(),
    caption: z.string().optional(),
    animation: z.enum(['scaleIn', 'fadeIn', 'slideInFromLeft', 'slideInFromRight']).optional(),
  }),
  z.object({
    type: z.literal('Quote'),
    text: z.string(),
    author: z.string().optional(),
    animation: z.enum(['fadeIn', 'slideInFromBottom', 'scaleIn']).optional(),
  }),
  z.object({
    type: z.literal('Code'),
    code: z.string(),
    language: z.string().optional(),
    animation: z.enum(['slideInFromLeft', 'fadeIn']).optional(),
  }),
  z.object({
    type: z.literal('Chart'),
    chartType: z.enum(['bar', 'line', 'pie', 'doughnut', 'radar']),
    title: z.string().optional(),
    data: ChartDataSchema,
    animation: z.enum(['scaleIn', 'slideInFromBottom', 'fadeIn']).optional(),
  }),
  z.object({
    type: z.literal('Live'),
    widget: LiveWidgetSchema,
    animation: z.enum(['pulse', 'fadeIn']).optional(),
  }),
]);

export const SlideSchema = z.object({
  id: z.string(),
  layout: z.enum([
    'title',
    'title+bullets', 
    'two-col',
    'media-left',
    'media-right',
    'quote',
    'chart',
    'end'
  ]),
  animation: z.enum(['fadeIn', 'slideInFromTop', 'slideInFromBottom', 'hero']).optional(),
  blocks: z.array(SlideBlockSchema),
  notes: z.string(),
});

export const DeckSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  theme: z.enum(['DeepSpace', 'Ultraviolet', 'Minimal', 'Corporate', 'NeonGrid', 'Academic', 'Conference', 'Journal', 'Thesis', 'Beamer']).optional(),
  slides: z.array(SlideSchema),
  metadata: z.object({
    createdAt: z.string(),
    updatedAt: z.string(),
    version: z.string(),
    author: z.string().optional(),
  }),
});

export const OutlineItemSchema = z.object({
  title: z.string(),
  objective: z.string(),
  slideCount: z.number().min(1).max(20),
  keyPoints: z.array(z.string()).min(1).max(10),
});

export const OutlineSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  agenda: z.array(OutlineItemSchema),
  conclusion: z.string(),
  references: z.array(z.string()),
});

export const GenerateRequestSchema = z.object({
  topic: z.string().min(1).max(500),
  detail: z.string().max(2000).optional(),
  tone: z.string().optional(),
  audience: z.string().optional(),
  length: z.number().min(3).max(50).optional(),
  theme: z.enum(['DeepSpace', 'Ultraviolet', 'Minimal', 'Corporate', 'NeonGrid', 'Academic', 'Conference', 'Journal', 'Thesis', 'Beamer']).optional(),
  enableLive: z.boolean().optional(),
  mode: z.enum(['plan', 'execute']).default('plan'),
});

export const PlanningStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  estimatedTime: z.string(),
  dependencies: z.array(z.string()),
});

export const PresentationPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  overview: z.string(),
  totalSlides: z.number(),
  estimatedDuration: z.string(),
  priority: z.enum(['low', 'medium', 'high']),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  steps: z.array(PlanningStepSchema),
});

export const ExecutionStateSchema = z.object({
  plan: PresentationPlanSchema,
  currentStep: z.string().optional(),
  progress: z.number().min(0).max(100),
  logs: z.array(z.object({
    timestamp: z.string(),
    level: z.enum(['info', 'warning', 'error', 'success']),
    step: z.string(),
    message: z.string(),
  })),
  deck: DeckSchema.optional(),
});

export type LiveWidget = z.infer<typeof LiveWidgetSchema>;
export type SlideBlock = z.infer<typeof SlideBlockSchema>;
export type Slide = z.infer<typeof SlideSchema>;
export type Deck = z.infer<typeof DeckSchema>;
export type OutlineItem = z.infer<typeof OutlineItemSchema>;
export type Outline = z.infer<typeof OutlineSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type PlanningStep = z.infer<typeof PlanningStepSchema>;
export type PresentationPlan = z.infer<typeof PresentationPlanSchema>;
export type ExecutionState = z.infer<typeof ExecutionStateSchema>;
export type ChartData = z.infer<typeof ChartDataSchema>;
