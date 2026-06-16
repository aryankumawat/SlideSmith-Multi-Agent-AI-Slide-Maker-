'use client';

import { useState } from 'react';
import DeckGenerator from '@/components/DeckGenerator';
import { SlideCanvas } from '@/components/SlideCanvas';

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

const FONT = 'var(--font-syne), Syne, sans-serif';
const BG = '#0D0D0D';
const BORDER = '#1E1E1E';
const TEXT = '#F0EEE8';
const MUTED = '#555';
const LIME = '#C8FF00';

const BTN_BASE: React.CSSProperties = {
  border: `1px solid #2A2A2A`,
  color: MUTED,
  background: 'none',
  padding: '6px 14px',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  cursor: 'pointer',
  fontFamily: FONT,
  transition: 'all 0.12s',
};

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
      const timeoutId = setTimeout(() => controller.abort(), 480000);

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

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', background: BG, color: TEXT,
        fontFamily: FONT,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 480, padding: '0 24px', textAlign: 'center' }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.25em', textTransform: 'uppercase',
            color: MUTED, marginBottom: 28,
          }}>
            SlideSmith / Generating
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 800,
            lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 36px',
          }}>
            Building your presentation…
          </h2>

          {/* Progress track */}
          <div style={{
            width: '100%', height: 1, background: '#1E1E1E',
            position: 'relative', overflow: 'hidden', marginBottom: 36,
          }}>
            <div className="ss-progress-bar" style={{
              position: 'absolute', left: 0, top: 0,
              width: '40%', height: '100%',
              background: LIME,
            }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'left' }}>
            {[
              'Researching topic',
              'Planning slide structure',
              'Writing slide content',
              'Generating charts & visuals',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{
                  fontSize: 9, color: '#2A2A2A', letterSpacing: '0.1em',
                  minWidth: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 13, color: '#444' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Generator form ───────────────────────────────────────────────────────────
  if (!generatedDeck) {
    return (
      <div>
        {error && (
          <div style={{
            position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
            zIndex: 50, maxWidth: 520, width: 'calc(100% - 32px)',
            background: '#1A0808', border: '1px solid #4A1010',
            padding: '16px 20px', fontFamily: FONT,
          }}>
            <p style={{ fontWeight: 700, fontSize: 12, color: '#FF6B6B', marginBottom: 4, letterSpacing: '0.05em' }}>
              Generation Failed
            </p>
            <p style={{ fontSize: 12, color: '#CC5555', margin: 0, lineHeight: 1.5 }}>{error}</p>
          </div>
        )}
        <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
      </div>
    );
  }

  // ── Presentation view ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: BG, fontFamily: FONT }}>

      {/* Top bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 48,
        borderBottom: `1px solid ${BORDER}`,
        background: BG,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: TEXT, flexShrink: 0 }}>
            SlideSmith
          </span>
          <span style={{ color: '#2A2A2A', fontSize: 14 }}>/</span>
          <span style={{
            fontSize: 12, color: MUTED,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 280,
          }}>
            {strip(generatedDeck.title)}
          </span>
          <span style={{
            fontSize: 10, color: '#333', flexShrink: 0,
            letterSpacing: '0.08em',
          }}>
            {generatedDeck.slides.length} slides
          </span>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {error && (
            <span style={{ fontSize: 11, color: '#FF6B6B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error}
            </span>
          )}
          <button
            style={BTN_BASE}
            onClick={() => { setGeneratedDeck(null); setError(null); }}
          >
            ← New Deck
          </button>
          <button
            style={{ ...BTN_BASE, opacity: exportLoading === 'pdf' ? 0.5 : 1 }}
            onClick={() => handleExport('pdf')}
            disabled={exportLoading === 'pdf'}
          >
            {exportLoading === 'pdf' ? 'Exporting…' : 'PDF'}
          </button>
          <button
            style={{
              ...BTN_BASE,
              background: LIME,
              border: `1px solid ${LIME}`,
              color: '#0D0D0D',
              opacity: exportLoading === 'pptx' ? 0.6 : 1,
            }}
            onClick={() => handleExport('pptx')}
            disabled={exportLoading === 'pptx'}
          >
            {exportLoading === 'pptx' ? 'Exporting…' : 'Export PPTX'}
          </button>
        </div>
      </div>

      {/* Slide canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SlideCanvas deck={generatedDeck} />
      </div>
    </div>
  );
}
