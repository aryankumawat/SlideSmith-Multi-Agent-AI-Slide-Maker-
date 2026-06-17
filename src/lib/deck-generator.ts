import { LLMClient, LLMConfig } from './llm';

const getLLMConfig = (): LLMConfig => ({
  provider: (process.env.LLM_PROVIDER || 'ollama') as 'openai' | 'ollama' | 'demo',
  apiKey: process.env.LLM_API_KEY || 'ollama',
  baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
  model: process.env.LLM_MODEL || 'gemma3:4b',
});

const llmClient = new LLMClient(getLLMConfig());

// ─── JSON extractor ────────────────────────────────────────────────────────────
function extractJSON(raw: string): any {
  if (!raw) throw new Error('Empty response');
  let s = raw.trim();
  s = s.replace(/^```(?:json)?[\r\n]*/m, '').replace(/[\r\n]*```\s*$/m, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found');
  s = s.slice(start, end + 1);
  try { return JSON.parse(s); } catch {}
  s = s
    .replace(/[\r\n]+/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
  try { return JSON.parse(s); } catch {}
  s = s.replace(/\\n/g, ' ').replace(/\\t/g, ' ');
  return JSON.parse(s);
}

// ─── Premium layout assignment ─────────────────────────────────────────────────
function assignPremiumLayouts(parsed: any): void {
  const sections = parsed.sections || [];
  const allSlides: any[] = sections.flatMap((s: any) => s.slides || []);
  if (!allSlides.length) return;

  // Slide 1 → title
  allSlides[0].layout = 'title';

  // Last slide → center_focus (summary/takeaways)
  if (allSlides.length > 1) {
    allSlides[allSlides.length - 1].layout = 'center_focus';
  }

  // First slide of each section after the first → section_divider
  let firstSection = true;
  for (const section of sections) {
    if (firstSection) { firstSection = false; continue; }
    if (section.slides?.length > 0) {
      const s = section.slides[0];
      if (s.layout !== 'center_focus') s.layout = 'section_divider';
    }
  }

  // Rotate remaining through premium layouts
  const premiumRotation = [
    'split', 'grid_cards', 'data_insight', 'split',
    'comparison', 'timeline', 'title_bullets', 'split',
    'grid_cards', 'title_bullets',
  ];
  const reserved = new Set(['title', 'section_divider', 'center_focus', 'chart']);
  let li = 0;
  for (const slide of allSlides) {
    if (reserved.has(slide.layout)) continue;
    slide.layout = premiumRotation[li % premiumRotation.length];
    li++;
  }
}

// ─── Outline generation ────────────────────────────────────────────────────────
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
  const chartSlides = Math.max(2, Math.round(slide_count * 0.30));

  const prompt = `You are creating a ${slide_count}-slide presentation outline on: "${topic}"
Audience: ${audience}. Tone: ${tone}.

Return ONLY valid JSON, no other text:

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
        {"title": "Summary and Key Takeaways", "layout": "title_bullets", "section": "Conclusion"}
      ]
    }
  ]
}

RULES:
- Total slides across ALL sections must equal EXACTLY ${slide_count}
- ${chartSlides} slide(s) should use layout "chart"
- Each slide title must be specific and informative about "${topic}"

JSON:`;

  try {
    const response = await llmClient.generateContent(prompt);
    const parsed = extractJSON(response);

    const allSlides: any[] = parsed.sections?.flatMap((s: any) => s.slides || []) || [];
    const got = allSlides.length;

    if (got < slide_count) {
      const last = parsed.sections[parsed.sections.length - 1];
      for (let i = got; i < slide_count; i++) {
        last.slides.push({ title: `${topic}: Key Point ${i + 1}`, layout: 'title_bullets', section: last.name });
      }
    } else if (got > slide_count) {
      let excess = got - slide_count;
      for (let si = parsed.sections.length - 1; si >= 0 && excess > 0; si--) {
        const cut = Math.min(excess, parsed.sections[si].slides.length - 1);
        if (cut > 0) { parsed.sections[si].slides.splice(-cut); excess -= cut; }
      }
    }

    assignPremiumLayouts(parsed);
    return parsed;
  } catch (err) {
    console.error('[Outline] LLM failed, using fallback:', err);
    const fallback = buildFallbackOutline(topic, slide_count);
    assignPremiumLayouts(fallback);
    return fallback;
  }
}

function buildFallbackOutline(topic: string, count: number) {
  const words = topic.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const titleWord = words.slice(0, 3).join(' ') || topic;

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
        layout: 'title_bullets',
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

// ─── Layout-specific slide prompts ────────────────────────────────────────────
function getLayoutPrompt(layout: string, title: string, bulletCount: number, contentFormat = 'mixed'): string {
  switch (layout) {
    case 'title':
      return `Create a title slide for a presentation titled: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": "A compelling subtitle in 15-20 words capturing the essence of this presentation",
  "bullets": ["First key theme of the presentation", "Second key theme", "Third key theme"],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "Welcome audience and set expectations.",
  "citations": []
}
JSON:`;

    case 'section_divider':
      return `Create a section divider slide for the section: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": "One compelling tagline for this section in 10-15 words",
  "bullets": ["One sentence about what this section explores or reveals"],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "Transition to this section.",
  "citations": []
}
JSON:`;

    case 'center_focus':
      return `Create a high-impact summary slide about: "${title}"
This is the FINAL slide — make it memorable with real statistics.

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": "The single most important takeaway as one powerful sentence",
  "stat_blocks": [
    {"value": "XX%", "label": "specific metric about ${title}"},
    {"value": "$XXB", "label": "specific metric about ${title}"},
    {"value": "XXx", "label": "specific metric about ${title}"}
  ],
  "bullets": ["One final call-to-action or key recommendation sentence"],
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "Closing remarks and Q&A invitation.",
  "citations": []
}
Rules:
- stat_blocks MUST have REAL statistics with actual numbers about "${title}"
- subtitle must be a powerful, specific sentence
JSON:`;

    case 'grid_cards':
      return `Create a grid cards slide showing 4 key aspects of: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": [
    {"icon": "🔬", "title": "First Aspect", "description": "Specific fact with a number in 10-12 words"},
    {"icon": "📊", "title": "Second Aspect", "description": "Specific fact with a number in 10-12 words"},
    {"icon": "⚡", "title": "Third Aspect", "description": "Specific fact with a number in 10-12 words"},
    {"icon": "🛡️", "title": "Fourth Aspect", "description": "Specific fact with a number in 10-12 words"}
  ],
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Rules:
- Each card title and description MUST be specific to "${title}"
- Use relevant, varied emoji icons
- Include actual statistics or facts in descriptions
JSON:`;

    case 'data_insight':
      return `Create a data and statistics slide about: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  "stat_blocks": [
    {"value": "$XX.XB", "label": "Market or Key Metric"},
    {"value": "XX%", "label": "Growth or Rate Metric"},
    {"value": "XXM", "label": "Scale or Volume Metric"}
  ],
  "bullets": ["**Key trend**: one specific insight from the data with a real statistic about ${title}"],
  "cards": null,
  "chart_spec": {"type":"bar","title":"${title} Trends","labels":["2020","2021","2022","2023","2024"],"datasets":[{"label":"Value","data":[42,55,68,79,95]}],"caption":"Growth trend 2020-2024"},
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Rules:
- stat_blocks MUST have real numbers/percentages specifically about "${title}"
- chart data must reflect realistic trends for "${title}"
JSON:`;

    case 'comparison':
      return `Create a comparison slide contrasting two aspects of: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": {
    "type": "comparison",
    "left": {
      "title": "Traditional Approach",
      "items": ["specific point 1 with data", "specific point 2", "specific point 3"]
    },
    "right": {
      "title": "Modern Approach",
      "items": ["specific improved point 1 with data", "specific improved point 2", "specific improved point 3"]
    }
  },
  "notes": "",
  "citations": []
}
Rules:
- Both sides MUST relate specifically to "${title}" with concrete details
JSON:`;

    case 'timeline':
      return `Create a timeline slide showing the progression of: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": {
    "type": "timeline",
    "events": [
      {"year": "2019", "label": "First milestone", "description": "brief real context"},
      {"year": "2020", "label": "Second milestone", "description": "brief real context"},
      {"year": "2021", "label": "Third milestone", "description": "brief real context"},
      {"year": "2022", "label": "Fourth milestone", "description": "brief real context"},
      {"year": "2023", "label": "Fifth milestone", "description": "brief real context"}
    ]
  },
  "notes": "",
  "citations": []
}
Rules:
- Events MUST be real, specific milestones related to "${title}" with actual years
JSON:`;

    case 'chart': {
      const chartParaHint = contentFormat !== 'bullets'
        ? `"paragraph": "1-2 sentences interpreting what the data shows about ${title}. What is the headline finding?",`
        : `"paragraph": null,`;
      return `Create a data-driven chart slide about: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  ${chartParaHint}
  "bullets": [
    "**Key insight 1**: specific finding with a real statistic about ${title}",
    "**Key insight 2**: another specific finding with a number"
  ],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": {"type":"bar","title":"${title} — Data","labels":["2020","2021","2022","2023","2024"],"datasets":[{"label":"Value","data":[42,55,61,74,88]}],"caption":"Trend 2020-2024"},
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Rules:
- chart_spec MUST have realistic data specific to "${title}"
- bullets must contain real insights from the data
- paragraph (if present) should interpret the trend in plain language
JSON:`;
    }

    case 'split':
    default: {
      const dataKeywords = ['growth', 'rate', 'percent', 'market', 'statistic', 'trend', 'revenue', 'cost', 'adoption', 'increase', 'decrease', 'rise', 'impact', 'number', 'billion', 'million'];
      const isDataSlide = dataKeywords.some(kw => title.toLowerCase().includes(kw));
      const chartHint = isDataSlide
        ? `"chart_spec": {"type":"bar","title":"${title}","labels":["2020","2021","2022","2023","2024"],"datasets":[{"label":"Value","data":[35,48,62,75,91]}],"caption":"Trend 2020-2024"},`
        : `"chart_spec": null,`;

      const paraInstruction = contentFormat === 'bullets'
        ? `"paragraph": null,`
        : `"paragraph": "2-3 sentences of flowing prose that explains the core idea of ${title}. Write as a knowledgeable expert, not a list. Include a key fact or statistic.",`;

      const bulletsInstruction = contentFormat === 'paragraph'
        ? `"bullets": ["One key takeaway as a short punchy bullet"],`
        : `"bullets": [
    "**Key term 1**: specific fact or statistic about ${title}",
    "**Key term 2**: another specific fact with a number",
    "**Key term 3**: another point with evidence",
    "**Key term 4**: concluding insight"
  ],`;

      const contentRules = contentFormat === 'paragraph'
        ? `- Write a substantive paragraph (2-3 sentences) that reads as prose, not a list
- Include 1 key takeaway bullet`
        : contentFormat === 'bullets'
        ? `- EXACTLY ${bulletCount} bullets, each specific to "${title}" with numbers or facts
- Bold the key term in each bullet using **asterisks**`
        : `- Write a paragraph (2-3 sentences) of flowing prose explaining the core concept
- Also include ${Math.min(bulletCount, 3)} supporting bullet points with specific facts/numbers
- Bold key terms in bullets using **asterisks**`;

      return `Write content for a presentation slide titled: "${title}"

Return ONLY this JSON:
{
  "title": "${title}",
  "subtitle": null,
  ${paraInstruction}
  ${bulletsInstruction}
  "stat_blocks": null,
  "cards": null,
  ${chartHint}
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Rules:
${contentRules}
- If chart_spec is provided, use realistic trend data specific to "${title}"
JSON:`;
    }
  }
}

// ─── Slide content generation ──────────────────────────────────────────────────
export async function generateSlide(params: {
  slide_context: any;
  per_slide_extracted_text_or_empty: string;
  text_density?: string;
  content_format?: 'bullets' | 'paragraph' | 'mixed';
}): Promise<{
  title: string;
  subtitle?: string;
  bullets: string[];
  paragraph?: string;
  content_format?: string;
  stat_blocks?: Array<{ value: string; label: string }> | null;
  cards?: Array<{ icon: string; title: string; description: string }> | null;
  notes: string;
  chart_spec: any;
  diagram_spec: any;
  citations: string[];
}> {
  const density = params.text_density || 'medium';
  const contentFormat = params.content_format || 'mixed';
  const bulletCount = density === 'low' ? 2 : density === 'text_heavy' ? 6 : 4;
  const layout = params.slide_context.layout || 'title_bullets';
  const slideTitle = params.slide_context.title;

  const prompt = getLayoutPrompt(layout, slideTitle, bulletCount, contentFormat);

  try {
    const response = await llmClient.generateContent(prompt);
    const parsed = extractJSON(response);

    parsed.title = parsed.title || slideTitle;
    parsed.notes = parsed.notes || '';
    parsed.citations = parsed.citations || [];
    parsed.diagram_spec = parsed.diagram_spec || null;
    if (!Array.isArray(parsed.bullets)) parsed.bullets = [];
    parsed.paragraph = parsed.paragraph || null;
    parsed.content_format = contentFormat;

    // Ensure chart for chart/data_insight layouts
    if ((layout === 'chart' || layout === 'data_insight') && !parsed.chart_spec) {
      parsed.chart_spec = {
        type: 'bar',
        title: slideTitle,
        labels: ['2020', '2021', '2022', '2023', '2024'],
        datasets: [{ label: 'Value', data: [42, 55, 61, 74, 88] }],
        caption: 'Data trend',
      };
    } else if (layout !== 'chart' && layout !== 'data_insight') {
      parsed.chart_spec = parsed.chart_spec || null;
    }

    return parsed;
  } catch (err) {
    console.error(`[Slide] "${slideTitle}" (${layout}) failed:`, err);
    try {
      return await generateSlideSimple(slideTitle, bulletCount, layout === 'chart' || layout === 'data_insight');
    } catch {
      return buildFallbackSlide(slideTitle, density, layout);
    }
  }
}

async function generateSlideSimple(title: string, bulletCount: number, isChart: boolean): Promise<any> {
  const prompt = `List ${bulletCount} facts about "${title}". Be specific with numbers and statistics.
Format as JSON: {"title":"${title}","subtitle":null,"bullets":["fact 1","fact 2","fact 3","fact 4"],"stat_blocks":null,"cards":null,"chart_spec":null,"diagram_spec":null,"notes":"","citations":[]}
JSON:`;

  const response = await llmClient.generateContent(prompt);
  const parsed = extractJSON(response);
  if (!Array.isArray(parsed.bullets) || parsed.bullets.length === 0) throw new Error('retry failed');

  parsed.bullets = parsed.bullets.map((b: string) => {
    if (b.startsWith('**')) return b;
    const colonIdx = b.indexOf(':');
    if (colonIdx > 0 && colonIdx < 30) return `**${b.slice(0, colonIdx)}**:${b.slice(colonIdx + 1)}`;
    return b;
  });

  if (isChart) {
    parsed.chart_spec = parsed.chart_spec || {
      type: 'bar', title, labels: ['2020', '2021', '2022', '2023', '2024'],
      datasets: [{ label: 'Value', data: [40, 52, 65, 78, 90] }], caption: 'Trend data',
    };
  } else {
    parsed.chart_spec = null;
  }
  parsed.diagram_spec = null;
  parsed.stat_blocks = null;
  parsed.cards = null;
  return parsed;
}

function buildFallbackSlide(title: string, density: string, layout: string) {
  const count = density === 'low' ? 2 : density === 'text_heavy' ? 6 : 4;
  const bullets = Array.from({ length: count }, (_, i) => {
    const terms = ['Overview', 'Key Finding', 'Impact', 'Application', 'Evidence', 'Conclusion'];
    return `**${terms[i] || 'Point ' + (i + 1)}**: ${title} — point ${i + 1}`;
  });
  return {
    title,
    subtitle: undefined,
    bullets,
    stat_blocks: null,
    cards: null,
    notes: '',
    chart_spec: (layout === 'chart' || layout === 'data_insight') ? {
      type: 'bar', title,
      labels: ['2020', '2021', '2022', '2023', '2024'],
      datasets: [{ label: 'Value', data: [40, 52, 65, 78, 90] }],
      caption: 'Trend data',
    } : null,
    diagram_spec: null,
    citations: [],
  };
}

// ─── Stub exports ──────────────────────────────────────────────────────────────
export function harvestFactsForSlide(_: string, __: string): string { return ''; }
export function tableMatchesTitle(_: string, __: string): boolean { return false; }
export function tableForTitle(_: string, __: string): any { return null; }
export function attachChartSpec(draft: any, _: any): any { return draft; }
export async function parseDocuments(docUrls: string[]): Promise<string> {
  if (!docUrls?.length) return '';
  return `Documents: ${docUrls.map(u => u.split('/').pop()).join(', ')}`;
}

function extractImageKeywords(title: string): string {
  const stopWords = new Set([
    'and', 'the', 'of', 'in', 'to', 'a', 'an', 'for', 'with', 'on', 'at',
    'by', 'from', 'as', 'is', 'was', 'are', 'were', 'how', 'what', 'why',
    'when', 'where', 'key', 'top', 'its', 'our', 'their', 'into', 'will',
    'can', 'do', 'we', 'you', 'it', 'this', 'that', 'vs', 'or', 'but',
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
  return words.slice(0, 2).join(',') || 'business,technology';
}

function titleToSeed(title: string): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = ((hash << 5) - hash) + title.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 9999 + 1;
}

export async function generateVisual(params: { title: string; bullets?: string[]; theme_style: string }): Promise<{ prompt: string; alt: string; url: string }> {
  const keywords = extractImageKeywords(params.title);
  const seed = titleToSeed(params.title);
  // LoremFlickr: free, topic-relevant photos from Flickr, no API key needed
  // ?lock=N ensures same photo is returned every time for the same seed
  const url = `https://loremflickr.com/800/450/${encodeURIComponent(keywords)}?lock=${seed}`;
  return {
    prompt: `${keywords} photo`,
    alt: params.title,
    url,
  };
}
