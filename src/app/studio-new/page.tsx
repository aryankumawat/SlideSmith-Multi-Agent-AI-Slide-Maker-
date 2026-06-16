'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const SYNE = 'var(--font-syne), Syne, sans-serif';
const MONO = 'var(--font-geist-mono), monospace';
const LIME = '#C8FF00';
const BG = '#0A0A0A';
const BORDER = '#161616';
const TEXT = '#F0EEE8';
const MUTED = '#404040';

const EASE = [0.32, 0.72, 0, 1] as const;

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
        ? (err.name === 'AbortError' ? 'Request timed out. Is Ollama running? (ollama serve)' : err.message)
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

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (isLoading) {
    const { progress, deckTitle, slideTopics, completedSlides, totalSlides, message } = loadingState;
    const hasOutline = slideTopics.length > 0;

    return (
      <div style={{
        minHeight: '100dvh',
        background: BG,
        color: TEXT,
        fontFamily: SYNE,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Nav */}
        <div style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          borderBottom: `1px solid ${BORDER}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            SlideSmith
          </span>
          <span style={{ fontSize: 11, color: MUTED, fontFamily: MONO, letterSpacing: '0.08em' }}>
            {message}
          </span>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Left: Big progress */}
          <div style={{
            flex: '0 0 420px',
            padding: '64px 48px',
            borderRight: `1px solid ${BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
              {/* Progress number */}
              <div style={{ marginBottom: 48 }}>
                <motion.div
                  key={Math.floor(progress / 5)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    fontSize: 'clamp(72px, 10vw, 96px)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    color: progress > 0 ? LIME : '#1A1A1A',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'color 0.4s',
                  }}
                >
                  {progress}<span style={{ fontSize: '0.5em', fontWeight: 400, color: '#2A2A2A' }}>%</span>
                </motion.div>

                {/* Progress bar */}
                <div style={{
                  marginTop: 20,
                  width: '100%',
                  height: 3,
                  background: '#141414',
                  borderRadius: 2,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    style={{
                      position: 'absolute',
                      left: 0, top: 0,
                      height: '100%',
                      background: LIME,
                      borderRadius: 2,
                      boxShadow: `0 0 12px ${LIME}60`,
                    }}
                  />
                </div>
              </div>

              {/* Deck title */}
              <AnimatePresence mode="wait">
                {deckTitle ? (
                  <motion.h2
                    key="title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    style={{
                      fontSize: 'clamp(18px, 2.5vw, 24px)',
                      fontWeight: 800,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      color: TEXT,
                      margin: 0,
                    }}
                  >
                    {deckTitle}
                  </motion.h2>
                ) : (
                  <motion.p
                    key="planning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 15, color: '#2A2A2A', margin: 0, fontStyle: 'italic' }}
                  >
                    Planning structure...
                  </motion.p>
                )}
              </AnimatePresence>

              {hasOutline && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 12, color: MUTED, marginTop: 8, fontFamily: MONO }}
                >
                  {completedSlides} of {totalSlides} slides written
                </motion.p>
              )}
            </div>

            {/* Phase steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Plan structure', done: hasOutline || progress >= 10 },
                { label: 'Write slides', done: completedSlides === totalSlides && totalSlides > 0 },
                { label: 'Generate visuals', done: progress >= 95 },
              ].map((phase, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <motion.div
                    animate={{
                      background: phase.done ? LIME : '#1A1A1A',
                      boxShadow: phase.done ? `0 0 8px ${LIME}80` : 'none',
                    }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13,
                    color: phase.done ? '#666' : '#2A2A2A',
                    textDecoration: phase.done ? 'line-through' : 'none',
                    transition: 'color 0.3s',
                  }}>
                    {phase.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Slide list */}
          <div style={{ flex: 1, padding: '64px 48px', overflowY: 'auto' }}>
            {!hasOutline ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <p style={{ fontSize: 11, color: '#2A2A2A', fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 8 }}>
                  Generating outline...
                </p>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    style={{
                      height: 16,
                      background: '#141414',
                      borderRadius: 3,
                      width: `${45 + (i % 4) * 12}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div>
                <p style={{
                  fontSize: 11,
                  color: MUTED,
                  fontFamily: MONO,
                  letterSpacing: '0.08em',
                  marginBottom: 24,
                }}>
                  {totalSlides} slides
                </p>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {slideTopics.map((title, i) => {
                    const slideNum = i + 1;
                    const isDone = slideNum <= completedSlides;
                    const isCurrent = slideNum === completedSlides + 1;

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.35, delay: i * 0.04, ease: EASE }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 16,
                          padding: '11px 0',
                          borderBottom: `1px solid ${BORDER}`,
                        }}
                      >
                        {/* Status */}
                        <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {isDone ? (
                            <span style={{ fontSize: 10, color: LIME, fontWeight: 700 }}>✓</span>
                          ) : isCurrent ? (
                            <motion.span
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 0.9, repeat: Infinity }}
                              style={{ fontSize: 10, color: TEXT }}
                            >
                              →
                            </motion.span>
                          ) : (
                            <span style={{
                              fontSize: 10, color: '#242424',
                              fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
                            }}>
                              {String(slideNum).padStart(2, '0')}
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <span style={{
                          fontSize: 13,
                          fontWeight: isCurrent ? 600 : 400,
                          color: isDone ? '#303030' : isCurrent ? TEXT : '#222',
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          transition: 'color 0.3s',
                        }}>
                          {title}
                        </span>

                        {isCurrent && (
                          <motion.span
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                            style={{
                              fontSize: 9,
                              color: LIME,
                              letterSpacing: '0.12em',
                              textTransform: 'uppercase',
                              fontFamily: MONO,
                              flexShrink: 0,
                            }}
                          >
                            writing
                          </motion.span>
                        )}
                      </motion.div>
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

  // ── Generator form ────────────────────────────────────────────────────────────
  if (!generatedDeck) {
    return (
      <div>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: EASE }}
              style={{
                position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
                zIndex: 50, maxWidth: 520, width: 'calc(100% - 32px)',
                background: '#150808', border: '1px solid #3A1010',
                padding: '14px 18px', fontFamily: SYNE, borderRadius: 8,
              }}
            >
              <p style={{ fontWeight: 700, fontSize: 11, color: '#FF6B6B', marginBottom: 3, letterSpacing: '0.06em' }}>
                Generation failed
              </p>
              <p style={{ fontSize: 12, color: '#AA4444', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
      </div>
    );
  }

  // ── Presentation view ────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        overflow: 'hidden',
        background: BG,
        fontFamily: SYNE,
      }}
    >
      {/* Top bar */}
      <div style={{
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 0 28px',
        height: 52,
        borderBottom: `1px solid ${BORDER}`,
      }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: TEXT,
            flexShrink: 0,
          }}>
            SlideSmith
          </span>
          <span style={{ color: '#242424', fontSize: 12 }}>/</span>
          <span style={{
            fontSize: 12,
            color: MUTED,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 320,
          }}>
            {strip(generatedDeck.title)}
          </span>
          <span style={{
            fontSize: 10,
            color: '#242424',
            flexShrink: 0,
            fontFamily: MONO,
          }}>
            {generatedDeck.slides.length} slides
          </span>
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {error && (
            <span style={{ fontSize: 11, color: '#FF6B6B', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {error}
            </span>
          )}

          <button
            onClick={() => { setGeneratedDeck(null); setError(null); }}
            style={{
              padding: '6px 14px',
              background: 'none',
              border: '1px solid #222',
              borderRadius: 6,
              color: MUTED,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              fontFamily: SYNE,
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = TEXT; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = MUTED; }}
          >
            New deck
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exportLoading === 'pdf'}
            style={{
              padding: '6px 14px',
              background: 'none',
              border: '1px solid #222',
              borderRadius: 6,
              color: MUTED,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: exportLoading === 'pdf' ? 'not-allowed' : 'pointer',
              fontFamily: SYNE,
              opacity: exportLoading === 'pdf' ? 0.4 : 1,
              transition: 'border-color 0.15s, color 0.15s, opacity 0.15s',
            }}
            onMouseEnter={e => { if (exportLoading !== 'pdf') { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = TEXT; }}}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#222'; e.currentTarget.style.color = MUTED; }}
          >
            {exportLoading === 'pdf' ? 'Exporting...' : 'PDF'}
          </button>

          <button
            onClick={() => handleExport('pptx')}
            disabled={!!exportLoading}
            style={{
              padding: '7px 16px',
              background: exportLoading === 'pptx' ? '#A0CC00' : LIME,
              border: 'none',
              borderRadius: 6,
              color: '#0A0A0A',
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: exportLoading ? 'not-allowed' : 'pointer',
              fontFamily: SYNE,
              opacity: exportLoading && exportLoading !== 'pptx' ? 0.5 : 1,
              transition: 'opacity 0.15s, background 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!exportLoading) e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {exportLoading === 'pptx' ? 'Exporting...' : 'Export PPTX'}
          </button>
        </div>
      </div>

      {/* Slide canvas */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <SlideCanvas deck={generatedDeck} />
      </div>
    </motion.div>
  );
}
