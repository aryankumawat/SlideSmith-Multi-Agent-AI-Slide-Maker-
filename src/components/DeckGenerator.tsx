'use client';

import { useState } from 'react';

type TextDensity = 'low' | 'medium' | 'text_heavy';

interface DeckGeneratorProps {
  onGenerate: (data: any) => void;
  isLoading?: boolean;
}

const DENSITY_OPTIONS: { value: TextDensity; label: string; sub: string }[] = [
  { value: 'low',        label: 'Visual',   sub: '1–2 bullets' },
  { value: 'medium',     label: 'Balanced', sub: '3–4 bullets' },
  { value: 'text_heavy', label: 'Dense',    sub: '5–7 bullets' },
];

const SELECT_STYLE: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#F0EEE8',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'var(--font-syne), Syne, sans-serif',
  cursor: 'pointer',
  outline: 'none',
  width: '100%',
  appearance: 'none',
  WebkitAppearance: 'none',
};

export default function DeckGenerator({ onGenerate, isLoading = false }: DeckGeneratorProps) {
  const [form, setForm] = useState({
    topic_or_prompt: '',
    tone: 'professional',
    audience: 'general',
    slide_count: 10,
    theme: 'academic',
    text_density: 'medium' as TextDensity,
  });

  const set = (field: string, value: any) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({ mode: 'quick_prompt', ...form });
  };

  const canSubmit = !isLoading && form.topic_or_prompt.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0D0D',
      color: '#F0EEE8',
      fontFamily: 'var(--font-syne), Syne, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        borderBottom: '1px solid #1E1E1E',
        padding: '0 48px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          SlideSmith
        </span>
        <span style={{ color: '#2A2A2A', fontSize: 16, lineHeight: 1 }}>/</span>
        <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          New Presentation
        </span>
      </div>

      {/* Main */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
      }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 640 }}>

          {/* Headline */}
          <div style={{ marginBottom: 40 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.25em',
              textTransform: 'uppercase', color: '#444', marginBottom: 14,
            }}>
              Create
            </div>
            <h1 style={{
              fontSize: 'clamp(26px, 4vw, 38px)',
              fontWeight: 800, lineHeight: 1.1,
              letterSpacing: '-0.02em', margin: 0,
            }}>
              What's this presentation about?
            </h1>
          </div>

          {/* Prompt textarea */}
          <div style={{ marginBottom: 28 }}>
            <textarea
              placeholder="Describe your topic in detail. The more specific, the better the output. E.g. 'Climate change impacts on coastal economies — include sea level data, economic projections, and policy options for a government audience.'"
              value={form.topic_or_prompt}
              onChange={e => set('topic_or_prompt', e.target.value)}
              required
              style={{
                width: '100%',
                minHeight: 130,
                background: '#111111',
                border: '1px solid #222',
                borderRadius: 0,
                color: '#F0EEE8',
                fontSize: 14,
                padding: '16px 18px',
                resize: 'vertical',
                fontFamily: 'var(--font-syne), Syne, sans-serif',
                outline: 'none',
                lineHeight: 1.65,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#C8FF00'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#222'; }}
            />
          </div>

          {/* Params row 1: slides + theme */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div style={{ padding: '14px 18px', background: '#111', border: '1px solid #222' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', marginBottom: 12 }}>
                01 / Slides
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => set('slide_count', Math.max(4, form.slide_count - 1))}
                  style={{
                    width: 28, height: 28, background: 'none',
                    border: '1px solid #2A2A2A', color: '#888',
                    cursor: 'pointer', fontSize: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit',
                  }}
                >−</button>
                <span style={{
                  fontSize: 24, fontWeight: 800, minWidth: 40,
                  textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                }}>
                  {form.slide_count}
                </span>
                <button
                  type="button"
                  onClick={() => set('slide_count', Math.min(30, form.slide_count + 1))}
                  style={{
                    width: 28, height: 28, background: 'none',
                    border: '1px solid #2A2A2A', color: '#888',
                    cursor: 'pointer', fontSize: 16, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'inherit',
                  }}
                >+</button>
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#111', border: '1px solid #222' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', marginBottom: 12 }}>
                02 / Theme
              </div>
              <div style={{ position: 'relative' }}>
                <select value={form.theme} onChange={e => set('theme', e.target.value)} style={SELECT_STYLE}>
                  <option value="academic"    style={{ background: '#111' }}>Academic (Light)</option>
                  <option value="corporate"   style={{ background: '#111' }}>Corporate Blue</option>
                  <option value="deep_space"  style={{ background: '#111' }}>Deep Space</option>
                  <option value="ultra_violet" style={{ background: '#111' }}>Ultra Violet</option>
                  <option value="navy_gold"   style={{ background: '#111' }}>Navy & Gold</option>
                  <option value="minimal"     style={{ background: '#111' }}>Minimal White</option>
                </select>
                <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: 10, pointerEvents: 'none' }}>▾</span>
              </div>
            </div>
          </div>

          {/* Params row 2: tone + audience */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: '14px 18px', background: '#111', border: '1px solid #222' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', marginBottom: 12 }}>
                03 / Tone
              </div>
              <div style={{ position: 'relative' }}>
                <select value={form.tone} onChange={e => set('tone', e.target.value)} style={SELECT_STYLE}>
                  <option value="professional" style={{ background: '#111' }}>Professional</option>
                  <option value="academic"     style={{ background: '#111' }}>Academic</option>
                  <option value="persuasive"   style={{ background: '#111' }}>Persuasive</option>
                  <option value="casual"       style={{ background: '#111' }}>Casual</option>
                </select>
                <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: 10, pointerEvents: 'none' }}>▾</span>
              </div>
            </div>

            <div style={{ padding: '14px 18px', background: '#111', border: '1px solid #222' }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#444', marginBottom: 12 }}>
                04 / Audience
              </div>
              <div style={{ position: 'relative' }}>
                <select value={form.audience} onChange={e => set('audience', e.target.value)} style={SELECT_STYLE}>
                  <option value="general"     style={{ background: '#111' }}>General</option>
                  <option value="executives"  style={{ background: '#111' }}>Executives</option>
                  <option value="technical"   style={{ background: '#111' }}>Technical</option>
                  <option value="students"    style={{ background: '#111' }}>Students</option>
                  <option value="researchers" style={{ background: '#111' }}>Researchers</option>
                </select>
                <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', color: '#444', fontSize: 10, pointerEvents: 'none' }}>▾</span>
              </div>
            </div>
          </div>

          {/* Content density */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#444', marginBottom: 12,
            }}>
              05 / Content Density
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {DENSITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set('text_density', opt.value)}
                  style={{
                    padding: '14px 12px',
                    background: form.text_density === opt.value ? '#C8FF00' : '#111',
                    border: form.text_density === opt.value ? '1px solid #C8FF00' : '1px solid #222',
                    color: form.text_density === opt.value ? '#0D0D0D' : '#888',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-syne), Syne, sans-serif',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{opt.label}</div>
                  <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3 }}>{opt.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              width: '100%',
              background: canSubmit ? '#C8FF00' : '#161616',
              color: canSubmit ? '#0D0D0D' : '#333',
              border: 'none',
              padding: '18px 24px',
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--font-syne), Syne, sans-serif',
              transition: 'all 0.12s',
            }}
          >
            {isLoading ? 'Generating…' : 'Generate Presentation →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#333', marginTop: 14 }}>
            Runs on Groq (cloud) or Ollama (local) · No data stored
          </p>
        </form>
      </div>
    </div>
  );
}
