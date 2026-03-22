/**
 * Advanced PPTX Exporter — handles the new deck format (title + bullets + chart_spec + diagram_spec)
 */
import PptxGenJS from 'pptxgenjs';

interface Slide {
  layout?: string;
  title: string;
  bullets?: string[];
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  image?: { source?: string; alt?: string; prompt?: string };
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
}

const THEMES: Record<string, ThemeConfig> = {
  academic:     { background: 'FAFAFA', headerBg: '1A3A5C', text: '1A1A1A', textSecondary: '5A6A7A', accent: 'C0392B', bullet: '1A3A5C' },
  corporate:    { background: 'F0F4FF', headerBg: '1E40AF', text: '1E293B', textSecondary: '64748B', accent: '2563EB', bullet: '1E40AF' },
  deep_space:   { background: '0B0F1A', headerBg: '101828', text: 'E2E8F0', textSecondary: '94A3B8', accent: '7C3AED', bullet: '7C3AED' },
  ultra_violet: { background: '0F0820', headerBg: '1B1035', text: 'F8FAFC', textSecondary: 'A1A1AA', accent: 'A855F7', bullet: 'A855F7' },
  navy_gold:    { background: '0A1628', headerBg: '06101E', text: 'F0F4F8', textSecondary: '8EA8C3', accent: 'F4C430', bullet: 'F4C430' },
  minimal:      { background: 'FFFFFF', headerBg: '1F2937', text: '111827', textSecondary: '6B7280', accent: '3B82F6', bullet: '3B82F6' },
};

const PALETTE = ['1A3A5C','C0392B','2E86AB','A23B72','F18F01','5C6BC0','26A69A','78909C'];

function getTheme(name: string): ThemeConfig {
  const key = name?.toLowerCase().replace(/[_\- ]/g, '_');
  return THEMES[key] || THEMES[key?.replace(/_/g,'') as string] || THEMES.academic;
}

function stripMd(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .trim();
}

// Convert new chart_spec {type, labels, datasets} → PptxGenJS format [{name, labels, values}]
function convertChartData(spec: any): { type: string; data: any[]; } {
  const type = (spec.type || spec.kind || 'bar').toLowerCase();

  // New format: spec.labels + spec.datasets
  if (spec.labels && spec.datasets) {
    const data = spec.datasets.map((ds: any) => ({
      name: ds.label || 'Value',
      labels: spec.labels,
      values: ds.data || [],
    }));
    return { type, data };
  }

  // Old format: spec.data is already array of {name, labels, values}
  if (Array.isArray(spec.data) && spec.data[0]?.values) {
    return { type, data: spec.data };
  }

  // Flat array fallback
  if (Array.isArray(spec.data)) {
    const labels = spec.data.map((d: any) => d.name || String(d.label || ''));
    const values = spec.data.map((d: any) => d.value ?? d.values?.[0] ?? 0);
    return { type, data: [{ name: spec.title || 'Data', labels, values }] };
  }

  // Fallback demo
  return { type, data: [{ name: 'Data', labels: ['A','B','C','D'], values: [40,65,52,78] }] };
}

