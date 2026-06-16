'use client';

import React from 'react';
import Link from 'next/link';

const FEATURES = [
  { num: '01', title: 'Multi-Agent Pipeline', desc: '13 specialized agents research, structure, and fact-check every slide in sequence.' },
  { num: '02', title: 'Live Recharts', desc: 'Bar, line, pie, and area charts auto-generated with realistic data, rendered inline.' },
  { num: '03', title: 'Topic Photography', desc: 'Relevant photos pulled for each slide — no placeholders, no stock-photo clichés.' },
  { num: '04', title: 'Auto Diagrams', desc: 'Flowcharts, timelines, comparison tables built directly from slide content.' },
  { num: '05', title: 'Six Themes', desc: 'Academic, Corporate, Deep Space, Ultra Violet, Navy & Gold, Minimal White.' },
  { num: '06', title: 'PPTX + PDF Export', desc: 'Export native PowerPoint or PDF — processed entirely on your machine, zero cloud.' },
];

export default function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0D',
      color: '#F0EEE8',
      fontFamily: 'var(--font-syne), Syne, sans-serif',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 48px', height: 56,
        borderBottom: '1px solid #1E1E1E',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          SlideSmith
        </span>
        <Link href="/studio-new" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 12, color: '#888', textDecoration: 'none',
          fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase',
        }}>
          Open Studio <span style={{ color: '#C8FF00', fontSize: 14 }}>→</span>
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ padding: '72px 48px 56px' }}>
        <h1 style={{
          fontSize: 'clamp(48px, 7.5vw, 104px)',
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          margin: '0 0 40px',
          maxWidth: 900,
        }}>
          Build decks<br />
          that actually<br />
          <span style={{ color: '#C8FF00' }}>say something.</span>
        </h1>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 56, flexWrap: 'wrap' }}>
          <p style={{
            fontSize: 15,
            color: '#666',
            lineHeight: 1.75,
            maxWidth: 400,
            margin: 0,
            borderLeft: '2px solid #C8FF00',
            paddingLeft: 20,
          }}>
            Turn any topic into a structured, chart-rich presentation.
            Multi-agent AI pipeline. Groq or Ollama. Runs locally.
          </p>
          <Link href="/studio-new" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#C8FF00',
              color: '#0D0D0D',
              padding: '14px 28px',
              fontSize: 12, fontWeight: 800,
              letterSpacing: '0.15em', textTransform: 'uppercase',
              cursor: 'pointer',
            }}>
              Start Creating →
            </div>
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #1E1E1E', margin: '0 48px' }} />

      {/* Feature grid */}
      <section style={{ padding: '0 48px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', maxWidth: 960 }}>
          {FEATURES.map((f, i) => (
            <div key={f.num} style={{
              padding: '32px 0',
              borderTop: '1px solid #1E1E1E',
              borderRight: i % 2 === 0 ? '1px solid #1E1E1E' : 'none',
              paddingRight: i % 2 === 0 ? 48 : 0,
              paddingLeft: i % 2 === 1 ? 48 : 0,
              display: 'flex', gap: 20,
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, color: '#444',
                letterSpacing: '0.1em', paddingTop: 3, flexShrink: 0,
              }}>
                {f.num}
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#F0EEE8' }}>
                  {f.title}
                </div>
                <div style={{ fontSize: 13, color: '#555', lineHeight: 1.65 }}>
                  {f.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section style={{
        margin: '0 48px 48px',
        borderTop: '1px solid #1E1E1E',
        padding: '48px 0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 24,
      }}>
        <div>
          <div style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 8 }}>
            Ready to build?
          </div>
          <div style={{ fontSize: 13, color: '#555' }}>
            No account. No cloud. Type a topic, get a deck.
          </div>
        </div>
        <Link href="/studio-new" style={{ textDecoration: 'none' }}>
          <div style={{
            border: '1px solid #333',
            color: '#F0EEE8',
            padding: '14px 28px',
            fontSize: 12, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase',
            cursor: 'pointer',
          }}>
            Open Studio →
          </div>
        </Link>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #1A1A1A',
        padding: '20px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, color: '#333', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          SlideSmith
        </span>
        <span style={{ fontSize: 11, color: '#333' }}>
          Built with Next.js · Runs locally
        </span>
      </footer>
    </div>
  );
}
