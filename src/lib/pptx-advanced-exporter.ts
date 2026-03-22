/**
 * Advanced PPTX Exporter — handles all premium layout types
 */
import PptxGenJS from 'pptxgenjs';

interface StatBlock { value: string; label: string; }
interface Card { icon: string; title: string; description: string; }

interface Slide {
  layout?: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stat_blocks?: StatBlock[] | null;
  cards?: Card[] | null;
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

interface ThemeConfig {
  background: string;
  headerBg: string;
  text: string;
  textSecondary: string;
  accent: string;
  bullet: string;
  gradient1: string;
  gradient2: string;
}

const THEMES: Record<string, ThemeConfig> = {
  academic:     { background: 'FAFAFA', headerBg: '1A3A5C', text: '1A1A1A', textSecondary: '5A6A7A', accent: 'C0392B', bullet: '1A3A5C', gradient1: '1A3A5C', gradient2: '2E5266' },
  corporate:    { background: 'F0F4FF', headerBg: '1E40AF', text: '1E293B', textSecondary: '64748B', accent: '2563EB', bullet: '1E40AF', gradient1: '1E40AF', gradient2: '3B82F6' },
  deep_space:   { background: '0B0F1A', headerBg: '101828', text: 'E2E8F0', textSecondary: '94A3B8', accent: '7C3AED', bullet: '7C3AED', gradient1: '7C3AED', gradient2: '2563EB' },
  ultra_violet: { background: '0F0820', headerBg: '1B1035', text: 'F8FAFC', textSecondary: 'A1A1AA', accent: 'A855F7', bullet: 'A855F7', gradient1: 'A855F7', gradient2: '06B6D4' },
  navy_gold:    { background: '0A1628', headerBg: '06101E', text: 'F0F4F8', textSecondary: '8EA8C3', accent: 'F4C430', bullet: 'F4C430', gradient1: '0A1628', gradient2: '1A3A6C' },
  minimal:      { background: 'FFFFFF', headerBg: '1F2937', text: '111827', textSecondary: '6B7280', accent: '3B82F6', bullet: '3B82F6', gradient1: '374151', gradient2: '6B7280' },
};

const PALETTE = ['1A3A5C', 'C0392B', '2E86AB', 'A23B72', 'F18F01', '5C6BC0', '26A69A', '78909C'];

function getTheme(name: string): ThemeConfig {
  const key = name?.toLowerCase().replace(/[-\s]/g, '_');
  return THEMES[key] || THEMES.academic;
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

function convertChartData(spec: any): { type: string; data: any[] } {
  const type = (spec.type || spec.kind || 'bar').toLowerCase();
  if (spec.labels && spec.datasets) {
    const data = spec.datasets.map((ds: any) => ({
      name: ds.label || 'Value',
      labels: spec.labels,
      values: ds.data || [],
    }));
    return { type, data };
  }
  if (Array.isArray(spec.data) && spec.data[0]?.values) {
    return { type, data: spec.data };
  }
  if (Array.isArray(spec.data)) {
    const labels = spec.data.map((d: any) => d.name || String(d.label || ''));
    const values = spec.data.map((d: any) => d.value ?? d.values?.[0] ?? 0);
    return { type, data: [{ name: spec.title || 'Data', labels, values }] };
  }
  return { type, data: [{ name: 'Data', labels: ['A', 'B', 'C', 'D'], values: [40, 65, 52, 78] }] };
}

function pptxChartType(type: string): string {
  const map: Record<string, string> = { bar: 'bar', line: 'line', pie: 'pie', area: 'area', column: 'bar', doughnut: 'doughnut' };
  return map[type] || 'bar';
}

export async function exportToAdvancedPPTX(deck: Deck): Promise<Buffer> {
  if (!deck?.slides?.length) throw new Error('Deck has no slides');

  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: 'WIDE', width: 10, height: 5.625 });
  pptx.layout = 'WIDE';
  pptx.author = 'SlideSmith AI';
  pptx.title = stripMd(deck.title);

  const theme = getTheme(deck.theme);

