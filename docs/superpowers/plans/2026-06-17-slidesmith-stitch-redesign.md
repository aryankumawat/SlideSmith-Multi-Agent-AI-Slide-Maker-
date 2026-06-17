# SlideSmith × Stitch Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate the Stitch "Lumina Editorial" design system into all SlideSmith pages, replacing the lime `#C8FF00` accent with a cyan-violet gradient, adding a CSS token layer, a shared `StudioShell` nav component, and a new dedicated Export & Repurpose page.

**Architecture:** Add `--ss-*` CSS custom properties to `globals.css` as the single token source of truth. A new `StudioShell` component provides the 52px nav chrome shared by all studio pages. All inline hard-coded colors in existing pages are replaced with `var(--ss-*)` references. A new `/export` route reads deck data from `sessionStorage` and provides a full-page export UX.

**Tech Stack:** Next.js 15, React 18, TypeScript, Framer Motion, CSS custom properties (no new dependencies)

**Spec:** `docs/superpowers/specs/2026-06-17-slidesmith-stitch-redesign-design.md`

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Modify | `src/app/globals.css` | Add `--ss-*` token block + `@keyframes ss-shimmer` |
| **Create** | `src/components/StudioShell.tsx` | Shared 52px nav wrapper for all studio pages |
| Modify | `src/app/page.tsx` | Landing page — token-driven colors, gradient CTAs |
| Modify | `src/components/DeckGenerator.tsx` | Remove embedded nav, replace `LIME` with tokens |
| Modify | `src/app/studio-new/page.tsx` | Wrap in StudioShell, redesign loading + editor, add sessionStorage write, add Export → button |
| **Create** | `src/app/export/page.tsx` | Export & Repurpose page |

---

## Task 1: Add Lumina token layer to globals.css

**Files:**
- Modify: `src/app/globals.css` (after line 2)

- [ ] **Step 1: Start the dev server**

  ```bash
  cd /Users/aryankumawat/SlideSmith/SlideSmith && npm run dev
  ```
  Open http://localhost:3000 and note the current lime accent in the hero heading.

- [ ] **Step 2: Add the token block**

  Insert immediately after `@import "tw-animate-css";` (line 2) in `src/app/globals.css`:

  ```css
  /* === Lumina Editorial Design Tokens === */
  :root {
    --ss-bg-deep: #0A0A0B;
    --ss-surface: #121315;
    --ss-surface-card: #17181C;
    --ss-surface-high: #292a2c;
    --ss-border: rgba(255, 255, 255, 0.08);
    --ss-text: #FFFFFF;
    --ss-text-secondary: #A1A1AA;
    --ss-cyan: #00D4FF;
    --ss-violet: #7C3AED;
    --ss-gradient: linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%);
    --ss-radius: 0.75rem;
    --ss-radius-lg: 1.25rem;
  }

  @keyframes ss-shimmer {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
  ```