function pptxChartType(type: string): string {
  const map: Record<string, string> = {
    bar: 'bar', line: 'line', pie: 'pie', area: 'area',
    scatter: 'scatter', doughnut: 'doughnut', column: 'bar',
  };
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

  for (let i = 0; i < deck.slides.length; i++) {
    const slide = deck.slides[i];
    try {
      await addSlide(pptx, slide, theme, i + 1, deck.slides.length, deck.theme);
    } catch (err) {
      console.error(`[PPTX] Slide ${i+1} error:`, err);
      // Add a simple fallback slide rather than failing the whole export
      const ps = pptx.addSlide();
      ps.background = { color: theme.background };
      ps.addText(stripMd(slide.title || `Slide ${i+1}`), {
        x: 0.5, y: 2, w: 9, h: 1.5,
        fontSize: 32, bold: true, color: theme.text, align: 'center',
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
  themeName: string,
): Promise<void> {
  const ps = pptx.addSlide();
  ps.background = { color: theme.background };

  const bullets = slide.bullets || [];
  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;

  // ── Header bar ──────────────────────────────────────────────
  ps.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 10, h: 0.9,
    fill: { color: theme.headerBg },
    line: { type: 'none' },
  });

  // Title in header
  ps.addText(stripMd(slide.title || ''), {
    x: 0.3, y: 0, w: 8.8, h: 0.9,
    fontSize: 24, bold: true, color: 'FFFFFF',
    valign: 'middle', wrap: true,
  });

  // Slide number
  ps.addText(`${num} / ${total}`, {
    x: 8.8, y: 0, w: 1, h: 0.9,
    fontSize: 10, color: 'AAAAAA', align: 'right', valign: 'middle',
  });

  // ── Body ─────────────────────────────────────────────────────
  const bodyTop = 1.0;
  const bodyH = 4.3;
  const hasVisual = hasChart || hasDiagram;
  const bulletW = hasVisual && bullets.length > 0 ? 4.4 : 9.2;
  const visualX = bullets.length > 0 ? 4.8 : 0.4;
  const visualW = bullets.length > 0 ? 5.0 : 9.2;

  // Bullets
  if (bullets.length > 0) {
    const maxB = Math.min(bullets.length, 8);
    const textObjs = bullets.slice(0, maxB).map(b => ([
      { text: '●  ', options: { color: theme.bullet, fontSize: 6 } },
      { text: stripMd(b) + '\n', options: { color: theme.text, fontSize: maxB > 5 ? 13 : 15 } },
    ])).flat();

    ps.addText(textObjs as any, {
      x: 0.4, y: bodyTop, w: bulletW, h: bodyH,
      valign: 'top', wrap: true, lineSpacing: 22,
    });
  }

  // Citations
  if (slide.citations?.length) {
    const citeText = slide.citations.slice(0,2).join('  |  ');
    ps.addText(stripMd(citeText), {
      x: 0.4, y: 5.2, w: 9.2, h: 0.3,
      fontSize: 8, color: theme.textSecondary, italic: true,
    });
  }

  // ── Chart ─────────────────────────────────────────────────────
  if (hasChart) {
    try {
      const { type, data } = convertChartData(slide.chart_spec);
      const pptxType = pptxChartType(type);
      const chartH = hasChart && hasDiagram ? 1.8 : 3.3;

      (ps as any).addChart(pptxType, data, {
        x: visualX, y: bodyTop, w: visualW, h: chartH,
        showTitle: false,
        showLegend: data.length > 1,
        legendPos: 'b',
        chartColors: PALETTE.map(c => c.toUpperCase()),
        catAxisLabelColor: theme.textSecondary,
        valAxisLabelColor: theme.textSecondary,
        catAxisLabelFontSize: 10,
        valAxisLabelFontSize: 10,
        dataLabelColor: theme.text,
        dataLabelFontSize: 9,
      });

      if (slide.chart_spec?.caption) {
        ps.addText(slide.chart_spec.caption, {
          x: visualX, y: bodyTop + chartH + 0.05, w: visualW, h: 0.25,
          fontSize: 9, color: theme.textSecondary, italic: true, align: 'center',
        });
      }
    } catch (chartErr) {
      console.warn('[PPTX] Chart render failed:', chartErr);
      ps.addText('[Chart: ' + (slide.chart_spec?.title || 'Data Visualization') + ']', {
        x: visualX, y: bodyTop, w: visualW, h: 2,
        fontSize: 14, color: theme.textSecondary, align: 'center', valign: 'middle',
      });
    }
  }

  // ── Diagram (text representation in PPTX) ─────────────────────
  if (hasDiagram) {
    const diagY = hasChart ? bodyTop + (hasChart && hasDiagram ? 2.0 : 3.5) : bodyTop;
    const diagH = hasChart ? 1.8 : 3.3;
    const diag = slide.diagram_spec;
    const diagType = diag?.type || 'diagram';

    let diagText = `[${diagType.toUpperCase()} DIAGRAM]\n`;
    if (diag?.nodes?.length) {
      diagText += diag.nodes.map((n: any, i: number) =>
        `${i+1}. ${n.label}${n.description ? ' — ' + n.description : ''}`
      ).join('\n');
    } else if (diag?.events?.length) {
      diagText += diag.events.map((e: any) => `${e.year}: ${e.label}`).join('\n');
    } else if (diag?.left && diag?.right) {
      diagText += `${diag.left.title}: ${diag.left.items?.join(', ')}\nvs\n${diag.right.title}: ${diag.right.items?.join(', ')}`;
    }

    ps.addShape(pptx.ShapeType.rect, {
      x: visualX, y: diagY, w: visualW, h: diagH,
      fill: { color: 'F0F4FF' },
      line: { color: 'CBD5E1', pt: 1 },
    });
    ps.addText(diagText, {
      x: visualX + 0.1, y: diagY + 0.1, w: visualW - 0.2, h: diagH - 0.2,
      fontSize: 10, color: theme.text, valign: 'top', wrap: true, lineSpacing: 16,
    });
  }

  // ── Bottom accent line ──────────────────────────────────────────
  ps.addShape(pptx.ShapeType.rect, {
    x: 0, y: 5.5, w: 10, h: 0.125,
    fill: { color: theme.accent },
    line: { type: 'none' },
  });

  if (slide.notes) {
    ps.addNotes(stripMd(slide.notes));
  }
}
