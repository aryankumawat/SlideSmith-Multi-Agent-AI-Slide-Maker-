import { createLLMClient } from './llm';

const llmClient = createLLMClient();

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

  const prompt = `Create a ${slide_count}-slide presentation outline on: "${topic}"
Audience: ${audience}. Tone: ${tone}.

Each slide title must be SPECIFIC and INFORMATIVE — name exact concepts, technologies, statistics, or questions relevant to "${topic}". Never use generic titles like "Introduction", "Key Points", or "Slide 3".

Return ONLY valid JSON:

{
  "title": string,         // A sharp, specific title for the whole presentation
  "sections": [
    {
      "name": string,      // Section name (e.g. "Background & Context", "Core Mechanisms", "Evidence & Data")
      "slides": [
        {"title": string, "layout": "title_bullets", "section": string},
        ...
      ]
    }
  ]
}

Available layouts: title_bullets, chart, grid_cards, data_insight, comparison, timeline, split, center_focus, section_divider

RULES:
- Total slides across ALL sections must be EXACTLY ${slide_count}
- Include EXACTLY ${chartSlides} slide(s) with layout "chart" or "data_insight"
- Slide titles must be concrete and specific to "${topic}" — e.g. "How Transformer Attention Mechanisms Enable Scale" not "How It Works"
- Vary layouts across sections for visual variety
- First slide of each section after the Introduction should use "section_divider"
- Last slide should use "center_focus"

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
  const QUALITY_RULE = `CRITICAL: Every piece of content must be SPECIFIC to "${title}". Include real numbers, named organisations, actual technologies, or verifiable facts. Generic filler like "Key Point 1" or placeholder values are UNACCEPTABLE.`;

  switch (layout) {
    case 'title':
      return `Write a title slide for the presentation: "${title}"

JSON schema (fill every field with real, specific content — no placeholders):
{
  "title": string,          // the exact presentation title
  "subtitle": string,       // one compelling sentence (15-20 words) summarising the core argument or scope
  "bullets": [string, string, string],  // three specific themes or questions this presentation answers
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": string,          // one sentence speaker note for opening
  "citations": []
}
${QUALITY_RULE}
Respond with JSON only.`;

    case 'section_divider':
      return `Write a section divider slide for the section: "${title}"

JSON schema:
{
  "title": string,    // section name
  "subtitle": string, // one punchy tagline (10-15 words) that hooks the audience into this section
  "bullets": [string], // one sentence previewing the section's key argument or finding
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": string,
  "citations": []
}
${QUALITY_RULE}
Respond with JSON only.`;

    case 'center_focus':
      return `Write the FINAL summary slide for the topic: "${title}"

This is the closing slide. Make every stat real and impactful.

JSON schema:
{
  "title": string,
  "subtitle": string,   // the single most important takeaway — one powerful, specific sentence
  "stat_blocks": [
    {"value": string, "label": string},  // e.g. "$4.7T" / "Global AI market by 2032"
    {"value": string, "label": string},  // e.g. "38%" / "Annual productivity gain (McKinsey)"
    {"value": string, "label": string}   // e.g. "2.4B" / "Users impacted worldwide"
  ],
  "bullets": [string],  // one concrete call-to-action or recommendation
  "cards": null,
  "chart_spec": null,
  "diagram_spec": null,
  "notes": string,
  "citations": []
}
${QUALITY_RULE}
Every stat_block value must be a real number/percentage with a specific source context in the label.
Respond with JSON only.`;

    case 'grid_cards':
      return `Write a four-card overview slide for the topic: "${title}"

JSON schema:
{
  "title": string,
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": [
    {"icon": string, "title": string, "description": string},
    {"icon": string, "title": string, "description": string},
    {"icon": string, "title": string, "description": string},
    {"icon": string, "title": string, "description": string}
  ],
  "chart_spec": null,
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Each card:
- icon: a single relevant emoji
- title: 2-4 word named aspect of "${title}" (e.g. a technology, method, or dimension)
- description: one sentence with a specific fact, percentage, dollar figure, or named example about that aspect
${QUALITY_RULE}
Respond with JSON only.`;

    case 'data_insight':
      return `Write a data and statistics slide for the topic: "${title}"

