# SlideSmith × Stitch Redesign — Design Spec
**Date:** 2026-06-17
**Status:** Approved

---

## Overview

Integrate the Stitch "Lumina Editorial" design system (project `10423706520832955348`) into the SlideSmith Next.js app. The current lime `#C8FF00` accent is retired and replaced with the Lumina cyan `#00D4FF` + violet `#7C3AED` gradient system. A CSS variable token layer is introduced. A new dedicated Export & Repurpose page is added.

---

## Design System: Lumina Editorial

Source: Stitch project "SlideSmith Premium Workspace" (created 2026-06-17).

### Color Tokens (`--ss-*`)

| Token | Value | Usage |
|---|---|---|
| `--ss-bg-deep` | `#0A0A0B` | True canvas / deepest background |
| `--ss-surface` | `#121315` | Page background |
| `--ss-surface-card` | `#17181C` | Cards, panels, loading left-panel |
| `--ss-surface-high` | `#292a2c` | Elevated / focused elements |
| `--ss-border` | `rgba(255,255,255,0.08)` | All container borders |
| `--ss-text` | `#FFFFFF` | Primary text |
| `--ss-text-secondary` | `#A1A1AA` | Secondary / muted text |
| `--ss-cyan` | `#00D4FF` | Primary accent |
| `--ss-violet` | `#7C3AED` | Secondary accent |
| `--ss-gradient` | `linear-gradient(135deg, #00D4FF 0%, #7C3AED 100%)` | CTAs, active states, progress bars |
| `--ss-radius` | `0.75rem` | Standard corner radius (12px) |
| `--ss-radius-lg` | `1.25rem` | Large containers (20px) |

All tokens are namespaced `--ss-*` to avoid collision with the existing shadcn token system in `globals.css`.

### Typography
Already loaded in `layout.tsx` — no changes required:
- **Syne** (`--font-syne`) — display, headlines
- **Geist Mono** (`--font-geist-mono`) — technical labels, monospace data
- **Geist Sans** (`--font-geist-sans`) — body / UI (maps to Inter role in Lumina)

---

## Architecture

### Approach
**CSS Variables + Studio Layout Shell (Approach B)**

### File Changes

```
src/
  app/
    globals.css            ← Add --ss-* token block to :root
    page.tsx               ← Landing page redesigned
    studio-new/
      page.tsx             ← Studio Dashboard + Loading + Presentation Editor redesigned
    export/
      page.tsx             ← NEW: Export & Repurpose page
  components/
    StudioShell.tsx        ← NEW: shared nav chrome wrapper
    DeckGenerator.tsx      ← Redesigned (LIME → CSS tokens)
    SlideCanvas.tsx        ← Untouched (has own slide theme system)
```

### StudioShell Component
A thin client wrapper used by `studio-new` and `export` pages.

**Props:**
```ts
interface StudioShellProps {
  status?: string;       // center monospace label (e.g. "Generating…")
  actions?: ReactNode;   // right slot (export buttons, etc.)
  children: ReactNode;
}
```

**Behaviour:**
- 52px top nav bar
- Left: `SlideSmith` wordmark (Syne, 12px, uppercase, 0.18em spacing)
- Center: `status` string in Geist Mono, `var(--ss-text-secondary)`, when provided
- Right: `actions` slot
- Background: `var(--ss-surface)`, bottom border: `1px solid var(--ss-border)`
- On scroll: `backdrop-filter: blur(12px)` + `background: rgba(18,19,21,0.9)`
- Children render in a `flex: 1; min-height: 0` container below the nav

---

## Page-by-Page Design

### 1. Landing Page (`/`)

| Element | Before | After |
|---|---|---|
| Accent colour | `#C8FF00` lime | `var(--ss-cyan)` |
| Accent left-border | 2px lime | 2px cyan |
| Primary CTA | Lime fill, dark text | `var(--ss-gradient)` fill, white text, `var(--ss-radius)` |
| Secondary CTA | Dark border, grey text | `border: 1px solid var(--ss-border)`, `color: var(--ss-text-secondary)` |
| How It Works cells | `background: #0D0D0D`, hard `1px gap` grid | `background: var(--ss-surface-card)`, `border-radius: var(--ss-radius)`, gap as spacer |
| Feature hover number | Lime | `var(--ss-cyan)` |
| Nav scroll bg | `rgba(13,13,13,0.95)` | `rgba(18,19,21,0.92)` with `backdrop-filter: blur(12px)` |
| Nav border | `#2A2A2A` | `var(--ss-border)` |

---

### 2. Studio Dashboard — DeckGenerator (`/studio-new`)

Wrapped in `StudioShell` (nav extracted from DeckGenerator into shell).

