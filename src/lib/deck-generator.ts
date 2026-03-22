import { LLMClient, LLMConfig } from './llm';

// Initialize LLM client with environment variables
const getLLMConfig = (): LLMConfig => {
  const provider = (process.env.LLM_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'demo';
  const apiKey = process.env.LLM_API_KEY || 'ollama';
  const baseUrl = process.env.LLM_BASE_URL || 'http://localhost:11434';
  const model = process.env.LLM_MODEL || 'gemma3:4b';
  
  return {
    provider,
    apiKey,
    baseUrl,
    model
  };
};

const llmClient = new LLMClient(getLLMConfig());

// Robustly extract and clean JSON from LLM responses
function cleanJSONResponse(response: string): string {
  let cleaned = response.trim();

  // Strip markdown fences
  cleaned = cleaned.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();

  // Strip conversational preamble before first {
  const braceIdx = cleaned.indexOf('{');
  if (braceIdx > 0) cleaned = cleaned.slice(braceIdx);

  // Strip anything after the last }
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace >= 0 && lastBrace < cleaned.length - 1) cleaned = cleaned.slice(0, lastBrace + 1);

  // Try to parse as-is
  try { JSON.parse(cleaned); return cleaned; } catch {}

  // Fix common escaping issues
  cleaned = cleaned
    .replace(/\r\n/g, ' ').replace(/\n/g, ' ')
    .replace(/\\n/g, ' ')
    .replace(/\t/g, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']');

  try { JSON.parse(cleaned); return cleaned; } catch (e) {
    console.warn('[JSON] Parse failed after cleaning:', (e as Error).message);
    return cleaned;
  }
}

