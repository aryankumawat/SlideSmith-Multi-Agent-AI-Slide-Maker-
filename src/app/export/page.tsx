'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StudioShell from '@/components/StudioShell';

const SYNE = 'var(--font-syne), Syne, sans-serif';
const MONO = 'var(--font-geist-mono), monospace';

interface Slide {
  layout: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  citations?: string[];
}

interface Deck {
  title: string;
  theme: string;
  slides: Slide[];
}

const strip = (text: string) =>
  text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();

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

const EXPORT_FORMATS = [
  {
    id: 'pptx' as const,
    label: 'PowerPoint',
    ext: 'pptx',
    desc: 'Native .pptx file — edit in PowerPoint, Keynote, or Google Slides.',
    icon: '▤',
  },
  {
    id: 'pdf' as const,
    label: 'PDF',
    ext: 'pdf',
    desc: 'Print-ready PDF — sharp at any size, safe to share.',
    icon: '⊞',
  },
  {
    id: 'json' as const,
    label: 'JSON',
    ext: 'json',
    desc: 'Raw deck data — import back into SlideSmith or integrate with your own tooling.',
    icon: '{}',
  },
];

const REPURPOSE_FORMATS = [
  { label: 'Social Post',   desc: 'Thread-ready key points for X, LinkedIn, or Threads.' },
  { label: 'Email Summary', desc: 'Concise executive summary formatted for email.' },
];

export default function ExportPage() {
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('ss-deck');
    if (!raw) { router.replace('/studio-new'); return; }
    try { setDeck(JSON.parse(raw)); } catch { router.replace('/studio-new'); }
  }, [router]);

  const handleExport = async (format: 'pptx' | 'pdf' | 'json') => {
    if (!deck) return;
    setExporting(format);
    setError(null);
    try {
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(deck, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${strip(deck.title)}.json`; a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
        return;
      }
      const endpoint = format === 'pptx' ? '/api/export/pptx' : '/api/export/pdf';
      const body = format === 'pptx' ? deck : convertForPdf(deck);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deck: body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || res.statusText);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${strip(deck.title)}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  if (!deck) return null;

  return (
    <StudioShell
      status={strip(deck.title)}
      actions={
        <Link
          href="/studio-new"
          style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '6px 14px',
            background: 'none',
            border: '1px solid var(--ss-border)',
            borderRadius: 'var(--ss-radius)',
            color: 'var(--ss-text-secondary)',
            fontSize: 11, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase' as const,
            cursor: 'pointer', fontFamily: SYNE,
            textDecoration: 'none',
          }}
        >
          ← Back to editor
        </Link>
      }
    >
      <div style={{ display: 'flex', height: 'calc(100dvh - 52px)', overflow: 'hidden' }}>

        {/* Left: deck summary */}
        <div style={{
          flex: '0 0 320px',
          background: 'var(--ss-surface-card)',
          borderRight: '1px solid var(--ss-border)',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          overflowY: 'auto',
        }}>
          <div>
            <h2 style={{
              fontSize: 22, fontWeight: 800,
              letterSpacing: '-0.02em', lineHeight: 1.25,
              color: 'var(--ss-text)', margin: '0 0 12px',
            }}>
              {strip(deck.title)}
            </h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontFamily: MONO, letterSpacing: '0.05em',
                color: 'var(--ss-cyan)',
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.2)',
                padding: '3px 8px', borderRadius: '9999px',
              }}>
                {deck.slides.length} slides
              </span>
              <span style={{
                fontSize: 10, fontFamily: MONO, letterSpacing: '0.05em',
                color: 'var(--ss-text-secondary)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--ss-border)',
                padding: '3px 8px', borderRadius: '9999px',
                textTransform: 'capitalize' as const,
              }}>
                {deck.theme.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {deck.slides.map((slide, i) => (
              <div key={i} style={{
                display: 'flex', gap: 12, alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: '1px solid var(--ss-border)',
              }}>
                <span style={{
                  fontSize: 10, fontFamily: MONO,
                  color: 'var(--ss-text-secondary)',
                  fontVariantNumeric: 'tabular-nums',
                  flexShrink: 0, minWidth: 20,
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--ss-text)', lineHeight: 1.4 }}>
                  {strip(slide.title)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: export + repurpose */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px 56px' }}>
          {error && (
            <div style={{
              marginBottom: 24, padding: '12px 16px',
              background: 'var(--ss-surface-card)',
              border: '1px solid rgba(255,100,100,0.2)',
              borderRadius: 'var(--ss-radius)',
              fontSize: 12, color: '#FF6B6B',
            }}>
              {error}
            </div>
          )}

          {/* Export */}
          <div style={{ marginBottom: 56 }}>
            <p style={{
              fontSize: 10, fontFamily: MONO, letterSpacing: '0.12em',
              textTransform: 'uppercase' as const,
              color: 'var(--ss-text-secondary)', marginBottom: 20,
            }}>
              Export
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {EXPORT_FORMATS.map(fmt => (
                <div key={fmt.id} style={{
                  background: 'var(--ss-surface-card)',
                  border: exporting === fmt.id
                    ? '1px solid var(--ss-cyan)'
                    : '1px solid var(--ss-border)',
                  borderRadius: 'var(--ss-radius)',
                  padding: '24px 20px',
                  display: 'flex', flexDirection: 'column', gap: 12,
                  transition: 'border-color 0.2s',
                }}>
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{fmt.icon}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ss-text)', marginBottom: 4 }}>
                      {fmt.label}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ss-text-secondary)', lineHeight: 1.5 }}>
                      {fmt.desc}
                    </div>
                  </div>
                  <button
                    onClick={() => handleExport(fmt.id)}
                    disabled={!!exporting}
                    style={{
                      marginTop: 'auto', padding: '10px 16px',
                      background: exporting === fmt.id
                        ? 'rgba(0,212,255,0.15)'
                        : 'var(--ss-gradient)',
                      border: 'none',
                      borderRadius: 'var(--ss-radius)',
                      color: '#fff', fontSize: 11, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      cursor: exporting ? 'not-allowed' : 'pointer',
                      fontFamily: SYNE,
                      opacity: exporting && exporting !== fmt.id ? 0.4 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {exporting === fmt.id ? 'Exporting…' : `Download .${fmt.ext}`}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Repurpose */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <p style={{
                fontSize: 10, fontFamily: MONO, letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                color: 'var(--ss-text-secondary)', margin: 0,
              }}>
                Repurpose
              </p>
              <span style={{
                fontSize: 9, fontFamily: MONO, letterSpacing: '0.1em',
                textTransform: 'uppercase' as const,
                color: 'var(--ss-text-secondary)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--ss-border)',
                padding: '2px 7px', borderRadius: '9999px',
              }}>
                Soon
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {REPURPOSE_FORMATS.map(fmt => (
                <div key={fmt.label} style={{
                  background: 'var(--ss-surface-card)',
                  border: '1px solid var(--ss-border)',
                  borderRadius: 'var(--ss-radius)',
                  padding: '24px 20px',
                  opacity: 0.45,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ss-text)', marginBottom: 6 }}>
                    {fmt.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ss-text-secondary)', lineHeight: 1.5 }}>
                    {fmt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}
