import { LLMClient, LLMConfig } from './llm';

const getLLMConfig = (): LLMConfig => ({
  provider: (process.env.LLM_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'demo',
  apiKey: process.env.LLM_API_KEY || 'ollama',
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
  model: process.env.LLM_MODEL || 'gemma3:4b',
});

const llmClient = new LLMClient(getLLMConfig());

// ─── JSON extractor ───────────────────────────────────────────────────────────
// Handles: markdown fences, preamble text, trailing text, bad escapes
function extractJSON(raw: string): any {
  if (!raw) throw new Error('Empty response');
  let s = raw.trim();

  // Remove markdown fences
  s = s.replace(/^```(?:json)?[\r\n]*/m, '').replace(/[\r\n]*```\s*$/m, '').trim();

  // Find outermost { ... }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found in response');
  s = s.slice(start, end + 1);

  // Try direct parse
  try { return JSON.parse(s); } catch {}

  // Fix common issues: unescaped newlines inside strings, trailing commas
  s = s
    .replace(/[\r\n]+/g, ' ')          // collapse newlines
    .replace(/,\s*([}\]])/g, '$1')      // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // unquoted keys

  try { return JSON.parse(s); } catch {}

  // Last resort: replace literal backslash-n, tabs
  s = s.replace(/\\n/g, ' ').replace(/\\t/g, ' ');
  return JSON.parse(s); // throws if still broken
}

// ─── Outline generation ───────────────────────────────────────────────────────
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
    slides: Array<{ title: string; layout: string; section: string }>;
  }>;
}> {
  const { slide_count, audience, tone, topic_or_prompt_or_instructions: topic } = params;

  // Keep chart slides to ~20% of total
  const chartSlides = Math.max(1, Math.round(slide_count * 0.2));
  const bulletSlides = slide_count - chartSlides;

  const prompt = `You are creating a ${slide_count}-slide presentation outline on: "${topic}"
Audience: ${audience}. Tone: ${tone}.

Return ONLY valid JSON, no other text. Use this exact format:

{
  "title": "Engaging presentation title about ${topic}",
  "sections": [
    {
      "name": "Introduction",
      "slides": [
        {"title": "Specific slide title 1", "layout": "title_bullets", "section": "Introduction"},
        {"title": "Specific slide title 2", "layout": "title_bullets", "section": "Introduction"}
      ]
    },
    {
      "name": "Main Content",
      "slides": [
        {"title": "Specific slide title 3", "layout": "title_bullets", "section": "Main Content"},
        {"title": "Data and Statistics", "layout": "chart", "section": "Main Content"},
        {"title": "Specific slide title 5", "layout": "title_bullets", "section": "Main Content"}
      ]
    },
    {
      "name": "Conclusion",
      "slides": [
        {"title": "Specific slide title 6", "layout": "title_bullets", "section": "Conclusion"}
      ]
    }
  ]
}

RULES:
- Total slides across ALL sections combined must equal EXACTLY ${slide_count}
- ${chartSlides} slide(s) should use layout "chart", the rest use "title_bullets"
- Each slide title must be specific and informative about "${topic}" — not generic like "Overview" or "Introduction"
- Make titles that reflect real subtopics of "${topic}"

JSON:`;

  try {
    const response = await llmClient.generateContent(prompt);
    const parsed = extractJSON(response);

    // Count and adjust to exact slide_count
    const allSlides: any[] = parsed.sections?.flatMap((s: any) => s.slides || []) || [];
    const got = allSlides.length;

    if (got === slide_count) return parsed;

    // Pad or trim
    if (got < slide_count) {
      const last = parsed.sections[parsed.sections.length - 1];
      for (let i = got; i < slide_count; i++) {
        last.slides.push({ title: `${topic}: Key Point ${i + 1}`, layout: 'title_bullets', section: last.name });
      }
    } else {
      let excess = got - slide_count;
      for (let si = parsed.sections.length - 1; si >= 0 && excess > 0; si--) {
        const cut = Math.min(excess, parsed.sections[si].slides.length - 1);
        if (cut > 0) { parsed.sections[si].slides.splice(-cut); excess -= cut; }
      }
    }

    return parsed;
  } catch (err) {
    console.error('[Outline] LLM failed, using smart fallback:', err);
    return buildFallbackOutline(topic, slide_count);
  }
}

function buildFallbackOutline(topic: string, count: number) {
  // Build meaningful section-based outline from the topic words
  const words = topic.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const titleWord = words.slice(0, 3).join(' ') || topic;

  const layouts = ['title_bullets','title_bullets','chart','title_bullets','title_bullets','chart','title_bullets'];
  const sections = [
    { name: 'Introduction', slides: [] as any[] },
    { name: 'Core Concepts', slides: [] as any[] },
    { name: 'Analysis & Data', slides: [] as any[] },
    { name: 'Implications', slides: [] as any[] },
    { name: 'Conclusion', slides: [] as any[] },
  ];

  const slideTitleTemplates = [
    `Introduction to ${topic}`,
    `Historical Background of ${titleWord}`,
    `Key Components of ${topic}`,
    `${titleWord}: Data and Statistics`,
    `Challenges in ${topic}`,
    `${titleWord}: Comparative Analysis`,
    `Applications of ${topic}`,
    `${titleWord}: Case Studies`,
    `Impact of ${topic}`,
    `${titleWord}: Future Directions`,
    `Ethical Considerations in ${topic}`,
    `${titleWord}: Policy Implications`,
    `Best Practices in ${topic}`,
    `${titleWord}: Research Findings`,
    `Recommendations for ${topic}`,
    `Summary and Key Takeaways`,
  ];

  let idx = 0;
  const sectionSizes = distributeSections(count, sections.length);
  for (let si = 0; si < sections.length && idx < count; si++) {
    const size = sectionSizes[si];
    for (let j = 0; j < size && idx < count; j++) {
      sections[si].slides.push({
        title: slideTitleTemplates[idx] || `${topic}: Point ${idx + 1}`,
        layout: layouts[idx % layouts.length],
        section: sections[si].name,
      });
      idx++;
    }
  }

  return {
    title: `${topic}: A Comprehensive Overview`,
    sections: sections.filter(s => s.slides.length > 0),
  };
}