export async function generateOutline(params: {
  slide_count: number;
  audience: string;
  tone: string;
  topic_or_prompt_or_instructions: string;
  doc_summary_or_empty: string;
}): Promise<{
  title: string;
  sections: Array<{
    name: string;
    slides: Array<{
      title: string;
      layout: string;
      section: string;
    }>;
  }>;
}> {
  const prompt = `You are a world-class presentation strategist creating engaging, story-driven outlines.

RULES FOR ENGAGING PRESENTATIONS:
1. **Specific, Action-Oriented Titles**: Don't use generic titles
   ❌ Bad: "Introduction", "Overview", "Key Points"
   ✅ Good: "**AI Revolution**: Transforming Healthcare in 2024", "Why **85% of Hospitals** Are Investing in AI"

2. **Story Arc**: Structure slides to tell a compelling story
   - Hook: Start with a provocative question or statistic
   - Context: Set the stage with current situation
   - Insight: Deep dive into 2-3 key areas
   - Impact: Show results, data, case studies
   - Action: Clear takeaways and next steps

3. **Visual Variety**: Mix layout types
   - title_bullets: Most slides (content-heavy)
   - chart: Data-driven insights (2-3 per deck)
   - image_full: Powerful visuals for key concepts
   - quote: Expert opinions or testimonials
   - two_column: Comparisons (before/after, pros/cons)

4. **Audience-Specific**: Tailor depth and terminology
   - Executives: ROI, strategy, high-level impact
   - Technical: Implementation, architecture, specs
   - General: Simple language, analogies, real-world examples
   - Students: Educational, step-by-step, interactive

TASK:
Create an outline for: """${params.topic_or_prompt_or_instructions}"""

CRITICAL CONSTRAINT:
- You MUST create EXACTLY ${params.slide_count} slides - no more, no less. Count carefully.
- The total number of slides across all sections must equal ${params.slide_count} exactly.

CONSTRAINTS:
- Total slides: ${params.slide_count} (EXACTLY - this is mandatory)
- Audience: ${params.audience}
- Tone: ${params.tone}
- Document summary: ${params.doc_summary_or_empty || 'None provided'}

OUTPUT FORMAT (JSON only):
{
  "title": "**Engaging Main Title** with Topic",
  "sections": [
    {
      "name": "Hook & Context",
      "slides": [
        {"title": "Provocative opening question or stat", "layout": "title_bullets", "section": "Hook & Context"},
        {"title": "Current landscape", "layout": "title_bullets", "section": "Hook & Context"}
      ]
    },
    {
      "name": "Deep Dive",
      "slides": [
        {"title": "First key area with specifics", "layout": "title_bullets", "section": "Deep Dive"},
        {"title": "Data visualization", "layout": "chart", "section": "Deep Dive"},
        {"title": "Second key area", "layout": "title_bullets", "section": "Deep Dive"}
      ]
    },
    {
      "name": "Impact & Action",
      "slides": [
        {"title": "Results and outcomes", "layout": "title_bullets", "section": "Impact & Action"},
        {"title": "Key takeaways", "layout": "title_bullets", "section": "Impact & Action"}
      ]
    }
  ]
}

IMPORTANT: Before returning, count the total number of slides in your "sections" array. It must equal ${params.slide_count} exactly. Adjust the number of slides in each section to match this requirement.

Return ONLY valid JSON with specific, engaging titles for the given topic.`;

  try {
    const response = await llmClient.generateContent(prompt);
    const cleaned = cleanJSONResponse(response);
    const parsed = JSON.parse(cleaned);
    
    // Validate and enforce exact slide count
    const totalSlides = parsed.sections?.reduce((sum: number, section: any) => sum + (section.slides?.length || 0), 0) || 0;
    
    if (totalSlides !== params.slide_count) {
      console.warn(`[Outline] Generated ${totalSlides} slides, but need exactly ${params.slide_count}. Adjusting...`);
      
      // Adjust slide count to match exactly
      if (totalSlides < params.slide_count) {
        // Add slides to the last section
        const lastSection = parsed.sections[parsed.sections.length - 1];
        const needed = params.slide_count - totalSlides;
        for (let i = 0; i < needed; i++) {
          lastSection.slides.push({
            title: `Additional Key Point ${i + 1}`,
            layout: 'title_bullets',
            section: lastSection.name
          });
        }
      } else if (totalSlides > params.slide_count) {
        // Remove slides from the last section
        const lastSection = parsed.sections[parsed.sections.length - 1];
        const toRemove = totalSlides - params.slide_count;
        lastSection.slides = lastSection.slides.slice(0, lastSection.slides.length - toRemove);
      }
    }
    
    // Final validation
    const finalCount = parsed.sections.reduce((sum: number, section: any) => sum + (section.slides?.length || 0), 0);
    if (finalCount !== params.slide_count) {
      console.error(`[Outline] Failed to adjust to exact count. Generated ${finalCount}, needed ${params.slide_count}`);
    }
    
    return parsed;
  } catch (error) {
    console.error('Outline generation failed:', error);
    // Enhanced fallback with exact slide count
    const topic = params.topic_or_prompt_or_instructions;
    const slideCount = params.slide_count;
    
    // Create sections that add up to exactly slideCount
    const sections = [];
    let remaining = slideCount;
    
    // Opening section (2 slides)
    const openingSlides = Math.min(2, remaining);
    sections.push({
      name: 'Opening',
      slides: Array.from({ length: openingSlides }, (_, i) => ({
        title: i === 0 ? `**${topic}**: What You Need to Know` : 'Current State & Trends',
        layout: 'title_bullets',
        section: 'Opening'
      }))
    });
    remaining -= openingSlides;
    
    // Analysis section (remaining - 2 for conclusion)
    const analysisSlides = Math.max(1, remaining - 2);
    sections.push({
      name: 'Analysis',
      slides: Array.from({ length: analysisSlides }, (_, i) => ({
        title: i === 0 ? 'Key Challenges & Opportunities' : i === 1 ? 'Data-Driven Insights' : `Key Point ${i + 1}`,
        layout: i === 1 && analysisSlides > 1 ? 'chart' : 'title_bullets',
        section: 'Analysis'
      }))
    });
    remaining -= analysisSlides;
    
    // Conclusion section (remaining slides)
    if (remaining > 0) {
      sections.push({
        name: 'Conclusion',
        slides: Array.from({ length: remaining }, (_, i) => ({
          title: i === 0 ? 'Impact & Results' : 'Next Steps & Takeaways',
          layout: 'title_bullets',
          section: 'Conclusion'
        }))
      });
    }
    
    return {
      title: `**${topic}**: Key Insights & Analysis`,
      sections
    };
  }
}