  // Precompute section numbers
  let sectionCount = 0;
  const sectionNums: Record<number, number> = {};
  deck.slides.forEach((s, i) => {
    if (s.layout === 'section_divider') {
      sectionCount++;
      sectionNums[i] = sectionCount;
    }
  });

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    try {
      await addSlide(pptx, slide, theme, i + 1, deck.slides.length, sectionNums[i] || 1);
    } catch (err) {
      console.error(`[PPTX] Slide ${i + 1} error:`, err);
      const ps = pptx.addSlide();
      ps.background = { color: theme.background };
      ps.addText(stripMd(slide.title || `Slide ${i + 1}`), {
        x: 0.5, y: 2, w: 9, h: 1.5,
        fontSize: 28, bold: true, color: theme.text, align: 'center',
      });
    }
  }

  const buffer = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.from(buffer as any);
}

async function addSlide(
  pptx: PptxGenJS,
  slide: Slide,
  theme: ThemeConfig,
  num: number,
  total: number,
  sectionNum: number,
): Promise<void> {
  const layout = slide.layout || 'title_bullets';

  switch (layout) {
    case 'title':         return addTitleSlide(pptx, slide, theme, num, total);
    case 'section_divider': return addSectionDividerSlide(pptx, slide, theme, num, total, sectionNum);
    case 'center_focus':  return addCenterFocusSlide(pptx, slide, theme, num, total);
    case 'grid_cards':    return addGridCardsSlide(pptx, slide, theme, num, total);
    case 'data_insight':  return addDataInsightSlide(pptx, slide, theme, num, total);
    case 'comparison':    return addComparisonSlide(pptx, slide, theme, num, total);
    case 'timeline':      return addTimelineSlide(pptx, slide, theme, num, total);
    case 'chart':         return addChartSlide(pptx, slide, theme, num, total);
    default:              return addContentSlide(pptx, slide, theme, num, total);
  }
}

// ─── Shared helpers ────────────────────────────────────────────────────────────
function addHeader(ps: any, title: string, theme: ThemeConfig, num: number, total: number) {
  ps.addShape('rect', { x: 0, y: 0, w: 10, h: 0.9, fill: { color: theme.headerBg }, line: { type: 'none' } });
  ps.addText(stripMd(title), { x: 0.3, y: 0, w: 8.8, h: 0.9, fontSize: 22, bold: true, color: 'FFFFFF', valign: 'middle', wrap: true });
  ps.addText(`${num} / ${total}`, { x: 8.8, y: 0, w: 1, h: 0.9, fontSize: 9, color: 'AAAAAA', align: 'right', valign: 'middle' });
}

function addAccentLine(ps: any, theme: ThemeConfig) {
  ps.addShape('rect', { x: 0, y: 5.5, w: 10, h: 0.125, fill: { color: theme.accent }, line: { type: 'none' } });
}

// ─── Title Slide ──────────────────────────────────────────────────────────────
function addTitleSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.headerBg };

  // Decorative circles
  ps.addShape('ellipse', { x: 7.5, y: -0.5, w: 3, h: 3, fill: { color: 'FFFFFF', transparency: 95 }, line: { type: 'none' } });
  ps.addShape('ellipse', { x: -0.5, y: 3.5, w: 2.5, h: 2.5, fill: { color: 'FFFFFF', transparency: 96 }, line: { type: 'none' } });

  // "PRESENTATION" eyebrow
  ps.addText('PRESENTATION', { x: 0.5, y: 1.2, w: 9, h: 0.3, fontSize: 10, bold: true, color: 'FFFFFF', align: 'center', charSpacing: 3, transparency: 45 });

  // Main title
  ps.addText(stripMd(slide.title), {
    x: 0.8, y: 1.6, w: 8.4, h: 1.6,
    fontSize: 36, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle', wrap: true, lineSpacingMultiple: 1.1,
  });

  // Divider
  ps.addShape('rect', { x: 4.3, y: 3.3, w: 1.4, h: 0.06, fill: { color: 'FFFFFF', transparency: 50 }, line: { type: 'none' } });

  // Subtitle
  if (slide.subtitle) {
    ps.addText(stripMd(slide.subtitle), {
      x: 1, y: 3.45, w: 8, h: 0.8,
      fontSize: 15, color: 'FFFFFF', align: 'center', transparency: 22, wrap: true,
    });
  }

  // Theme pills
  if (slide.bullets?.length) {
    slide.bullets.slice(0, 3).forEach((b, i) => {
      const w = 2.2, gap = 0.2;
      const totalW = 3 * w + 2 * gap;
      const x = (10 - totalW) / 2 + i * (w + gap);
      ps.addText(stripMd(b), {
        x, y: 4.4, w, h: 0.35,
        fontSize: 10, color: 'FFFFFF', align: 'center', transparency: 12,
        fill: { color: 'FFFFFF', transparency: 88 },
        line: { color: 'FFFFFF', pt: 0.5, transparency: 80 },
        rectRadius: 0.17,
      });
    });
  }

  ps.addText(`${num} / ${total}`, { x: 8.8, y: 5.25, w: 1, h: 0.3, fontSize: 9, color: 'AAAAAA', align: 'right' });
  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Section Divider ──────────────────────────────────────────────────────────
function addSectionDividerSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number, sectionNum: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };

  // Left gradient panel
  ps.addShape('rect', { x: 0, y: 0, w: 2.8, h: 5.625, fill: { color: theme.headerBg }, line: { type: 'none' } });
  ps.addText(String(sectionNum).padStart(2, '0'), { x: 0, y: 1.5, w: 2.8, h: 2.5, fontSize: 80, bold: true, color: 'FFFFFF', align: 'center', transparency: 85 });
  ps.addText('SECTION', { x: 0, y: 3.9, w: 2.8, h: 0.4, fontSize: 9, bold: true, color: 'FFFFFF', align: 'center', charSpacing: 3, transparency: 40 });

  // Right content
  ps.addText(stripMd(slide.title), { x: 3.1, y: 1.4, w: 6.5, h: 1.4, fontSize: 30, bold: true, color: theme.text, valign: 'middle', wrap: true });
  ps.addShape('rect', { x: 3.1, y: 2.95, w: 0.5, h: 0.06, fill: { color: theme.accent }, line: { type: 'none' } });

  if (slide.subtitle) {
    ps.addText(stripMd(slide.subtitle), { x: 3.1, y: 3.15, w: 6.4, h: 0.6, fontSize: 14, color: theme.textSecondary, wrap: true });
  }
  if (slide.bullets?.[0]) {
    ps.addText(stripMd(slide.bullets[0]), { x: 3.1, y: 3.85, w: 6.4, h: 0.8, fontSize: 12, color: theme.text, wrap: true });
  }

  ps.addText(`${num} / ${total}`, { x: 8.8, y: 5.25, w: 1, h: 0.3, fontSize: 9, color: theme.textSecondary, align: 'right' });
  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Center Focus ─────────────────────────────────────────────────────────────
function addCenterFocusSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const statBlocks = slide.stat_blocks?.slice(0, 3);
  const centerY = statBlocks?.length ? 1.05 : 1.2;
  const centerH = statBlocks?.length ? 2.2 : 3.2;

  if (slide.subtitle) {
    ps.addText(`"${stripMd(slide.subtitle)}"`, {
      x: 1, y: centerY, w: 8, h: centerH,
      fontSize: 18, italic: true, bold: false, color: theme.text,
      align: 'center', valign: 'middle', wrap: true,
    });
  } else if (slide.bullets?.[0]) {
    ps.addText(stripMd(slide.bullets[0]), {
      x: 1, y: centerY, w: 8, h: centerH,
      fontSize: 16, color: theme.text, align: 'center', valign: 'middle', wrap: true,
    });
  }

  if (statBlocks?.length) {
    const bw = 2.8, gap = 0.2, startX = (10 - (bw * 3 + gap * 2)) / 2;
    statBlocks.forEach((stat, i) => {
      const x = startX + i * (bw + gap);
      ps.addShape('rect', { x, y: 3.6, w: bw, h: 1.6, fill: { color: theme.background }, line: { color: theme.textSecondary + '40', pt: 0.5 }, rectRadius: 0.12 });
      ps.addText(stripMd(stat.value), { x, y: 3.7, w: bw, h: 0.85, fontSize: 28, bold: true, color: PALETTE[i % PALETTE.length], align: 'center' });
      ps.addText(stripMd(stat.label), { x, y: 4.55, w: bw, h: 0.4, fontSize: 10, color: theme.textSecondary, align: 'center', wrap: true });
    });
  }

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Grid Cards ───────────────────────────────────────────────────────────────
function addGridCardsSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const cards: Card[] = slide.cards?.length
    ? slide.cards.slice(0, 4)
    : (slide.bullets || []).slice(0, 4).map((b, i) => ({
      icon: ['🔬', '📊', '⚡', '🛡️'][i] || '•',
      title: stripMd(b).split(':')[0].trim() || `Point ${i + 1}`,
      description: stripMd(b).split(':').slice(1).join(':').trim() || stripMd(b),
    }));

  const cardColors = [theme.accent, PALETTE[2], PALETTE[0], PALETTE[4]];
  const cw = 4.7, ch = 2.1, gap = 0.1;

  cards.forEach((card, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.2 + col * (cw + gap), y = 0.95 + row * (ch + 0.15);
    ps.addShape('rect', { x, y, w: cw, h: ch, fill: { color: theme.background }, line: { color: theme.textSecondary + '30', pt: 0.5 }, rectRadius: 0.12 });
    ps.addShape('rect', { x, y, w: cw, h: 0.06, fill: { color: cardColors[i % cardColors.length] }, line: { type: 'none' } });
    ps.addText(card.icon + ' ' + stripMd(card.title), { x: x + 0.15, y: y + 0.12, w: cw - 0.3, h: 0.45, fontSize: 13, bold: true, color: theme.text, valign: 'middle' });
    ps.addText(stripMd(card.description), { x: x + 0.15, y: y + 0.6, w: cw - 0.3, h: 1.35, fontSize: 11, color: theme.textSecondary, wrap: true, valign: 'top' });
  });

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Data Insight ─────────────────────────────────────────────────────────────
async function addDataInsightSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const statBlocks = slide.stat_blocks?.slice(0, 3) || [{ value: '—', label: 'Metric 1' }, { value: '—', label: 'Metric 2' }, { value: '—', label: 'Metric 3' }];
  const bw = 3.0, gap = 0.2, startX = (10 - (bw * 3 + gap * 2)) / 2;

  statBlocks.forEach((stat, i) => {
    const x = startX + i * (bw + gap);
    ps.addShape('rect', { x, y: 1.0, w: bw, h: 1.1, fill: { color: theme.background }, line: { color: theme.textSecondary + '30', pt: 0.5 }, rectRadius: 0.1 });
    ps.addText(stripMd(stat.value), { x, y: 1.05, w: bw, h: 0.6, fontSize: 24, bold: true, color: PALETTE[i % PALETTE.length], align: 'center' });
    ps.addText(stripMd(stat.label), { x, y: 1.65, w: bw, h: 0.35, fontSize: 10, color: theme.textSecondary, align: 'center', wrap: true });
  });

  if (slide.chart_spec) {
    try {
      const { type, data } = convertChartData(slide.chart_spec);
      (ps as any).addChart(pptxChartType(type), data, {
        x: 0.3, y: 2.25, w: 9.4, h: 2.9,
        showTitle: false, showLegend: false,
        chartColors: PALETTE.map(c => c.toUpperCase()),
        catAxisLabelColor: theme.textSecondary,
        valAxisLabelColor: theme.textSecondary,
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
      });
    } catch {}
  }

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Comparison ───────────────────────────────────────────────────────────────
function addComparisonSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const diag = slide.diagram_spec;
  const left = diag?.left || { title: 'Before', items: (slide.bullets || []).slice(0, 3) };
  const right = diag?.right || { title: 'After', items: (slide.bullets || []).slice(3, 6) };
  const sideColors = [PALETTE[0], PALETTE[2]];

  [{ data: left, col: 0 }, { data: right, col: 1 }].forEach(({ data, col }) => {
    const x = 0.2 + col * 5.05;
    ps.addShape('rect', { x, y: 1.0, w: 4.75, h: 4.25, fill: { color: theme.background }, line: { color: theme.textSecondary + '30', pt: 0.5 }, rectRadius: 0.12 });
    ps.addShape('rect', { x, y: 1.0, w: 4.75, h: 0.55, fill: { color: sideColors[col] }, line: { type: 'none' }, rectRadius: 0.12 });
    ps.addShape('rect', { x, y: 1.35, w: 4.75, h: 0.22, fill: { color: sideColors[col] }, line: { type: 'none' } });
    ps.addText((col === 0 ? '↩ ' : '↪ ') + stripMd(data.title), { x: x + 0.15, y: 1.0, w: 4.5, h: 0.55, fontSize: 13, bold: true, color: 'FFFFFF', valign: 'middle' });
    (data.items || []).slice(0, 4).forEach((item: string, ii: number) => {
      ps.addText('▶  ' + stripMd(item), { x: x + 0.2, y: 1.65 + ii * 0.65, w: 4.4, h: 0.6, fontSize: 11, color: theme.text, wrap: true });
    });
  });

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Timeline ─────────────────────────────────────────────────────────────────
function addTimelineSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const rawEvents = slide.diagram_spec?.events || [];
  const events = rawEvents.length > 0
    ? rawEvents.slice(0, 5)
    : (slide.bullets || []).slice(0, 5).map((b: string, i: number) => ({
      year: String(2020 + i),
      label: stripMd(b).split(':')[0].trim(),
      description: stripMd(b).split(':').slice(1).join(':').trim(),
    }));

  // Horizontal line
  ps.addShape('rect', { x: 0.6, y: 3.1, w: 8.8, h: 0.06, fill: { color: theme.accent + '50' }, line: { type: 'none' } });

  const n = events.length;
  const spacing = 8.8 / (n - 1 || 1);

  events.forEach((ev: any, i: number) => {
    const x = 0.6 + i * spacing;
    const color = PALETTE[i % PALETTE.length];
    const isAbove = i % 2 === 0;

    // Dot
    ps.addShape('ellipse', { x: x - 0.12, y: 3.01, w: 0.24, h: 0.24, fill: { color }, line: { type: 'none' } });
    ps.addText(String(i + 1), { x: x - 0.12, y: 3.01, w: 0.24, h: 0.24, fontSize: 7, bold: true, color: 'FFFFFF', align: 'center', valign: 'middle' });

    // Year
    ps.addText(ev.year, { x: x - 0.4, y: 3.27, w: 0.8, h: 0.28, fontSize: 10, bold: true, color, align: 'center' });

    // Label and description
    const labelY = isAbove ? 1.05 : 3.65;
    ps.addText(stripMd(ev.label), { x: x - 0.9, y: labelY, w: 1.8, h: 0.45, fontSize: 10, bold: true, color: theme.text, align: 'center', wrap: true });
    if (ev.description) {
      ps.addText(stripMd(ev.description), { x: x - 0.9, y: labelY + 0.45, w: 1.8, h: 0.65, fontSize: 9, color: theme.textSecondary, align: 'center', wrap: true });
    }
  });

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Chart Slide ──────────────────────────────────────────────────────────────
async function addChartSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const bullets = (slide.bullets || []).slice(0, 2);
  let chartY = 0.98;

  if (bullets.length > 0) {
    bullets.forEach((b, i) => {
      const x = 0.25 + i * 4.85;
      ps.addShape('rect', { x, y: 0.98, w: 4.65, h: 0.5, fill: { color: theme.background }, line: { color: PALETTE[i % PALETTE.length] + 'CC', pt: 1 }, rectRadius: 0.07 });
      ps.addText(stripMd(b), { x: x + 0.1, y: 0.98, w: 4.45, h: 0.5, fontSize: 10, color: theme.text, valign: 'middle', wrap: true });
    });
    chartY = 1.6;
  }

  if (slide.chart_spec) {
    try {
      const { type, data } = convertChartData(slide.chart_spec);
      (ps as any).addChart(pptxChartType(type), data, {
        x: 0.3, y: chartY, w: 9.4, h: 5.1 - chartY,
        showTitle: false, showLegend: data.length > 1, legendPos: 'b',
        chartColors: PALETTE.map(c => c.toUpperCase()),
        catAxisLabelColor: theme.textSecondary,
        valAxisLabelColor: theme.textSecondary,
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
      });
    } catch (chartErr) {
      console.warn('[PPTX] Chart render failed:', chartErr);
    }
  }

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}

