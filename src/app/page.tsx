'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const FONT = 'var(--font-syne), Syne, sans-serif';
const BG = '#0D0D0D';
const TEXT = '#F0EEE8';
const LIME = '#C8FF00';
const MUTED = '#555';
const BORDER = '#1E1E1E';

const FEATURES = [
  { num: '01', title: 'Multi-Agent Pipeline', desc: '13 specialized agents research, structure, and fact-check every slide in sequence.' },
  { num: '02', title: 'Live Charts', desc: 'Bar, line, pie, and area charts auto-generated with realistic data, rendered inline.' },
  { num: '03', title: 'Topic Photography', desc: 'Relevant Unsplash photos pulled for each slide — contextual, not generic.' },
  { num: '04', title: 'Auto Diagrams', desc: 'Flowcharts, timelines, comparison tables built directly from slide content.' },
  { num: '05', title: 'Six Themes', desc: 'Academic, Corporate, Deep Space, Ultra Violet, Navy & Gold, Minimal White.' },
  { num: '06', title: 'PPTX + PDF Export', desc: 'Export native PowerPoint or PDF — processed on your machine, zero cloud.' },
];

const STEPS = [
  { n: '01', action: 'Type a topic', detail: 'Write anything — a subject, a research question, a pitch idea.' },
  { n: '02', action: 'Set parameters', detail: 'Choose slides, theme, tone, audience, and content density.' },
  { n: '03', action: 'Generate', detail: 'The multi-agent pipeline researches, structures, and writes every slide.' },
  { n: '04', action: 'Export', detail: 'Download as .pptx or .pdf — ready to present immediately.' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TEXT, fontFamily: FONT }}>

      {/* Sticky nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 56,
        background: scrolled ? 'rgba(13,13,13,0.95)' : BG,
        borderBottom: `1px solid ${scrolled ? '#2A2A2A' : BORDER}`,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          SlideSmith
        </span>
        <Link href="/studio-new" style={{ textDecoration: 'none' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: LIME, color: '#0D0D0D',
            padding: '8px 18px',
            fontSize: 11, fontWeight: 800,
            letterSpacing: '0.12em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            Open Studio →
          </span>
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ padding: '80px 48px 64px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: MUTED, marginBottom: 24,
        }}>
          AI Presentation Builder · Runs Locally
        </div>
        <h1 style={{
          fontSize: 'clamp(48px, 7.5vw, 106px)',
          fontWeight: 800, lineHeight: 1.0,
          letterSpacing: '-0.03em',
          margin: '0 0 44px', maxWidth: 900,
        }}>
          Build decks<br />
          that actually<br />
          <span style={{ color: LIME }}>say something.</span>
        </h1>

        <p style={{
          fontSize: 16, color: '#777', lineHeight: 1.8,
          maxWidth: 480, marginBottom: 40,
          borderLeft: `2px solid ${LIME}`, paddingLeft: 20,
        }}>
          Turn any topic into a structured, chart-rich, visually complete
          presentation in minutes. Multi-agent AI pipeline. Groq or Ollama.
          Zero cloud dependency.
        </p>

        {/* Two CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/studio-new" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: LIME, color: '#0D0D0D',
              padding: '16px 32px',
              fontSize: 13, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              Start Creating →
            </span>
          </Link>
          <a href="#how-it-works" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              border: `1px solid #333`, color: '#888',
              padding: '16px 32px',
              fontSize: 13, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              How it works ↓
            </span>
          </a>
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '0 48px' }} />

      {/* How it works */}
      <section id="how-it-works" style={{ padding: '64px 48px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: MUTED, marginBottom: 36,
        }}>
          How It Works
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1, background: BORDER, maxWidth: 960,
        }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: BG, padding: '28px 24px' }}>
              <div style={{
                fontSize: 28, fontWeight: 800, color: '#2A2A2A',
                letterSpacing: '-0.02em', marginBottom: 12,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {s.n}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
                {s.action}
              </div>
              <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.65 }}>
                {s.detail}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36 }}>
          <Link href="/studio-new" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              border: `1px solid ${LIME}`, color: LIME,
              padding: '13px 26px',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              Try it now →
            </span>
          </Link>
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '0 48px' }} />

      {/* Features */}
      <section style={{ padding: '0 48px 64px' }}>
        <div style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
          textTransform: 'uppercase', color: MUTED, padding: '32px 0 0',
          marginBottom: 0,
        }}>
          What you get
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 960 }}>
          {FEATURES.map((f, i) => (
            <div
              key={f.num}
              onMouseEnter={() => setHoveredFeature(i)}
              onMouseLeave={() => setHoveredFeature(null)}
              style={{
                padding: '28px 0',
                borderTop: `1px solid ${BORDER}`,
                borderRight: i % 2 === 0 ? `1px solid ${BORDER}` : 'none',
                paddingRight: i % 2 === 0 ? 48 : 0,
                paddingLeft: i % 2 === 1 ? 48 : 0,
                display: 'flex', gap: 20,
                cursor: 'default',
                transition: 'background 0.15s',
              }}
            >
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: hoveredFeature === i ? LIME : '#333',
                letterSpacing: '0.1em', paddingTop: 3, flexShrink: 0,
                transition: 'color 0.15s',
              }}>
                {f.num}
              </span>
              <div>
                <div style={{
                  fontSize: 14, fontWeight: 700, marginBottom: 8,
                  color: hoveredFeature === i ? TEXT : '#B0A898',
                  transition: 'color 0.15s',
                }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: hoveredFeature === i ? '#888' : MUTED, lineHeight: 1.65, transition: 'color 0.15s' }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div style={{ borderTop: `1px solid ${BORDER}`, margin: '0 48px' }} />

      {/* Bottom CTA */}
      <section style={{ padding: '64px 48px', maxWidth: 960 + 96 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 32 }}>
          <div>
            <div style={{ fontSize: 'clamp(26px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 10, lineHeight: 1.1 }}>
              Ready to build?
            </div>
            <div style={{ fontSize: 13, color: MUTED }}>
              No account. No cloud. Type a topic, get a deck.
            </div>
          </div>
          <Link href="/studio-new" style={{ textDecoration: 'none' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: LIME, color: '#0D0D0D',
              padding: '18px 36px',
              fontSize: 13, fontWeight: 800,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              Open Studio →
            </span>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid #1A1A1A`, padding: '20px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: '#2A2A2A', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          SlideSmith
        </span>
        <span style={{ fontSize: 11, color: '#2A2A2A' }}>
          Built with Next.js · Runs locally · Zero cloud
        </span>
      </footer>
    </div>
  );
}