- [ ] **Step 3: Verify tokens are live**

  In browser DevTools console on http://localhost:3000:
  ```js
  getComputedStyle(document.documentElement).getPropertyValue('--ss-cyan')
  ```
  Expected: `" #00D4FF"` (with leading space — that's normal for CSS custom properties).

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/globals.css
  git commit -m "feat: add Lumina Editorial CSS token layer"
  ```

---

## Task 2: Create StudioShell component

**Files:**
- Create: `src/components/StudioShell.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
  'use client';

  import React from 'react';

  const SYNE = 'var(--font-syne), Syne, sans-serif';
  const MONO = 'var(--font-geist-mono), monospace';

  interface StudioShellProps {
    status?: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }

  export default function StudioShell({ status, actions, children }: StudioShellProps) {
    return (
      <div style={{
        minHeight: '100dvh',
        background: 'var(--ss-bg-deep)',
        color: 'var(--ss-text)',
        fontFamily: SYNE,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <nav style={{
          height: 52,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          background: 'var(--ss-surface)',
          borderBottom: '1px solid var(--ss-border)',
        }}>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase' as const,
            color: 'var(--ss-text)',
          }}>
            SlideSmith
          </span>
          {status && (
            <span style={{
              fontSize: 11,
              color: 'var(--ss-text-secondary)',
              fontFamily: MONO,
              letterSpacing: '0.08em',
            }}>
              {status}
            </span>
          )}
          {actions ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {actions}
            </div>
          ) : <div />}
        </nav>
        <div style={{ flex: 1, minHeight: 0 }}>
          {children}
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 2: Verify no TypeScript errors**

  ```bash
  cd /Users/aryankumawat/SlideSmith/SlideSmith && npx tsc --noEmit 2>&1 | head -20
  ```
  Expected: no output (zero errors).

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/StudioShell.tsx
  git commit -m "feat: add StudioShell nav wrapper component"
  ```

---

## Task 3: Redesign landing page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace constants block (lines 6–11)**

  Replace:
  ```tsx
  const FONT = 'var(--font-syne), Syne, sans-serif';
  const BG = '#0D0D0D';
  const TEXT = '#F0EEE8';
  const LIME = '#C8FF00';
  const MUTED = '#555';
  const BORDER = '#1E1E1E';
  ```
  With:
  ```tsx
  const FONT = 'var(--font-syne), Syne, sans-serif';
  const BG = 'var(--ss-bg-deep)';
  const TEXT = 'var(--ss-text)';
  const MUTED = 'var(--ss-text-secondary)';
  const BORDER = 'var(--ss-border)';
  const CYAN = 'var(--ss-cyan)';
  const GRADIENT = 'var(--ss-gradient)';
  const RADIUS = 'var(--ss-radius)';
  ```

- [ ] **Step 2: Update nav scroll behaviour**

  In the `<nav>` style object, replace `background` and `borderBottom` and add `backdropFilter`:
  ```tsx
  background: scrolled ? 'rgba(18,19,21,0.92)' : BG,
  borderBottom: `1px solid ${scrolled ? 'rgba(255,255,255,0.12)' : BORDER}`,
  backdropFilter: scrolled ? 'blur(12px)' : 'none',
  ```

  Replace the nav "Open Studio →" button span styles:
  ```tsx
  style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: GRADIENT, color: '#fff',
    padding: '8px 18px',
    fontSize: 11, fontWeight: 800,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    cursor: 'pointer', borderRadius: RADIUS,
  }}
  ```

- [ ] **Step 3: Update hero section**

  Replace `<span style={{ color: LIME }}>` with `<span style={{ color: CYAN }}>`.

  Update paragraph accent border:
  ```tsx
  borderLeft: `2px solid ${CYAN}`, paddingLeft: 20,
  ```

  Replace "Start Creating →" button:
  ```tsx
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: GRADIENT, color: '#fff',
    padding: '16px 32px',
    fontSize: 13, fontWeight: 800,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    cursor: 'pointer', borderRadius: RADIUS,
  }}>
    Start Creating →
  </span>
  ```

  Replace "How it works ↓" secondary CTA:
  ```tsx
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    border: `1px solid ${BORDER}`, color: MUTED,
    padding: '16px 32px',
    fontSize: 13, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    cursor: 'pointer', borderRadius: RADIUS,
  }}>
    How it works ↓
  </span>
  ```

- [ ] **Step 4: Update How It Works grid**

  Replace the outer grid `<div>`:
  ```tsx
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8, maxWidth: 960,
  }}>
  ```

  Replace each step cell style (remove `background: BG` on the cell, which was used as the gap filler trick):
  ```tsx
  <div key={s.n} style={{
    background: 'var(--ss-surface-card)',
    padding: '28px 24px',
    borderRadius: RADIUS,
  }}>
  ```

  Replace "Try it now →" button:
  ```tsx
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 8,
    border: `1px solid ${BORDER}`, color: CYAN,
    padding: '13px 26px',
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    cursor: 'pointer', borderRadius: RADIUS,
  }}>
    Try it now →
  </span>
  ```

- [ ] **Step 5: Update features grid hover color**

  Replace both `LIME` references in the features map:
  ```tsx
  color: hoveredFeature === i ? CYAN : '#333',   // feature number
  ```

- [ ] **Step 6: Update bottom CTA**

  Replace "Open Studio →" bottom button:
  ```tsx
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: GRADIENT, color: '#fff',
    padding: '18px 36px',
    fontSize: 13, fontWeight: 800,
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
    cursor: 'pointer', borderRadius: RADIUS,
  }}>
    Open Studio →
  </span>
  ```

- [ ] **Step 7: Verify no remaining hard-coded hex colors**

  ```bash
  grep -n 'C8FF00\|#0D0D0D\|#F0EEE8\|#1E1E1E' /Users/aryankumawat/SlideSmith/SlideSmith/src/app/page.tsx
  ```
  Expected: no output.

- [ ] **Step 8: Visual check in browser**

  Navigate to http://localhost:3000.
  - Hero accent text → cyan, not lime
  - "Start Creating →" button → cyan-to-violet gradient, rounded corners
  - How It Works grid cells → dark card backgrounds with rounded corners
  - Feature numbers hover → cyan glow

- [ ] **Step 9: Commit**

  ```bash
  git add src/app/page.tsx
  git commit -m "feat: redesign landing page with Lumina tokens"
  ```

---

## Task 4: Redesign DeckGenerator (remove nav, replace LIME)

**Files:**
- Modify: `src/components/DeckGenerator.tsx`

- [ ] **Step 1: Replace constants block (lines 14–16)**

  Replace:
  ```tsx
  const SYNE = 'var(--font-syne), Syne, sans-serif';
  const MONO = 'var(--font-geist-mono), monospace';
  const LIME = '#C8FF00';
  ```
  With:
  ```tsx
  const SYNE = 'var(--font-syne), Syne, sans-serif';
  const MONO = 'var(--font-geist-mono), monospace';
  ```

- [ ] **Step 2: Strip the outer container and nav**

  The component's `return` currently opens with:
  ```tsx
  return (
    <div style={{
      minHeight: '100dvh',
      background: '#0A0A0A',
      color: '#F0EEE8',
      fontFamily: SYNE,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Nav */}
      <motion.nav ...>...</motion.nav>

      {/* Main */}
      <div style={{ flex: 1, display: 'grid', ... }}>
  ```

  Remove the outer `<div>` wrapper and the entire `<motion.nav>` block. The component should return only the main grid div directly:

  ```tsx
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
      ...
      {/* Right: Form */}
      ...
    </div>
  );
  ```

- [ ] **Step 3: Replace all LIME references in the form**

  Badge dot in the "Powered by Groq + Llama" pill:
  ```tsx
  background: 'var(--ss-cyan)',
  boxShadow: '0 0 8px var(--ss-cyan)',
  ```

  Textarea focus glow (in the `motion.div` `animate` prop):
  ```tsx
  boxShadow: focused
    ? '0 0 0 1px rgba(0,212,255,0.4), 0 0 24px rgba(0,212,255,0.1)'
    : '0 0 0 1px rgba(255,255,255,0.08)',
  ```

  Density option buttons (`DENSITY_OPTIONS.map`):
  ```tsx
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
  ```

  Format option buttons (`FORMAT_OPTIONS.map`) — same pattern replacing `content_format`:
  ```tsx
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
  ```

  Submit button:
  ```tsx
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
  ```

  Slide count stepper card and select cards — replace `#0F0F0F` backgrounds and `#1C1C1C` borders:
  ```tsx
  background: 'var(--ss-surface-card)',
  border: '1px solid var(--ss-border)',
  ```

  Stepper `+`/`-` buttons:
  ```tsx
  background: 'var(--ss-surface-high)', border: '1px solid var(--ss-border)',
  color: 'var(--ss-text-secondary)',
  ```

  Example prompt button borders:
  ```tsx
  borderBottom: '1px solid var(--ss-border)',
  ```

- [ ] **Step 4: Verify no remaining LIME or hard-coded hex colors**

  ```bash
  grep -n 'C8FF00\|#0F0F0F\|#0A0A0A\|#161616\|#1C1C1C\|#141414\|#F0EEE8' \
    /Users/aryankumawat/SlideSmith/SlideSmith/src/components/DeckGenerator.tsx
  ```
  Expected: no output.

- [ ] **Step 5: TypeScript check**

  ```bash
  cd /Users/aryankumawat/SlideSmith/SlideSmith && npx tsc --noEmit 2>&1 | head -20
  ```
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/components/DeckGenerator.tsx
  git commit -m "feat: redesign DeckGenerator with Lumina tokens, remove embedded nav"
  ```

---

## Task 5: Wrap studio-new in StudioShell + redesign loading screen

**Files:**
- Modify: `src/app/studio-new/page.tsx`

- [ ] **Step 1: Add imports**

  Add to the top of the file (after existing imports):
  ```tsx
  import StudioShell from '@/components/StudioShell';
  import Link from 'next/link';
  ```
  (`Link` may already be imported — check first, only add if missing.)

- [ ] **Step 2: Write deck to sessionStorage on generation complete**

  In the SSE reader loop, find the `complete` event handler (currently ~line 85):
  ```tsx
  } else if (event.type === 'complete') {
    setGeneratedDeck(event.deck);
    setIsLoading(false);
    return;
  }
  ```
  Replace with:
  ```tsx
  } else if (event.type === 'complete') {
    setGeneratedDeck(event.deck);
    sessionStorage.setItem('ss-deck', JSON.stringify(event.deck));
    setIsLoading(false);
    return;
  }
  ```

- [ ] **Step 3: Replace the loading screen return block**

  The block starts with `if (isLoading) {` and returns a full-page div. Replace the entire block:

  ```tsx
  if (isLoading) {
    const { progress, deckTitle, slideTopics, completedSlides, totalSlides, message } = loadingState;
    const hasOutline = slideTopics.length > 0;

    return (
      <StudioShell status={message}>
        <div style={{ display: 'flex', overflow: 'hidden', height: 'calc(100dvh - 52px)' }}>

          {/* Left panel */}
          <div style={{
            flex: '0 0 420px',
            padding: '64px 48px',
            borderRight: '1px solid var(--ss-border)',
            background: 'var(--ss-surface-card)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}>
            <div>
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
                    color: progress > 0 ? 'var(--ss-cyan)' : 'var(--ss-surface-high)',
                    fontVariantNumeric: 'tabular-nums',
                    transition: 'color 0.4s',
                  }}
                >
                  {progress}<span style={{ fontSize: '0.5em', fontWeight: 400, color: 'var(--ss-surface-high)' }}>%</span>
                </motion.div>

                {/* Gradient progress bar with shimmer */}
                <div style={{
                  marginTop: 20, width: '100%', height: 3,
                  background: 'var(--ss-surface-high)',
                  borderRadius: 2, overflow: 'hidden', position: 'relative',
                }}>
                  <motion.div
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
                    style={{
                      position: 'absolute', left: 0, top: 0,
                      height: '100%',
                      background: 'var(--ss-gradient)',
                      borderRadius: 2,
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)',
                      animation: 'ss-shimmer 1.8s ease-in-out infinite',
                    }} />
                  </motion.div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {deckTitle ? (
                  <motion.h2
                    key="title"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    style={{
                      fontSize: 'clamp(18px, 2.5vw, 24px)',
                      fontWeight: 800, lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                      color: 'var(--ss-text)', margin: 0,
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
                    style={{ fontSize: 15, color: 'var(--ss-surface-high)', margin: 0, fontStyle: 'italic' }}
                  >
                    Planning structure...
                  </motion.p>
                )}
              </AnimatePresence>

              {hasOutline && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 12, color: 'var(--ss-text-secondary)', marginTop: 8, fontFamily: MONO }}
                >
                  {completedSlides} of {totalSlides} slides written
                </motion.p>
              )}
            </div>

            {/* Phase steps */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Plan structure', done: hasOutline || progress >= 10 },
                { label: 'Write slides',   done: completedSlides === totalSlides && totalSlides > 0 },
                { label: 'Generate visuals', done: progress >= 95 },
              ].map((phase, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <motion.div
                    animate={{
                      background: phase.done ? 'var(--ss-cyan)' : 'var(--ss-surface-high)',
                      boxShadow: phase.done ? '0 0 8px rgba(0,212,255,0.5)' : 'none',
                    }}
                    transition={{ duration: 0.4 }}
                    style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: 13,
                    color: phase.done ? 'var(--ss-text-secondary)' : 'var(--ss-surface-high)',
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
                <p style={{ fontSize: 11, color: 'var(--ss-surface-high)', fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 8 }}>
                  Generating outline...
                </p>
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.2, 0.5, 0.2] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                    style={{
                      height: 16, background: 'var(--ss-surface-card)',
                      borderRadius: 3, width: `${45 + (i % 4) * 12}%`,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div>
                <p style={{
                  fontSize: 11, color: 'var(--ss-text-secondary)',
                  fontFamily: MONO, letterSpacing: '0.08em', marginBottom: 24,
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
                          display: 'flex', alignItems: 'center', gap: 16,
                          padding: '11px 0',
                          borderBottom: '1px solid var(--ss-border)',
                        }}
                      >
                        <div style={{ width: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                          {isDone ? (
                            <span style={{ fontSize: 10, color: 'var(--ss-cyan)', fontWeight: 700 }}>✓</span>
                          ) : isCurrent ? (
                            <motion.span
                              animate={{ opacity: [1, 0.4, 1] }}
                              transition={{ duration: 0.9, repeat: Infinity }}
                              style={{ fontSize: 10, color: 'var(--ss-text)' }}
                            >→</motion.span>
                          ) : (
                            <span style={{
                              fontSize: 10, color: 'var(--ss-surface-high)',
                              fontFamily: MONO, fontVariantNumeric: 'tabular-nums',
                            }}>
                              {String(slideNum).padStart(2, '0')}
                            </span>
                          )}
                        </div>
                        <span style={{
                          fontSize: 13,
                          fontWeight: isCurrent ? 600 : 400,
                          color: isDone ? 'var(--ss-surface-high)' : isCurrent ? 'var(--ss-text)' : 'var(--ss-surface-high)',
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          transition: 'color 0.3s',
                        }}>
                          {title}
                        </span>
                        {isCurrent && (
                          <motion.span
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.1, repeat: Infinity }}
                            style={{
                              fontSize: 9, color: 'var(--ss-cyan)',
                              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
                              fontFamily: MONO, flexShrink: 0,
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
      </StudioShell>
    );
  }
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add src/app/studio-new/page.tsx
  git commit -m "feat: redesign loading screen with Lumina tokens and StudioShell"
  ```

---

## Task 6: Redesign studio form view and presentation editor

**Files:**
- Modify: `src/app/studio-new/page.tsx`

- [ ] **Step 1: Remove exportLoading state, handleExport, and convertForPdf**

  Delete these from `studio-new/page.tsx` (they move to the export page):
  - `const [exportLoading, setExportLoading] = useState<string | null>(null);`
  - The `handleExport` async function
  - The `convertForPdf` helper function

- [ ] **Step 2: Replace the generator form return block**

  The `if (!generatedDeck)` block currently returns a plain `<div>` wrapping error toast + `DeckGenerator`. Replace:

  ```tsx
  if (!generatedDeck) {
    return (
      <>
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
                background: 'var(--ss-surface-card)',
                border: '1px solid rgba(255,100,100,0.2)',
                padding: '14px 18px', fontFamily: SYNE,
                borderRadius: 'var(--ss-radius)',
              }}
            >
              <p style={{ fontWeight: 700, fontSize: 11, color: '#FF6B6B', marginBottom: 3, letterSpacing: '0.06em' }}>
                Generation failed
              </p>
              <p style={{ fontSize: 12, color: '#AA4444', margin: 0, lineHeight: 1.5 }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <StudioShell status="AI Presentation Builder">
          <DeckGenerator onGenerate={handleGenerate} isLoading={isLoading} />
        </StudioShell>
      </>
    );
  }
  ```

- [ ] **Step 3: Replace the presentation editor (deck view) return block**

  Replace the final `return (...)` in the file:

  ```tsx
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden' }}
    >
      <StudioShell
        status={`${strip(generatedDeck.title)} · ${generatedDeck.slides.length} slides`}
        actions={
          <>
            {error && (
              <span style={{
                fontSize: 11, color: '#FF6B6B',
                maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {error}
              </span>
            )}
            <button
              onClick={() => { setGeneratedDeck(null); setError(null); }}
              style={{
                padding: '6px 14px',
                background: 'none',
                border: '1px solid var(--ss-border)',
                borderRadius: 'var(--ss-radius)',
                color: 'var(--ss-text-secondary)',
                fontSize: 11, fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                cursor: 'pointer', fontFamily: SYNE,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--ss-text)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ss-border)'; e.currentTarget.style.color = 'var(--ss-text-secondary)'; }}
            >
              New deck
            </button>
            <Link href="/export" style={{ textDecoration: 'none' }}>
              <button
                style={{
                  padding: '7px 16px',
                  background: 'var(--ss-gradient)',
                  border: 'none',
                  borderRadius: 'var(--ss-radius)',
                  color: '#fff',
                  fontSize: 11, fontWeight: 800,
                  letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                  cursor: 'pointer', fontFamily: SYNE,
                  transition: 'opacity 0.15s, transform 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                Export →
              </button>
            </Link>
          </>
        }
      >
        <div style={{ height: 'calc(100dvh - 52px)' }}>
          <SlideCanvas deck={generatedDeck} />
        </div>
      </StudioShell>
    </motion.div>
  );
  ```

- [ ] **Step 4: TypeScript check**

  ```bash
  cd /Users/aryankumawat/SlideSmith/SlideSmith && npx tsc --noEmit 2>&1 | head -30
  ```
  Expected: no errors.

- [ ] **Step 5: Visual check**

  Navigate to http://localhost:3000/studio-new.
  - Form view: StudioShell nav shows "AI Presentation Builder" center-right in monospace
  - After generation: top bar shows deck title + slide count, "New deck" ghost button, "Export →" gradient button
  - No PDF/PPTX buttons visible in the top bar

- [ ] **Step 6: Commit**

  ```bash
  git add src/app/studio-new/page.tsx
  git commit -m "feat: redesign studio form and presentation editor, add Export button"
  ```

---

## Task 7: Create Export & Repurpose page

**Files:**
- Create: `src/app/export/page.tsx`

- [ ] **Step 1: Create the file**

  ```tsx
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
          URL.revokeObjectURL(url);
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
          <Link href="/studio-new" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '6px 14px',
              background: 'none',
              border: '1px solid var(--ss-border)',
              borderRadius: 'var(--ss-radius)',
              color: 'var(--ss-text-secondary)',
              fontSize: 11, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase' as const,
              cursor: 'pointer', fontFamily: SYNE,
            }}>
              ← Back to editor
            </button>
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
  ```

- [ ] **Step 2: TypeScript check**

  ```bash
  cd /Users/aryankumawat/SlideSmith/SlideSmith && npx tsc --noEmit 2>&1 | head -30
  ```
  Expected: no errors.

- [ ] **Step 3: Verify page loads**

  Generate a deck at http://localhost:3000/studio-new. After generation, click "Export →".
  - Navigates to http://localhost:3000/export
  - Left panel: deck title, slide count (cyan pill), theme (grey pill), numbered slide list
  - Right panel: 3 export cards (PPTX, PDF, JSON) + 2 muted repurpose cards
  - "← Back to editor" in nav returns to /studio-new

- [ ] **Step 4: Test redirect on empty sessionStorage**

  Open a new incognito tab and navigate directly to http://localhost:3000/export.
  Expected: immediately redirects to http://localhost:3000/studio-new.

- [ ] **Step 5: Commit**

  ```bash
  git add src/app/export/page.tsx
  git commit -m "feat: add Export & Repurpose page"
  ```

---

## Self-Review

**Spec coverage:**
- ✅ CSS token layer — Task 1
- ✅ `StudioShell` with consistent chrome — Task 2
- ✅ Landing page redesign — Task 3
- ✅ DeckGenerator redesign, nav removed — Task 4
- ✅ Loading screen — gradient progress bar, cyan accents, surface-card left panel — Task 5
- ✅ Studio form wrapped in StudioShell — Task 6
- ✅ Presentation editor — gradient Export button, ghost nav buttons, no inline PDF/PPTX — Task 6
- ✅ sessionStorage write on generation complete — Task 5 (Step 2) + Task 6 (Step 1)
- ✅ Export & Repurpose page — Task 7
- ✅ Lime retired — Tasks 3, 4, 5, 6
- ✅ SlideCanvas untouched — not in any task
- ✅ API routes untouched — not in any task

**Placeholder check:** All code blocks are complete and copy-pasteable. No TBDs.

**Type consistency:**
- `Deck` / `Slide` interfaces in `export/page.tsx` match `studio-new/page.tsx` exactly
- `strip()` and `convertForPdf()` in `export/page.tsx` are verbatim copies from `studio-new/page.tsx`
- `StudioShellProps` (`status`, `actions`, `children`) referenced consistently across Tasks 2, 5, 6, 7
- `sessionStorage` key `'ss-deck'` used in Task 5 Step 2 (write) and Task 7 Step 1 (read)
