'use client';

import { useState } from 'react';
import DeckGenerator from '@/components/DeckGenerator';
import { SlideCanvas } from '@/components/SlideCanvas';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, Sparkles } from 'lucide-react';

interface Slide {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  stat_blocks?: Array<{ value: string; label: string }> | null;
  cards?: Array<{ icon: string; title: string; description: string }> | null;
  notes?: string;
  chart_spec?: any;
  diagram_spec?: any;
  image?: { prompt: string; alt: string; source: string; url?: string };
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

export default function StudioNewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 480000); // 8 min

      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || err.details || `HTTP ${response.status}`);
      }
      const result = await response.json();
      if (!result.deck) throw new Error('Invalid response: deck not found');
      setGeneratedDeck(result.deck);
    } catch (err) {
      const msg = err instanceof Error
        ? (err.name === 'AbortError' ? 'Request timed out — is Ollama running? (ollama serve)' : err.message)
        : 'An unknown error occurred';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const strip = (text: string) =>
    text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

  const handleExport = async (format: 'pptx' | 'pdf' | 'json') => {
    if (!generatedDeck) return;
    setExportLoading(format);
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(generatedDeck, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${strip(generatedDeck.title)}.json`; a.click();
        URL.revokeObjectURL(url);
        return;
      }

      const endpoint = format === 'pptx' ? '/api/export/pptx' : '/api/export/pdf';
      const body = format === 'pptx' ? generatedDeck : convertForPdf(generatedDeck);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: body }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || response.statusText);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${strip(generatedDeck.title)}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExportLoading(null);
    }
  };

  const convertForPdf = (deck: Deck) => ({
    id: `deck-${Date.now()}`,
    title: strip(deck.title),
    theme: deck.theme,
    meta: { title: strip(deck.title), theme: deck.theme, audience: 'general', tone: 'professional' },
    slides: deck.slides.map((slide, idx) => ({
      id: `slide-${idx}`,
      layout: slide.layout || 'title-content',
      blocks: [
        { type: 'Heading', text: strip(slide.title), level: 1 },
        ...(slide.bullets?.length ? [{ type: 'Bullets', items: slide.bullets.map(strip) }] : []),
      ],
      notes: slide.notes || '',
      citations: slide.citations || [],
    })),
  });

  // ── Loading screen ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center"
        style={{ backgroundColor: '#0F1117' }}>
        <div className="text-center space-y-6 max-w-md px-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-pulse" />
            <div className="absolute inset-0 rounded-full border-t-4 border-blue-500 animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Generating your deck…</h2>
            <p className="text-white/50 text-sm">
              Multi-agent AI is researching, structuring, and writing your slides.
              This takes 2–5 minutes with Ollama.
            </p>
          </div>
          <div className="space-y-2 text-left">
            {['Researching topic…','Planning slide structure…','Writing slide content…','Generating charts & diagrams…'].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: `${i*0.4}s` }} />
                <span className="text-white/50 text-sm">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Generator form ──
  if (!generatedDeck) {
    return (
      <div>
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-full px-4">
            <div className="bg-red-900/90 border border-red-500 rounded-xl p-4 shadow-2xl text-white backdrop-blur-sm">
              <p className="font-semibold text-sm">Generation Failed</p>
              <p className="text-sm text-red-200 mt-1">{error}</p>
            </div>
          </div>
        )}
        <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
      </div>
    );
  }

  // ── Presentation view ──
  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#0F1117' }}>

      {/* Top bar */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-2.5 border-b"
        style={{ backgroundColor: '#1a1d27', borderColor: '#ffffff15' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-sm">SlideSmith</span>
          </div>
          <div className="w-px h-5 bg-white/20" />
          <p className="text-white/70 text-sm font-medium truncate max-w-xs">
            {strip(generatedDeck.title)}
          </p>
          <span className="text-white/30 text-xs flex-shrink-0">
            {generatedDeck.slides.length} slides · {generatedDeck.theme.replace(/_/g,' ')}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {error && (
            <span className="text-xs text-red-400 max-w-xs truncate">{error}</span>
          )}
          <Button size="sm" variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 gap-2 text-xs"
            onClick={() => { setGeneratedDeck(null); setError(null); }}>
            <RefreshCw className="w-3.5 h-3.5" /> New Deck
          </Button>
          <Button size="sm" variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10 gap-2 text-xs"
            onClick={() => handleExport('pdf')}
            disabled={exportLoading === 'pdf'}>
            <Download className="w-3.5 h-3.5" />
            {exportLoading === 'pdf' ? 'Exporting…' : 'PDF'}
          </Button>
          <Button size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2 text-xs font-semibold"
            onClick={() => handleExport('pptx')}
            disabled={exportLoading === 'pptx'}>
            <Download className="w-3.5 h-3.5" />
            {exportLoading === 'pptx' ? 'Exporting…' : 'Export PPTX'}
          </Button>
        </div>
      </div>

      {/* Slide canvas (takes remaining height) */}
      <div className="flex-1 min-h-0">
        <SlideCanvas deck={generatedDeck} />
      </div>
    </div>
  );
}