function distributeSections(total: number, sectionCount: number): number[] {
  const base = Math.floor(total / sectionCount);
  const rem = total % sectionCount;
  return Array.from({ length: sectionCount }, (_, i) => base + (i < rem ? 1 : 0));
}

// ─── Slide content generation ─────────────────────────────────────────────────
export async function generateSlide(params: {
  slide_context: any;
  per_slide_extracted_text_or_empty: string;
  text_density?: string;
}): Promise<{
  title: string;
  bullets: string[];
  notes: string;
  chart_spec: any;
  diagram_spec: any;
  citations: string[];
}> {
  const density = params.text_density || 'medium';
  const bulletCount = density === 'low' ? 2 : density === 'text_heavy' ? 6 : 4;
  const isChart = params.slide_context.layout === 'chart';
  const slideTitle = params.slide_context.title;

  const chartExample = isChart
    ? `{"type":"bar","title":"${slideTitle} — Data","labels":["2020","2021","2022","2023","2024"],"datasets":[{"label":"Value","data":[42,55,61,74,88]}],"caption":"Trend from 2020 to 2024"}`
    : 'null';

  const prompt = `Write content for a presentation slide titled: "${slideTitle}"

Return ONLY this JSON:
{
  "title": "${slideTitle}",
  "bullets": [
    "**Key term 1**: specific fact or statistic about ${slideTitle}",
    "**Key term 2**: another specific fact with a number",
    "**Key term 3**: another point with evidence",
    "**Key term 4**: concluding insight"
  ],
  "chart_spec": ${chartExample},
  "diagram_spec": null,
  "notes": "",
  "citations": []
}

Rules:
- Write EXACTLY ${bulletCount} bullets in the array
- Each bullet MUST be about "${slideTitle}" with real, specific information
- Bold the key term in each bullet using **asterisks**
- Include numbers, percentages, or years where relevant
- No generic phrases like "key concept" or "core insight"
${isChart ? `- chart_spec: fill in with real data relevant to "${slideTitle}"` : '- chart_spec: must be null'}

JSON:`;

  try {
    const response = await llmClient.generateContent(prompt);
    const parsed = extractJSON(response);

    // Validate and fix
    if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) {
      throw new Error('No bullets in response');
    }
    parsed.title = parsed.title || slideTitle;
    parsed.notes = parsed.notes || '';
    parsed.citations = parsed.citations || [];
    parsed.diagram_spec = parsed.diagram_spec || null;
    if (!isChart) parsed.chart_spec = null;

    return parsed;
  } catch (err) {
    console.error(`[Slide] "${slideTitle}" failed:`, err);
    // Retry once with an even simpler prompt
    try {
      return await generateSlideSimple(slideTitle, bulletCount, isChart);
    } catch {
      return buildFallbackSlide(slideTitle, density);
    }
  }
}

async function generateSlideSimple(title: string, bulletCount: number, isChart: boolean): Promise<any> {
  const prompt = `List ${bulletCount} facts about "${title}". Be specific with numbers and statistics.
Format as JSON: {"title":"${title}","bullets":["fact 1","fact 2","fact 3","fact 4"],"chart_spec":null,"diagram_spec":null,"notes":"","citations":[]}
JSON:`;

  const response = await llmClient.generateContent(prompt);
  const parsed = extractJSON(response);
  if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) throw new Error('retry failed');

  // Bold first word of each bullet if not already bolded
  parsed.bullets = parsed.bullets.map((b: string) => {
    if (b.startsWith('**')) return b;
    const colonIdx = b.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30) {
      return `**${b.slice(0, colonIdx)}**:${b.slice(colonIdx + 1)}`;
    }
    return b;
  });

  if (!isChart) parsed.chart_spec = null;
  parsed.diagram_spec = null;
  return parsed;
}

function buildFallbackSlide(title: string, density: string) {
  // This fallback is now only hit if both LLM attempts fail
  const count = density === 'low' ? 2 : density === 'text_heavy' ? 6 : 4;
  const bullets = Array.from({ length: count }, (_, i) => {
    const terms = ['Overview', 'Key Finding', 'Impact', 'Application', 'Evidence', 'Conclusion'];
    return `**${terms[i] || 'Point ' + (i+1)}**: ${title} — point ${i+1} (LLM unavailable)`;
  });
  return { title, bullets, notes: '', chart_spec: null, diagram_spec: null, citations: [] };
}

// ─── Stub exports (used by route but not needed in new flow) ──────────────────
export function harvestFactsForSlide(_: string, __: string): string { return ''; }
export function tableMatchesTitle(_: string, __: string): boolean { return false; }
export function tableForTitle(_: string, __: string): any { return null; }
export function attachChartSpec(draft: any, _: any): any { return draft; }
export async function parseDocuments(docUrls: string[]): Promise<string> {
  if (!docUrls?.length) return '';
  return `Documents: ${docUrls.map(u => u.split('/').pop()).join(', ')}`;
}

// Keep generateVisual as a no-op so the route import doesn't break
export async function generateVisual(_: any): Promise<{ prompt: string; alt: string }> {
  return { prompt: '', alt: '' };
}