JSON schema:
{
  "title": string,
  "subtitle": null,
  "stat_blocks": [
    {"value": string, "label": string},
    {"value": string, "label": string},
    {"value": string, "label": string}
  ],
  "bullets": [string],
  "cards": null,
  "chart_spec": {
    "type": "bar",
    "title": string,
    "x_label": string,
    "y_label": string,
    "labels": [string, string, string, string, string],
    "datasets": [{"label": string, "data": [number, number, number, number, number]}],
    "caption": string
  },
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
Rules:
- stat_blocks: three real metrics for "${title}" — actual dollar amounts, percentages, or counts with context labels
- bullets[0]: one sentence insight explaining the chart trend with a specific stat
- chart_spec: generate REALISTIC numbers for "${title}" — do NOT use placeholder values like 42,55,68. Research what actual growth looks like for this topic and use plausible real-world figures. Set meaningful x_label and y_label (e.g. "Year" / "Revenue (USD Billions)").
${QUALITY_RULE}
Respond with JSON only.`;

    case 'comparison':
      return `Write a before-vs-after or traditional-vs-modern comparison slide for: "${title}"

JSON schema:
{
  "title": string,
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": {
    "type": "comparison",
    "left": {
      "title": string,
      "items": [string, string, string]
    },
    "right": {
      "title": string,
      "items": [string, string, string]
    }
  },
  "notes": "",
  "citations": []
}
- left.title / right.title: name the two sides specifically (e.g. "Legacy Systems" vs "Cloud-Native AI")
- Each item: one specific fact or measurable difference, not a generic phrase
${QUALITY_RULE}
Respond with JSON only.`;

    case 'timeline':
      return `Write a timeline slide showing the key milestones of: "${title}"

JSON schema:
{
  "title": string,
  "subtitle": null,
  "bullets": [],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": null,
  "diagram_spec": {
    "type": "timeline",
    "events": [
      {"year": string, "label": string, "description": string},
      {"year": string, "label": string, "description": string},
      {"year": string, "label": string, "description": string},
      {"year": string, "label": string, "description": string},
      {"year": string, "label": string, "description": string}
    ]
  },
  "notes": "",
  "citations": []
}
- Each event: a REAL named milestone in the history of "${title}" with the actual year it occurred
- description: one short sentence with a specific fact about that milestone
${QUALITY_RULE}
Respond with JSON only.`;

    case 'chart': {
      const chartParaHint = contentFormat !== 'bullets'
        ? `"paragraph": string,   // 1-2 sentences interpreting the headline finding from the chart data`
        : `"paragraph": null,`;
      return `Write a data-driven chart slide for the topic: "${title}"

JSON schema:
{
  "title": string,
  "subtitle": null,
  ${chartParaHint}
  "bullets": [string, string],
  "stat_blocks": null,
  "cards": null,
  "chart_spec": {
    "type": "bar",
    "title": string,
    "x_label": string,
    "y_label": string,
    "labels": [string, string, string, string, string],
    "datasets": [{"label": string, "data": [number, number, number, number, number]}],
    "caption": string
  },
  "diagram_spec": null,
  "notes": "",
  "citations": []
}
- bullets[0..1]: two specific insights from the data — must cite numbers from the chart
- chart_spec: generate REALISTIC, topic-specific data for "${title}". Choose meaningful axis labels and a time range or category breakdown that makes sense for this subject. Do NOT use placeholder values [42,55,61,74,88].
- If the topic involves market size, use billions (USD). If adoption rate, use percentages. Match the data to what is actually known about "${title}".
${QUALITY_RULE}
Respond with JSON only.`;
    }

    case 'title_bullets':
    case 'split':
    default: {
      const dataKeywords = ['growth', 'rate', 'percent', 'market', 'statistic', 'trend', 'revenue', 'cost', 'adoption', 'increase', 'decrease', 'rise', 'impact', 'billion', 'million'];
      const isDataSlide = dataKeywords.some(kw => title.toLowerCase().includes(kw));

      const chartHint = isDataSlide
        ? `"chart_spec": {
    "type": "bar",
    "title": string,
    "x_label": string,
    "y_label": string,
    "labels": [string, string, string, string, string],
    "datasets": [{"label": string, "data": [number, number, number, number, number]}],
    "caption": string
  },`
        : `"chart_spec": null,`;

      const paraInstruction = contentFormat === 'bullets'
        ? `"paragraph": null,`
        : `"paragraph": string,   // 2-3 sentences of substantive prose explaining the core concept of "${title}" — written as a knowledgeable expert, not a list. Must include at least one specific fact or named example.`;

      const bulletsInstruction = contentFormat === 'paragraph'
        ? `"bullets": [string],   // one punchy key takeaway`
        : `"bullets": [string, string, string${bulletCount > 3 ? ', string' : ''}],   // ${bulletCount} bullets, each with a bolded key term and a specific fact/stat`;

      const contentRules = contentFormat === 'paragraph'
        ? `- paragraph: 2-3 sentences of substantive expert prose — include at least one specific statistic or named example
- bullets[0]: one punchy key takeaway sentence`
        : contentFormat === 'bullets'
        ? `- Exactly ${bulletCount} bullets. Format: "**Bold Term**: specific fact or statistic with a real number"
- Do NOT write generic statements. Every bullet must reference something concrete about "${title}"`
        : `- paragraph: 2-3 sentences of expert prose with at least one specific stat or named example
- ${Math.min(bulletCount, 3)} bullets formatted as "**Bold Term**: specific fact or statistic"`;

      return `Write slide content for the topic: "${title}"

JSON schema:
{
  "title": string,
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
${isDataSlide ? `- chart_spec: generate realistic, topic-specific numbers for "${title}" — do NOT use [35,48,62,75,91] or any generic sequence. Use real-world plausible data.` : ''}
${QUALITY_RULE}
Respond with JSON only.`;
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
