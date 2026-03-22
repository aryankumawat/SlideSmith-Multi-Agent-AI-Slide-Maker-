'use client';

import { useState } from 'react';
import DeckGenerator from '@/components/DeckGenerator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChartDisplay } from '@/components/ChartDisplay';
import { DiagramDisplay } from '@/components/DiagramDisplay';
import { Download, RefreshCw, BookOpen, BarChart2, Network, FileText } from 'lucide-react';

interface Slide {
  layout: 'title' | 'title_bullets' | 'two_column' | 'quote' | 'chart' | 'image_full';
  title: string;
  bullets?: string[];
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  image?: { prompt: string; alt: string; source: string };
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

// ─── Theme configs ─────────────────────────────────────────────────────────────
const THEME_CONFIGS: Record<string, {
  card: string; header: string; title: string; text: string;
  bullet: string; badge: string; number: string;
  accent: string; bg: string;
}> = {
  academic: {
    bg: 'bg-slate-50',
    card: 'bg-white border border-slate-200 hover:shadow-lg',
    header: 'bg-gradient-to-r from-slate-800 to-slate-700',
    title: 'text-white',
    text: 'text-slate-700',
    bullet: 'text-slate-600',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    number: 'bg-slate-800 text-white',
    accent: 'text-red-600',
  },
  corporate: {
    bg: 'bg-blue-50',
    card: 'bg-white border border-blue-100 hover:shadow-lg',
    header: 'bg-gradient-to-r from-blue-700 to-indigo-700',
    title: 'text-white',
    text: 'text-slate-700',
    bullet: 'text-slate-600',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    number: 'bg-blue-700 text-white',
    accent: 'text-blue-600',
  },
  deep_space: {
    bg: 'bg-slate-950',
    card: 'bg-slate-900 border border-slate-700 hover:shadow-2xl hover:shadow-violet-900/20',
    header: 'bg-gradient-to-r from-violet-700 to-indigo-700',
    title: 'text-white',
    text: 'text-slate-300',
    bullet: 'text-slate-400',
    badge: 'bg-violet-900/40 text-violet-300 border border-violet-700',
    number: 'bg-violet-700 text-white',
    accent: 'text-cyan-400',
  },
  ultra_violet: {
    bg: 'bg-slate-950',
    card: 'bg-purple-950/80 border border-purple-700 hover:shadow-2xl hover:shadow-purple-900/30',
    header: 'bg-gradient-to-r from-purple-700 to-fuchsia-700',
    title: 'text-white',
    text: 'text-purple-200',
    bullet: 'text-purple-300',
    badge: 'bg-purple-900/40 text-purple-300 border border-purple-700',
    number: 'bg-purple-700 text-white',
    accent: 'text-cyan-400',
  },
  navy_gold: {
    bg: 'bg-slate-950',
    card: 'bg-[#0F2040] border border-yellow-700/40 hover:shadow-xl hover:shadow-yellow-900/20',
    header: 'bg-gradient-to-r from-[#0A1628] to-[#0F2040]',
    title: 'text-yellow-400',
    text: 'text-slate-200',
    bullet: 'text-slate-300',
    badge: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700/50',
    number: 'bg-yellow-600 text-slate-900',
    accent: 'text-yellow-400',
  },
  minimal: {
    bg: 'bg-gray-50',
    card: 'bg-white border border-gray-200 hover:shadow-md',
    header: 'bg-gray-100 border-b border-gray-200',
    title: 'text-gray-900',
    text: 'text-gray-700',
    bullet: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-600 border border-gray-200',
    number: 'bg-gray-200 text-gray-700',
    accent: 'text-blue-600',
  },
};

const getTheme = (theme: string) =>
  THEME_CONFIGS[theme] || THEME_CONFIGS['academic'];

// ─── Markdown bold renderer ────────────────────────────────────────────────────
function renderBold(text: string, accentClass: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className={`font-semibold ${accentClass}`}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// ─── Slide Card ───────────────────────────────────────────────────────────────
function SlideCard({ slide, index, theme }: { slide: Slide; index: number; theme: string }) {
  const t = getTheme(theme);
  const hasChart = !!slide.chart_spec;
  const hasDiagram = !!slide.diagram_spec;
  const hasBullets = slide.bullets && slide.bullets.length > 0;

  return (
    <Card className={`overflow-hidden transition-all duration-200 ${t.card}`}>
      {/* Header */}
      <div className={`${t.header} px-4 py-3 flex items-start gap-3`}>
        <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${t.number}`}>
          {index + 1}
        </span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold leading-snug ${t.title}`}>
            {renderBold(slide.title, t.accent)}
          </h3>
          {/* Badges */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {hasChart && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.badge} flex items-center gap-1`}>
                <BarChart2 className="w-2.5 h-2.5" /> Chart
              </span>
            )}
            {hasDiagram && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.badge} flex items-center gap-1`}>
                <Network className="w-2.5 h-2.5" /> Diagram
              </span>
            )}
            {!hasChart && !hasDiagram && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.badge} flex items-center gap-1`}>
                <FileText className="w-2.5 h-2.5" />
                {slide.layout?.replace(/_/g, ' ') || 'content'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <CardContent className="p-4 space-y-3">
        {/* Bullets */}
        {hasBullets && (
          <ul className="space-y-2">
            {slide.bullets!.map((bullet, bi) => (
              <li key={bi} className="flex items-start gap-2">
                <span className={`mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full ${t.accent.replace('text-', 'bg-').replace('/', '-')}`}
                  style={{ backgroundColor: 'currentColor' }}
                />
                <span className={`text-xs leading-relaxed ${t.bullet}`}>
                  {renderBold(bullet, t.accent)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Chart */}
        {hasChart && (
          <ChartDisplay chartSpec={slide.chart_spec} compact={true} className="mt-1" />
        )}

        {/* Diagram */}
        {hasDiagram && (
          <DiagramDisplay diagramSpec={slide.diagram_spec} compact={true} className="mt-1" />
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function StudioNewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 420000); // 7 min

      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`);
      }

      const result = await response.json();
      if (!result.deck) throw new Error('Invalid response: deck not found');
      setGeneratedDeck(result.deck);
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? 'Request timed out — is Ollama running?' : err.message)
        : 'An unknown error occurred';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const stripMarkdown = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

  const handleExport = async (format: 'pptx' | 'pdf' | 'json') => {
    if (!generatedDeck) return;

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(generatedDeck, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stripMarkdown(generatedDeck.title)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    try {
      const endpoint = format === 'pptx' ? '/api/export/pptx' : '/api/export/pdf';
      const deckToExport = format === 'pptx' ? generatedDeck : convertDeckForPdf(generatedDeck);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: deckToExport }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown' }));
        throw new Error(err.error || response.statusText);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${stripMarkdown(generatedDeck.title)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const convertDeckForPdf = (deck: Deck) => ({
    id: `deck-${Date.now()}`,
    title: stripMarkdown(deck.title),
    theme: deck.theme,
    meta: { title: stripMarkdown(deck.title), theme: deck.theme, audience: 'general', tone: 'professional' },
    slides: deck.slides.map((slide, index) => ({
      id: `slide-${index}`,
      layout: slide.layout || 'title-content',
      blocks: [
        { type: 'Heading', text: stripMarkdown(slide.title), level: 1 },
        ...(slide.bullets?.length ? [{ type: 'Bullets', items: slide.bullets.map(stripMarkdown) }] : []),
        ...(slide.chart_spec ? [{ type: 'Chart', chartSpec: slide.chart_spec }] : []),
      ],
      notes: slide.notes || '',
      citations: slide.citations || [],
    })),
  });

  const t = getTheme(generatedDeck?.theme || 'academic');

  // ─── Generator view ──────────────────────────────────────────────────────────
  if (!generatedDeck) {
    return (
      <div>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-lg w-full px-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 shadow-lg">
              <p className="text-sm font-semibold text-red-700">Generation Failed</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
              {error.includes('Ollama') && (
                <p className="text-xs text-red-400 mt-1">Run: <code className="bg-red-100 px-1 rounded">ollama serve</code></p>
              )}
            </div>
          </div>
        )}
        <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
      </div>
    );
  }

  // ─── Deck view ───────────────────────────────────────────────────────────────
  const chartCount = generatedDeck.slides.filter(s => s.chart_spec).length;
  const diagramCount = generatedDeck.slides.filter(s => s.diagram_spec).length;

  return (
    <div className={`min-h-screen ${t.bg} py-8 px-4`}>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Deck header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-5 h-5 text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                {generatedDeck.theme.replace(/_/g, ' ')} Theme
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {renderBold(generatedDeck.title, 'text-blue-600')}
            </h1>
            <div className="flex gap-3 mt-2 text-sm text-slate-500">
              <span>{generatedDeck.slides.length} slides</span>
              {chartCount > 0 && <span>· {chartCount} charts</span>}
              {diagramCount > 0 && <span>· {diagramCount} diagrams</span>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setGeneratedDeck(null)}
              className="gap-2">
              <RefreshCw className="w-4 h-4" /> New Deck
            </Button>
            <Button size="sm" onClick={() => handleExport('pptx')} className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="w-4 h-4" /> Export PPTX
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('pdf')} className="gap-2">
              <Download className="w-4 h-4" /> Export PDF
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Slides grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {generatedDeck.slides.map((slide, index) => (
            <SlideCard key={index} slide={slide} index={index} theme={generatedDeck.theme} />
          ))}
        </div>
      </div>
    </div>
  );
}