function getBulletInstructions(density: string): string {
  switch (density) {
    case 'low':
      return `BULLET COUNT: 1-2 bullets ONLY. Each bullet is short (≤12 words), punchy, and impactful.
DIAGRAM: Always include a diagram_spec (flowchart, comparison, or timeline) instead of text.`;
    case 'text_heavy':
      return `BULLET COUNT: 5-7 bullets. Each bullet is a full sentence (15-30 words) with specific data, citations, or technical depth.
DIAGRAM: Include diagram_spec when relevant.`;
    default: // medium
      return `BULLET COUNT: 3-4 bullets. Each bullet is concise but informative (10-20 words) with at least one data point.
DIAGRAM: Include diagram_spec when it adds clarity.`;
  }
}

export async function generateSlide(params: {
  slide_context: any;
  per_slide_extracted_text_or_empty: string;
  text_density?: string;
}): Promise<{
  title: string;
  bullets: string[];
  notes: string;
  chart_spec: any;
  diagram_spec?: any;
  citations: string[];
  image?: {
    prompt: string;
    alt: string;
    source: string;
  };
}> {
  const density = params.text_density || 'medium';
  const isChartSlide = params.slide_context.layout === 'chart';
  const bulletCount = density === 'low' ? 2 : density === 'text_heavy' ? 6 : 4;

  const prompt = `Write JSON for one presentation slide. Topic: "${params.slide_context.title}". Section: "${params.slide_context.section || 'Main'}". Audience: ${params.slide_context.audience || 'general'}.

Return ONLY this JSON (no extra text, no markdown):
{
  "title": "specific informative title with **bold key term**",
  "bullets": ["**key term**: specific fact with number", "..."],
  "notes": "",
  "chart_spec": ${isChartSlide ? '{"type":"bar","title":"...","labels":["A","B","C","D"],"datasets":[{"label":"Value","data":[40,65,52,78]}],"caption":"..."}' : 'null'},
  "diagram_spec": null,
  "citations": []
}

Rules:
- bullets array must have exactly ${bulletCount} items
- Each bullet starts with **bold term**: then a fact
- No emojis
- ${isChartSlide ? 'Fill in chart_spec with realistic data for the topic' : 'chart_spec must be null'}
- diagram_spec is null unless a flowchart/timeline genuinely helps (keep it null for simplicity)

Output JSON only (no extra text):`;

  try {
    const response = await llmClient.generateContent(prompt);
    const cleaned = cleanJSONResponse(response);
    const parsed = JSON.parse(cleaned);

    // Normalise fields
    if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) {
      parsed.bullets = [`**${params.slide_context.title}**: Key insight`, '**Impact**: Measurable outcome'];
    }
    if (!parsed.title) parsed.title = params.slide_context.title;
    if (!parsed.notes) parsed.notes = '';
    if (!parsed.citations) parsed.citations = [];
    if (!parsed.diagram_spec) parsed.diagram_spec = null;
    // Remove image field - we don't use it in the new SlideCanvas
    delete parsed.image;

    return parsed;
  } catch (error) {
    console.error('Slide generation failed:', error);
    const topic = params.slide_context.title || 'Key Concepts';
    const density = params.text_density || 'medium';
    const bullets = density === 'low'
      ? [`**${topic}**: Core insight`, `**Impact**: Measurable outcome`]
      : density === 'text_heavy'
      ? [
          `**Core Concept**: ${topic} represents a fundamental advancement in the field, with significant implications for practice and theory.`,
          `**Key Metrics**: Quantitative analysis demonstrates measurable improvements across multiple dimensions of performance.`,
          `**Methodology**: Rigorous systematic review of peer-reviewed literature supports these findings.`,
          `**Applications**: Real-world deployment reveals both opportunities and constraints in current implementations.`,
          `**Future Directions**: Emerging research suggests several promising avenues for further investigation.`
        ]
      : [
          `**Core Concept**: ${topic} fundamentals`,
          `**Key Metrics**: Measurable outcomes and benchmarks`,
          `**Innovation**: Latest developments and breakthroughs`
        ];
    return {
      title: `**${topic}**: Overview`,
      bullets,
      notes: '',
      chart_spec: null,
      diagram_spec: null,
      citations: generateCitations(topic),
      image: {
        prompt: `Scholarly diagram showing ${topic} with clean, academic illustration style`,
        alt: `${topic} concept diagram`,
        source: generateUnsplashUrl(topic)
      }
    };
  }
}