| Element | Before | After |
|---|---|---|
| Textarea focus ring | `lime 40%` glow | `var(--ss-cyan)40` glow |
| Active option button | Lime fill, dark text | Gradient border `var(--ss-cyan)`, subtle gradient bg `#00D4FF15→#7C3AED15`, text `var(--ss-cyan)` |
| Submit button (enabled) | Lime fill, dark text, lime shadow | `var(--ss-gradient)` fill, white text, `0 0 24px #00D4FF25` shadow |
| Submit button (disabled) | `#141414` fill | `var(--ss-surface-card)` fill, muted border |
| Example prompt arrows | `#2A2A2A` | `var(--ss-text-secondary)` at low opacity |
| Badge dot | Lime pulse | `var(--ss-cyan)` pulse |

---

### 3. AI Workflow Live — Loading Screen (`/studio-new`)

| Element | Before | After |
|---|---|---|
| Progress number | Lime when > 0 | `var(--ss-cyan)` |
| Progress bar fill | Solid lime | `var(--ss-gradient)` + shimmer animation |
| Phase dots (active) | Lime, lime glow | `var(--ss-cyan)`, `box-shadow: 0 0 8px var(--ss-cyan)80` |
| ✓ checkmarks | Lime | `var(--ss-cyan)` |
| `writing` badge | Lime | `var(--ss-cyan)` |
| Left panel bg | `border-right: 1px solid #161616` | `background: var(--ss-surface-card)`, `border-right: 1px solid var(--ss-border)` |

New `@keyframes ss-shimmer` added to `globals.css` for the gradient progress bar shimmer.

---

### 4. Presentation Editor (`/studio-new` — deck view)

Wrapped in `StudioShell` with `actions` slot containing navigation buttons.

| Element | Before | After |
|---|---|---|
| Top bar background | `#0A0A0A` | `var(--ss-surface)` |
| Border | `#161616` | `var(--ss-border)` |
| Breadcrumb `/` | `#242424` | `var(--ss-border)` |
| "New deck" + "PDF" buttons | Hard `#222` border | `border: 1px solid var(--ss-border)`, hover → `rgba(255,255,255,0.15)` |
| Export PPTX button | Lime fill, dark text | `var(--ss-gradient)` fill, white text |
| Error toast bg | `#150808` | `var(--ss-surface-card)` with subtle red-tinted border |
| Added | — | **"Export →"** ghost button linking to `/export` |
| Removed | Inline PDF + PPTX buttons | Moved to `/export` page |

---

### 5. Export & Repurpose Page (`/export`) — NEW

**Data flow:** When generation completes in `studio-new`, deck JSON is written to `sessionStorage` under key `ss-deck`. The export page reads it on mount. If absent, redirects to `/studio-new`.

**Layout:** Two-column inside `StudioShell`.

**Left panel** (`var(--ss-surface-card)`, `border-right: 1px solid var(--ss-border)`):
- Deck title (Syne, display-sm scale)
- Monospace metadata row: slide count · theme name
- Scrollable slide index list: index number (Geist Mono, `var(--ss-text-secondary)`) + slide title

**Right panel** — two sections:

*Export section:*
- Three cards in a 3-col grid: **PPTX**, **PDF**, **JSON**
- Each card: `var(--ss-surface-card)` bg, `border-radius: var(--ss-radius)`, `border: 1px solid var(--ss-border)`
- Card contains: icon, format name (Syne, bold), one-line description, gradient CTA button
- Active export state: button shows inline spinner, card border brightens to `var(--ss-cyan)`

*Repurpose section:*
- Section label: `COMING SOON` in Geist Mono, uppercase, `var(--ss-text-secondary)`
- Two muted cards: **Social Post**, **Email Summary**
- Muted styling: reduced opacity, `SOON` pill badge, no active CTA

**StudioShell nav on this page:**
- Status: deck title (truncated)
- Actions: "← Back to editor" ghost button (clears export state, returns to `/studio-new`)

---

## Navigation Flow

```
/                   Landing
  → /studio-new     Studio (DeckGenerator form)
      → loading     (inline loading state)
      → deck view   (presentation editor)
          → /export Export & Repurpose (new)
              → /studio-new  (back)
```

---

## Out of Scope

- `SlideCanvas.tsx` and all slide rendering logic — untouched
- API routes (`/api/generate-deck`, `/api/export/*`) — untouched
- Responsiveness / mobile layout — desktop only for this pass
- `/studio` (old studio page) — untouched

---

## Constraints

- Fonts already loaded in `layout.tsx` — no new font imports needed
- `framer-motion` already installed — all existing animations kept, accent colours updated
- shadcn tokens in `globals.css` preserved untouched — `--ss-*` namespace is additive
- `SlideCanvas.tsx` has its own theming system per presentation theme — leave it alone
