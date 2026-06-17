'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type TextDensity = 'low' | 'medium' | 'text_heavy';
type ContentFormat = 'bullets' | 'paragraph' | 'mixed';

interface DeckGeneratorProps {
  onGenerate: (data: any) => void;
  isLoading?: boolean;
}

const SYNE = 'var(--font-syne), Syne, sans-serif';
const MONO = 'var(--font-geist-mono), monospace';

const THEMES = [
  { value: 'academic',     label: 'Academic' },
  { value: 'corporate',   label: 'Corporate' },
  { value: 'deep_space',  label: 'Deep Space' },
  { value: 'ultra_violet',label: 'Ultra Violet' },
  { value: 'navy_gold',   label: 'Navy & Gold' },
  { value: 'minimal',     label: 'Minimal' },
];

const AUDIENCES = [
  { value: 'general',     label: 'General' },
  { value: 'executives',  label: 'Executives' },
  { value: 'technical',   label: 'Technical' },
  { value: 'students',    label: 'Students' },
  { value: 'researchers', label: 'Researchers' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'academic',     label: 'Academic' },
  { value: 'persuasive',   label: 'Persuasive' },
  { value: 'casual',       label: 'Casual' },
];

const DENSITY_OPTIONS: { value: TextDensity; label: string; sub: string }[] = [
  { value: 'low',        label: 'Visual',   sub: '1-2 points' },
  { value: 'medium',     label: 'Balanced', sub: '3-4 points' },
  { value: 'text_heavy', label: 'Dense',    sub: '5-7 points' },
];

const FORMAT_OPTIONS: { value: ContentFormat; label: string; sub: string }[] = [
  { value: 'bullets',   label: 'Bullets',    sub: 'list format' },
  { value: 'mixed',     label: 'Mixed',      sub: 'para + bullets' },
  { value: 'paragraph', label: 'Paragraphs', sub: 'prose only' },
];

const EXAMPLE_PROMPTS = [
  'The future of renewable energy in urban cities',
  'Why electric vehicles will dominate by 2035',
  'How AI is changing software development',
  'A startup pitch for a fintech app',
];

const EASE = [0.32, 0.72, 0, 1] as const;