// ─── Generic Content Slide (split / title_bullets / etc.) ────────────────────
async function addContentSlide(pptx: PptxGenJS, slide: Slide, theme: ThemeConfig, num: number, total: number) {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };
  addHeader(ps, slide.title, theme, num, total);

  const bullets = slide.bullets || [];
  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;
  const hasVisual = hasChart || hasDiagram;

  const bulletW = hasVisual && bullets.length > 0 ? 4.4 : 9.2;
  const visualX = bullets.length > 0 ? 4.8 : 0.4;
  const visualW = bullets.length > 0 ? 5.0 : 9.2;
  const maxB = Math.min(bullets.length, 8);

  if (bullets.length > 0) {
    const textObjs = bullets.slice(0, maxB).map(b => ([
      { text: '●  ', options: { color: theme.bullet, fontSize: 6 } },
      { text: stripMd(b) + '\n', options: { color: theme.text, fontSize: maxB > 5 ? 13 : 15 } },
    ])).flat();
    ps.addText(textObjs as any, { x: 0.4, y: 1.05, w: bulletW, h: 4.1, valign: 'top', wrap: true, lineSpacing: 22 });
  }

  if (slide.citations?.length) {
    ps.addText(stripMd(slide.citations.slice(0, 2).join('  |  ')), {
      x: 0.4, y: 5.2, w: 9.2, h: 0.3, fontSize: 8, color: theme.textSecondary, italic: true,
    });
  }

  if (hasChart) {
    try {
      const { type, data } = convertChartData(slide.chart_spec);
      (ps as any).addChart(pptxChartType(type), data, {
        x: visualX, y: 1.05, w: visualW, h: hasDiagram ? 1.8 : 3.3,
        showTitle: false, showLegend: data.length > 1, legendPos: 'b',
        chartColors: PALETTE.map(c => c.toUpperCase()),
        catAxisLabelColor: theme.textSecondary,
        valAxisLabelColor: theme.textSecondary,
        catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
      });
      if (slide.chart_spec?.caption) {
        const chartH = hasDiagram ? 1.8 : 3.3;
        ps.addText(slide.chart_spec.caption, { x: visualX, y: 1.05 + chartH + 0.05, w: visualW, h: 0.25, fontSize: 9, color: theme.textSecondary, italic: true, align: 'center' });
      }
    } catch (chartErr) {
      console.warn('[PPTX] Chart render failed:', chartErr);
    }
  }

  if (hasDiagram) {
    const diag = slide.diagram_spec;
    const diagY = hasChart ? 1.05 + (hasDiagram ? 2.0 : 3.5) : 1.05;
    const diagH = hasChart ? 1.8 : 3.3;
    let diagText = `[${(diag?.type || 'DIAGRAM').toUpperCase()}]\n`;
    if (diag?.nodes?.length) {
      diagText += diag.nodes.map((n: any, i: number) => `${i + 1}. ${n.label}${n.description ? ' — ' + n.description : ''}`).join('\n');
    } else if (diag?.events?.length) {
      diagText += diag.events.map((e: any) => `${e.year}: ${e.label}`).join('\n');
    } else if (diag?.left && diag?.right) {
      diagText += `${diag.left.title}: ${diag.left.items?.join(', ')}\nvs\n${diag.right.title}: ${diag.right.items?.join(', ')}`;
    }
    ps.addShape('rect', { x: visualX, y: diagY, w: visualW, h: diagH, fill: { color: 'F0F4FF' }, line: { color: 'CBD5E1', pt: 1 } });
    ps.addText(diagText, { x: visualX + 0.1, y: diagY + 0.1, w: visualW - 0.2, h: diagH - 0.2, fontSize: 10, color: theme.text, valign: 'top', wrap: true });
  }

  addAccentLine(ps, theme);
  if (slide.notes) ps.addNotes(stripMd(slide.notes));
}
