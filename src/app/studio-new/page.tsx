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

interface LoadingState {
  progress: number;
  message: string;
  deckTitle: string;
  slideTopics: string[];
  completedSlides: number;
  totalSlides: number;
  currentTitle: string;
}

const LOADING_INIT: LoadingState = {
  progress: 0,
  message: 'Starting…',
  deckTitle: '',
  slideTopics: [],
  completedSlides: 0,
  totalSlides: 0,
  currentTitle: '',
};

export default function StudioNewPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingState, setLoadingState] = useState<LoadingState>(LOADING_INIT);
  const [generatedDeck, setGeneratedDeck] = useState<Deck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleGenerate = async (data: any) => {
    setIsLoading(true);
    setError(null);
    setLoadingState(LOADING_INIT);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000);

      const response = await fetch('/api/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok || !response.body) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event: any;
          try { event = JSON.parse(part.slice(6)); } catch { continue; }

          if (event.type === 'planning') {
            setLoadingState(s => ({ ...s, message: event.message, progress: event.progress }));
          } else if (event.type === 'outline') {
            setLoadingState(s => ({
              ...s,
              deckTitle: event.title,
              slideTopics: event.slideTopics,
              totalSlides: event.totalSlides,
              progress: event.progress,
              message: 'Writing slides…',
            }));
          } else if (event.type === 'slide') {
            setLoadingState(s => ({
              ...s,
              completedSlides: event.index,
              currentTitle: event.title,
              totalSlides: event.totalSlides,
              progress: event.progress,
              message: `Slide ${event.index} of ${event.totalSlides}`,
            }));
          } else if (event.type === 'complete') {
            setGeneratedDeck(event.deck);
            setIsLoading(false);
            return;
          } else if (event.type === 'error') {
            throw new Error(event.message);
          }
        }
      }
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
    const { progress, deckTitle, slideTopics, completedSlides, totalSlides, currentTitle, message } = loadingState;
    const hasOutline = slideTopics.length > 0;

    return (
      <div style={{
        minHeight: '100vh', background: BG, color: TEXT, fontFamily: FONT,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          borderBottom: `1px solid ${BORDER}`, padding: '0 48px', height: 48,
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            SlideSmith
          </span>
          <span style={{ color: '#2A2A2A', fontSize: 14 }}>/</span>
          <span style={{ fontSize: 11, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Generating
          </span>
        </div>

        {/* Content */}
        <div style={{
          flex: 1, display: 'flex', gap: 0,
          overflow: 'hidden',
        }}>
          {/* Left: progress info */}
          <div style={{
            flex: '0 0 400px', padding: '56px 48px', display: 'flex',
            flexDirection: 'column', borderRight: `1px solid ${BORDER}`,
            overflowY: 'auto',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#333', marginBottom: 20 }}>
              Building your deck
            </div>

            {deckTitle ? (
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 32px', color: TEXT }}>
                {deckTitle}
              </h2>
            ) : (
              <h2 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 32px', color: '#2A2A2A' }}>
                Planning structure…
              </h2>
            )}

            {/* Progress bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: MUTED }}>{message}</span>
                <span style={{
                  fontSize: 22, fontWeight: 800, color: progress > 0 ? LIME : '#222',
                  fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em',
                  transition: 'color 0.3s',
                }}>
                  {progress}%
                </span>
              </div>
              <div style={{ width: '100%', height: 2, background: '#1A1A1A', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${progress}%`,
                  background: LIME,
                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                }} />
              </div>
            </div>

            {hasOutline && (
              <div style={{ marginTop: 8, fontSize: 11, color: '#333' }}>
                {completedSlides} / {totalSlides} slides written
              </div>
            )}

            {/* Phase indicators */}
            <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Plan structure', done: hasOutline || progress >= 10 },
                { label: 'Write slides', done: completedSlides === totalSlides && totalSlides > 0 },
                { label: 'Generate visuals', done: progress >= 95 },
              ].map((phase, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: phase.done ? LIME : '#2A2A2A',
                    boxShadow: phase.done ? `0 0 6px ${LIME}` : 'none',
                    transition: 'all 0.3s',
                  }} />
                  <span style={{ fontSize: 12, color: phase.done ? '#888' : '#333', transition: 'color 0.3s' }}>
                    {phase.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: slide list */}
          <div style={{ flex: 1, padding: '56px 48px', overflowY: 'auto' }}>
            {!hasOutline ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{
                    height: 20, background: '#111', borderRadius: 2,
                    width: `${60 + (i % 3) * 15}%`,
                    opacity: 0.4 + (i * 0.05),
                  }} />
                ))}
              </div>
            ) : (
              <div>
                <div style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
                  textTransform: 'uppercase', color: '#333', marginBottom: 20,
                }}>
                  Slides · {totalSlides} total
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {slideTopics.map((title, i) => {
                    const slideNum = i + 1;
                    const isDone = slideNum <= completedSlides;
                    const isCurrent = slideNum === completedSlides + 1;
                    return (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '10px 0',
                        borderBottom: `1px solid #111`,
                        transition: 'opacity 0.3s',
                      }}>
                        {/* Status indicator */}
                        <div style={{ width: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {isDone ? (
                            <span style={{ fontSize: 11, color: LIME, fontWeight: 700 }}>✓</span>
                          ) : isCurrent ? (
                            <span style={{ fontSize: 11, color: TEXT, fontWeight: 700 }}>→</span>
                          ) : (
                            <span style={{ fontSize: 10, color: '#2A2A2A', fontVariantNumeric: 'tabular-nums' }}>
                              {String(slideNum).padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <span style={{
                          fontSize: 13,
                          fontWeight: isCurrent ? 700 : 400,
                          color: isDone ? '#444' : isCurrent ? TEXT : '#2A2A2A',
                          transition: 'color 0.3s',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {title}
                        </span>

                        {isCurrent && (
                          <span style={{ fontSize: 9, color: LIME, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>
                            writing
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