export default function DeckGenerator({ onGenerate, isLoading = false }: DeckGeneratorProps) {
  const [form, setForm] = useState({
    topic_or_prompt: '',
    tone: 'professional',
    audience: 'general',
    slide_count: 10,
    theme: 'academic',
    text_density: 'medium' as TextDensity,
    content_format: 'mixed' as ContentFormat,
  });
  const [focused, setFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const set = (field: string, value: any) => setForm(prev => ({ ...prev, [field]: value }));
  const canSubmit = !isLoading && form.topic_or_prompt.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onGenerate({ mode: 'quick_prompt', ...form });
  };

  const usePrompt = (p: string) => {
    set('topic_or_prompt', p);
    textareaRef.current?.focus();
  };

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
  };

  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      maxWidth: 1280,
      width: '100%',
      margin: '0 auto',
      padding: '72px 40px 40px',
      gap: 80,
      alignItems: 'start',
      boxSizing: 'border-box' as const,
    }}>

        {/* Left: Hero copy */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          style={{ paddingTop: 32, paddingBottom: 32 }}
        >
          <motion.div variants={itemVariants} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 28,
            padding: '5px 10px',
            border: '1px solid #1E1E1E',
            borderRadius: 4,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--ss-cyan)',
              boxShadow: '0 0 8px var(--ss-cyan)',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: 10, fontFamily: MONO, color: '#555', letterSpacing: '0.1em' }}>
              Powered by Groq + Llama
            </span>
          </motion.div>

          <motion.h1 variants={itemVariants} style={{
            fontSize: 'clamp(36px, 4.5vw, 58px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: '0 0 20px',
            color: 'var(--ss-text)',
          }}>
            Turn any idea into a presentation.
          </motion.h1>

          <motion.p variants={itemVariants} style={{
            fontSize: 17,
            lineHeight: 1.65,
            color: '#555',
            margin: '0 0 40px',
            maxWidth: '50ch',
          }}>
            Describe your topic and we handle the rest. Charts, images, and smart slide structure - all included.
          </motion.p>

          {/* Example prompts */}
          <motion.div variants={itemVariants}>
            <p style={{ fontSize: 11, color: '#303030', fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 12 }}>
              Try an example
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {EXAMPLE_PROMPTS.map((p, i) => (
                <motion.button
                  key={i}
                  whileHover={{ x: 4, color: 'var(--ss-text)' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  onClick={() => usePrompt(p)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#404040',
                    fontFamily: SYNE,
                    borderBottom: '1px solid var(--ss-border)',
                    transition: 'color 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span style={{ color: '#2A2A2A', fontSize: 11 }}>→</span>
                  {p}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Right: Form */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          style={{ paddingBottom: 32 }}
        >
          <form onSubmit={handleSubmit}>

            {/* Textarea */}
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <motion.div
                animate={{
                  boxShadow: focused
                    ? '0 0 0 1px rgba(0,212,255,0.4), 0 0 24px rgba(0,212,255,0.1)'
                    : '0 0 0 1px rgba(255,255,255,0.08)',
                }}
                transition={{ duration: 0.2 }}
                style={{ borderRadius: 8, overflow: 'hidden' }}
              >
                <textarea
                  ref={textareaRef}
                  placeholder="Describe your topic in detail. The more specific, the better. E.g. &quot;Climate impacts on coastal economies with sea level projections and policy options for government officials.&quot;"
                  value={form.topic_or_prompt}
                  onChange={e => set('topic_or_prompt', e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  required
                  style={{
                    width: '100%',
                    minHeight: 180,
                    background: 'var(--ss-surface-card)',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--ss-text)',
                    fontSize: 14,
                    lineHeight: 1.7,
                    padding: '18px 20px',
                    resize: 'vertical',
                    fontFamily: SYNE,
                    boxSizing: 'border-box',
                    display: 'block',
                  }}
                />
              </motion.div>
              <AnimatePresence>
                {form.topic_or_prompt.length > 0 && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 14,
                      fontSize: 10,
                      fontFamily: MONO,
                      color: '#3A3A3A',
                    }}
                  >
                    {form.topic_or_prompt.length} chars
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Compact options grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 8,
            }}>
              {/* Slide count */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--ss-surface-card)',
                border: '1px solid var(--ss-border)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: '#404040', letterSpacing: '0.05em' }}>Slides</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => set('slide_count', Math.max(4, form.slide_count - 1))}
                    style={{
                      width: 24, height: 24, background: 'var(--ss-surface-high)', border: '1px solid var(--ss-border)',
                      color: 'var(--ss-text-secondary)', cursor: 'pointer', fontSize: 14, borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: SYNE,
                    }}
                  >-</button>
                  <span style={{
                    fontSize: 18, fontWeight: 800, color: 'var(--ss-text)',
                    fontVariantNumeric: 'tabular-nums', minWidth: 28, textAlign: 'center',
                  }}>
                    {form.slide_count}
                  </span>
                  <button
                    type="button"
                    onClick={() => set('slide_count', Math.min(30, form.slide_count + 1))}
                    style={{
                      width: 24, height: 24, background: 'var(--ss-surface-high)', border: '1px solid var(--ss-border)',
                      color: 'var(--ss-text-secondary)', cursor: 'pointer', fontSize: 14, borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: SYNE,
                    }}
                  >+</button>
                </div>
              </div>

              {/* Theme */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--ss-surface-card)',
                border: '1px solid var(--ss-border)',
                borderRadius: 8,
                position: 'relative',
              }}>
                <label style={{ fontSize: 11, color: '#404040', display: 'block', marginBottom: 4, letterSpacing: '0.05em' }}>
                  Theme
                </label>
                <select
                  value={form.theme}
                  onChange={e => set('theme', e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--ss-text)', fontSize: 13, fontWeight: 600,
                    fontFamily: SYNE, cursor: 'pointer', width: '100%',
                    appearance: 'none', WebkitAppearance: 'none',
                  }}
                >
                  {THEMES.map(t => (
                    <option key={t.value} value={t.value} style={{ background: '#111' }}>{t.label}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#333', fontSize: 9, pointerEvents: 'none' }}>▾</span>
              </div>

              {/* Tone */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--ss-surface-card)',
                border: '1px solid var(--ss-border)',
                borderRadius: 8,
                position: 'relative',
              }}>
                <label style={{ fontSize: 11, color: '#404040', display: 'block', marginBottom: 4, letterSpacing: '0.05em' }}>
                  Tone
                </label>
                <select
                  value={form.tone}
                  onChange={e => set('tone', e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--ss-text)', fontSize: 13, fontWeight: 600,
                    fontFamily: SYNE, cursor: 'pointer', width: '100%',
                    appearance: 'none', WebkitAppearance: 'none',
                  }}
                >
                  {TONES.map(t => (
                    <option key={t.value} value={t.value} style={{ background: '#111' }}>{t.label}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#333', fontSize: 9, pointerEvents: 'none' }}>▾</span>
              </div>

              {/* Audience */}
              <div style={{
                padding: '12px 16px',
                background: 'var(--ss-surface-card)',
                border: '1px solid var(--ss-border)',
                borderRadius: 8,
                position: 'relative',
              }}>
                <label style={{ fontSize: 11, color: '#404040', display: 'block', marginBottom: 4, letterSpacing: '0.05em' }}>
                  Audience
                </label>
                <select
                  value={form.audience}
                  onChange={e => set('audience', e.target.value)}
                  style={{
                    background: 'none', border: 'none', outline: 'none',
                    color: 'var(--ss-text)', fontSize: 13, fontWeight: 600,
                    fontFamily: SYNE, cursor: 'pointer', width: '100%',
                    appearance: 'none', WebkitAppearance: 'none',
                  }}
                >
                  {AUDIENCES.map(a => (
                    <option key={a.value} value={a.value} style={{ background: '#111' }}>{a.label}</option>
                  ))}
                </select>
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#333', fontSize: 9, pointerEvents: 'none' }}>▾</span>
              </div>
            </div>

            {/* Content density + format */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: '#303030', fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 8 }}>
                Content density
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {DENSITY_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => set('text_density', opt.value)}
                    style={{
                      padding: '12px 10px',
                      background: form.text_density === opt.value
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,237,0.12))'
                        : 'var(--ss-surface-card)',
                      border: `1px solid ${form.text_density === opt.value ? 'var(--ss-cyan)' : 'var(--ss-border)'}`,
                      color: form.text_density === opt.value ? 'var(--ss-cyan)' : 'var(--ss-text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      fontFamily: SYNE,
                      borderRadius: 'var(--ss-radius)',
                      transition: 'all 0.15s cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{opt.sub}</div>
                  </motion.button>
                ))}
              </div>
              <p style={{ fontSize: 10, color: '#303030', fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 8 }}>
                Content style
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {FORMAT_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => set('content_format', opt.value)}
                    style={{
                      padding: '12px 10px',
                      background: form.content_format === opt.value
                        ? 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(124,58,237,0.12))'
                        : 'var(--ss-surface-card)',
                      border: `1px solid ${form.content_format === opt.value ? 'var(--ss-cyan)' : 'var(--ss-border)'}`,
                      color: form.content_format === opt.value ? 'var(--ss-cyan)' : 'var(--ss-text-secondary)',
                      cursor: 'pointer',
                      textAlign: 'left' as const,
                      fontFamily: SYNE,
                      borderRadius: 'var(--ss-radius)',
                      transition: 'all 0.15s cubic-bezier(0.32, 0.72, 0, 1)',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{opt.sub}</div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* CTA */}
            <motion.button
              type="submit"
              disabled={!canSubmit}
              whileHover={canSubmit ? { scale: 1.01 } : {}}
              whileTap={canSubmit ? { scale: 0.98 } : {}}
              transition={{ duration: 0.15 }}
              style={{
                width: '100%',
                padding: '18px 24px',
                background: canSubmit ? 'var(--ss-gradient)' : 'var(--ss-surface-card)',
                border: canSubmit ? 'none' : '1px solid var(--ss-border)',
                borderRadius: 'var(--ss-radius)',
                color: canSubmit ? '#fff' : 'var(--ss-text-secondary)',
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: '0.12em',
                textTransform: 'uppercase' as const,
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                fontFamily: SYNE,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.2s, color 0.2s',
                boxShadow: canSubmit ? '0 0 24px rgba(0,212,255,0.15)' : 'none',
              }}
            >
              {isLoading ? (
                <>
                  <motion.span
                    animate={{ opacity: [1, 0.4, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  >
                    Generating
                  </motion.span>
                  <span>...</span>
                </>
              ) : (
                <>
                  Generate presentation
                  <span style={{ fontSize: 16 }}>→</span>
                </>
              )}
            </motion.button>

            <p style={{
              textAlign: 'center',
              fontSize: 11,
              color: '#2A2A2A',
              marginTop: 14,
              fontFamily: MONO,
            }}>
              Takes 60-120 seconds. No data stored.
            </p>
          </form>
        </motion.div>
    </div>
  );
}