// Helper function to generate basic citations based on slide content
function generateCitations(topic: string): string[] {
  // Generate generic but plausible citations
  // In a full implementation, this would extract actual sources from research
  const year = new Date().getFullYear();
  return [
    `Industry research on ${topic}, ${year}`,
    `Market analysis and trends, ${year - 1}-${year}`
  ];
}

// Helper function to generate Unsplash image URL
function generateUnsplashUrl(topic: string): string {
  // Extract keywords from topic
  const keywords = topic
    .replace(/[^\w\s]/g, '') // Remove special chars
    .split(' ')
    .filter(word => word.length > 3) // Only meaningful words
    .slice(0, 3) // Max 3 keywords
    .join(',');
  
  // Fallback if no keywords
  const searchTerm = keywords || 'business,presentation,professional';
  
  // Use Unsplash Source API for random relevant images
  return `https://source.unsplash.com/800x600/?${encodeURIComponent(searchTerm)}`;
}

export async function generateVisual(params: {
  title: string;
  bullets: string[];
  theme_style: string;
}): Promise<{
  prompt: string;
  alt: string;
}> {
  const prompt = `Task: Produce an image prompt for a slide.
Style: ${params.theme_style} (e.g., "Deep Space: dark, subtle stars, neon accents, high contrast, minimalist").
Avoid text inside images.

Input:
SLIDE_TITLE: "${params.title}"
SLIDE_BULLETS: ${JSON.stringify(params.bullets)}

Output:
{ "prompt": "..." , "alt": "..." }`;

  try {
    const response = await llmClient.generateContent(prompt);
    const cleaned = cleanJSONResponse(response);
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (error) {
    console.error('Visual generation failed:', error);
    // Fallback visual
    return {
      prompt: `Minimalist illustration of ${params.title}`,
      alt: `Visual representation of ${params.title}`
    };
  }
}

// Helper functions
export function harvestFactsForSlide(docSummary: string, title: string): string {
  // TODO: Implement fact harvesting from document summary
  return '';
}

export function tableMatchesTitle(docSummary: string, title: string): boolean {
  // TODO: Implement table matching logic
  return false;
}

export function tableForTitle(docSummary: string, title: string): any {
  // TODO: Implement table extraction
  return null;
}

export function attachChartSpec(draft: any, table: any): any {
  // TODO: Implement chart spec attachment
  return draft;
}

export async function parseDocuments(docUrls: string[]): Promise<string> {
  if (!docUrls || docUrls.length === 0) {
    return '';
  }

  // For now, create a basic summary from file names and provide instructions
  // In a full implementation, this would use a PDF/document parsing library
  const fileNames = docUrls.map(url => {
    const name = url.split('/').pop() || 'document';
    return name.replace(/\.[^.]+$/, ''); // Remove extension
  });

  const summary = `Documents uploaded: ${fileNames.join(', ')}. 
  
Note: Document parsing is currently in development. For best results:
- Provide a detailed prompt describing the document content
- Include key topics, data, and insights you want in the presentation
- Specify the document structure if relevant (e.g., "The document contains market analysis, competitor data, and growth projections")`;

  return summary;
}
