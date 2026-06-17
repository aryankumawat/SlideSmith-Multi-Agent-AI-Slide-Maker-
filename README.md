# SlideSmith

**Turn any idea into a presentation. Powered by Groq + Llama.**

SlideSmith is an AI presentation generator with a dark editorial interface. It runs two generation modes: a fast SSE streaming pipeline for real-time output, and a 21-agent collaborative pipeline for maximum quality. Both export to PDF and PowerPoint.

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/aryankumawat/SlideSmith-Multi-Agent-AI-Slide-Maker-.git
cd SlideSmith-Multi-Agent-AI-Slide-Maker-
npm install

# 2. Configure
cp .env.local.example .env.local
# Add your free Groq key: GROQ_API_KEY=gsk_...

# 3. Start
npm run dev
# → http://localhost:3000/studio-new
```

Get a free Groq key at [console.groq.com](https://console.groq.com) — no credit card required.

---

## How It Works

1. Enter a topic or paste a prompt in the left panel
2. Set slide count, theme, tone, audience, and text density
3. Click **Generate presentation** — progress streams in real time
4. View, navigate, export to PDF or PPTX

The generation endpoint (`/api/generate-deck`) uses **Server-Sent Events** to stream each slide as it is built, so you see the deck fill in live rather than waiting for a full response.

---

## Architecture

SlideSmith has two generation modes, selectable per request:

### Mode 1 — SSE Streaming Pipeline (default UI)

```
Browser (SSE client)
    ↓ POST /api/generate-deck
    ← stream: outline event, slide events, done event

Server-side (src/lib/deck-generator.ts):
  1. Generate outline          (Groq Llama 3.3 70B)
  2. Per-slide generation      (Groq Llama 3.1 8B, parallel)
     - Layout selection
     - Bullets / stat blocks / cards
     - Speaker notes
     - Chart spec (bar, line, pie, area, scatter)
     - Image prompt → LoremFlickr (free, no key)
  3. Stream each slide to client as it completes
```

Best for: fast drafts, real-time feedback, ~60–120s total.

### Mode 2 — 21-Agent Collaborative Pipeline

```
POST /api/multi-model-generate

Orchestrated DAG (src/lib/multi-model/orchestrator.ts):
  Step 1   Live Researcher       → real web search (Brave/Tavily) + LLM fallback
  Step 2   Structurer            → narrative arc, section decomposition
  Step 2b  Slide Layout Planner  → optimal visual layout per slide
  Step 3   Per-section parallel:
             Slidewriter + Copy Tightener + Readability Analyzer
             + Media Finder + Data Viz Planner + Chart Data Fetcher
  Step 3b  Image Generation Dispatcher → LoremFlickr
  Step 4   Cross-deck QA (parallel):
             Fact Checker + Accessibility Linter
             + Deduplication Agent + Narrative Arc Auditor
  Step 5   Speaker Notes Generator
  Step 6   Final Assembly
  Step 7   Executive Summary (optional)
  Step 8   Audience Adaptation (optional)
  Step 9   Content Repurposer (optional) → LinkedIn / thread / blog / email
```

Best for: maximum quality, full QA scores, audience-tuned output. ~2–3 min on Groq.

### Agent Roster

| # | Agent | Role | Pipeline position |
|---|-------|------|-------------------|
| 1 | Live Researcher | Real web search (Brave → Tavily → LLM fallback) | Step 1 |
| 2 | Structurer | Narrative arc, section planning | Step 2 |
| 3 | Slide Layout Planner | Visual layout assignment | Step 2b |
| 4 | Slidewriter | Content composition per slide | Step 3 |
| 5 | Copy Tightener | Tone normalisation, consistency | Step 3 |
| 6 | Readability Analyzer | Flesch-Kincaid scoring | Step 3 |
| 7 | Media Finder | Asset retrieval, alt-text | Step 3 |
| 8 | Data Viz Planner | Chart type + encoding | Step 3 |
| 9 | Chart Data Fetcher | Real statistics for chart slides | Step 3 |
| 10 | Image Generation Dispatcher | Prompt → LoremFlickr image | Step 3b |
| 11 | Fact Checker | Claim verification | Step 4 |
| 12 | Accessibility Linter | WCAG 2.1 AA compliance | Step 4 |
| 13 | Deduplication & Coherence | Duplicates, contradictions | Step 4 |
| 14 | Narrative Arc Auditor | Hook/tension/evidence/CTA flow | Step 4 |
| 15 | Speaker Notes Generator | Presenter guidance + timing | Step 5 |
| 16 | Executive Summary | Key point distillation | Step 7 |
| 17 | Audience Adapter | Complexity + tone recalibration | Step 8 |
| 18 | Live Widget Planner | Real-time data integration | Enhancement |
| 19 | Content Repurposer | Deck → LinkedIn / thread / blog / email | Step 9 |
| 20 | Slide Regenerator | Per-slide rewrite from user feedback | On-demand |
| 21 | Researcher (legacy) | LLM-simulated research (pre-Live Researcher) | Fallback |

### Model Routing

| Policy | High-quality agents | Fast agents |
|--------|--------------------|----|
| `balanced` (default) | Llama 3.3 70B | Llama 3.1 8B |
| `quality` | Llama 3.3 70B (all) | — |
| `speed` | — | Llama 3.1 8B (all) |

All Groq models fall back to Ollama when `GROQ_API_KEY` is not set.

### Export

```
POST /api/export/pdf    → PDFKit (landscape, theme-aware)
POST /api/export/pptx   → PptxGenJS (native charts, speaker notes)
```

---

## Slide Layouts

| Layout | Use case |
|--------|----------|
| `title` | Opening slide with large heading and subtitle |
| `bullets` | Key points with optional chart or image |
| `split` | Text on left, chart or image on right |
| `stats` | Large stat blocks (e.g. 3 KPIs in a row) |
| `cards` | Icon + title + description triptych |
| `quote` | Full-bleed pull quote |
| `image` | Full-bleed image with caption |
| `closing` | Final slide with CTA |

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── generate-deck/        # SSE streaming endpoint
│   │   ├── multi-model-generate/ # 21-agent pipeline endpoint
│   │   ├── regenerate-slide/     # Per-slide rewrite endpoint
│   │   ├── repurpose/            # Deck → LinkedIn/blog/thread/email
│   │   ├── export/pdf/           # PDF export (PDFKit)
│   │   └── export/pptx/          # PowerPoint export (PptxGenJS)
│   ├── studio-new/               # Main UI (page.tsx)
│   └── page.tsx                  # Root redirect
│
├── components/
│   ├── DeckGenerator.tsx         # Prompt form + settings (incl. content style)
│   ├── SlideCanvas.tsx           # Slide renderer — bullets, paragraphs, mixed
│   ├── SlideView.tsx             # Slide navigator + presentation mode
│   └── blocks/                   # Primitive content blocks
│
└── lib/
    ├── deck-generator.ts         # SSE pipeline: outline + per-slide generation
    ├── schema.ts                 # Core TypeScript types (Slide, Deck, ChartSpec)
    ├── theming.ts                # 6 built-in themes
    └── multi-model/              # 21-agent pipeline
        ├── agents/               # 21 agent implementations
        │   ├── live-researcher.ts          # NEW: web search (Brave/Tavily/LLM)
        │   ├── chart-data-fetcher.ts       # NEW: real stats for chart slides
        │   ├── slide-regenerator.ts        # NEW: per-slide rewrite from feedback
        │   ├── content-repurposer.ts       # NEW: deck → social/blog/email
        │   ├── researcher.ts
        │   ├── structurer.ts
        │   ├── slide-layout-planner.ts
        │   ├── slidewriter.ts
        │   ├── copy-tightener.ts
        │   ├── fact-checker.ts
        │   ├── accessibility-linter.ts
        │   ├── deduplication-agent.ts
        │   ├── narrative-arc-auditor.ts
        │   ├── image-generation-dispatcher.ts
        │   ├── media-finder.ts
        │   ├── speaker-notes-generator.ts
        │   ├── data-viz-planner.ts
        │   ├── live-widget-planner.ts
        │   ├── executive-summary.ts
        │   ├── audience-adapter.ts
        │   └── readability-analyzer.ts
        ├── standalone-model.ts   # Model bootstrap for standalone agent use
        ├── orchestrator.ts       # DAG execution engine (9 steps)
        ├── base-agent.ts         # Abstract agent base class
        ├── router.ts             # Model selection by policy
        ├── schemas.ts            # Zod v4 I/O contracts per agent
        └── ollama-config.ts      # Groq + Ollama model configs
```

---

## Configuration

### Environment Variables

```env
# Required for cloud generation (free tier)
GROQ_API_KEY=gsk_...

# Optional: real web search for Live Researcher + Chart Data Fetcher
# Without these, both agents fall back to LLM-simulated data
BRAVE_API_KEY=BSA...    # console.brave.com — free tier available
TAVILY_API_KEY=tvly-... # app.tavily.com — free tier available

# Optional: fall back to any OpenAI-compatible provider
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=gemma3:4b
```

### Themes

| Key | Description |
|-----|-------------|
| `deep_space` | Dark charcoal with cyan accents |
| `ultra_violet` | Deep purple with electric accents |
| `minimal` | White with black ink |
| `corporate` | Slate blue, professional |
| `academic` | Dark navy with gold |
| `navy_gold` | Navy background, gold headings |

---

## API

### SSE streaming generation

```
POST /api/generate-deck
Content-Type: application/json

{
  "mode": "quick_prompt",
  "topic_or_prompt": "The future of renewable energy",
  "tone": "professional",
  "audience": "executives",
  "slide_count": 10,
  "theme": "deep_space",
  "text_density": "medium",
  "content_format": "mixed"
}
```

`content_format`: `"bullets"` (list only) · `"paragraph"` (prose only) · `"mixed"` (paragraph + bullets, default)

Response is an SSE stream:

```
event: outline
data: { "titles": ["Intro", "Market Overview", ...] }

event: slide
data: { "index": 0, "slide": { "layout": "title", "title": "...", "paragraph": "...", "bullets": [...] } }

event: done
data: { "deck": { "title": "...", "slides": [...] } }
```

### 21-agent generation

```
POST /api/multi-model-generate
Content-Type: application/json

{
  "topic": "The future of renewable energy",
  "tone": "Professional",
  "audience": "executives",
  "desiredSlideCount": 12,
  "policy": "balanced"
}
```

Response includes the full deck plus 6-dimensional quality scores:

```json
{
  "deck": { "id": "...", "title": "...", "slides": [...] },
  "quality": {
    "factCheckScore": 0.91,
    "accessibilityScore": 0.88,
    "readabilityScore": 0.84,
    "consistencyScore": 0.93,
    "narrativeScore": 0.87,
    "coherenceScore": 0.90
  },
  "metadata": { "totalTokens": 14200, "processingTime": 142000 }
}
```

### Per-slide regeneration

Rewrites a single slide based on feedback without re-running the full pipeline.

```
POST /api/regenerate-slide
Content-Type: application/json

{
  "deck": { "title": "...", "theme": "deep_space", "slides": [...] },
  "slideIndex": 3,
  "feedback": "too dense, needs a chart instead",
  "content_format": "mixed"
}
```

Returns the full deck with the target slide replaced, plus the regenerated slide isolated:

```json
{
  "deck": { "title": "...", "slides": [...] },
  "regeneratedSlide": { "title": "...", "paragraph": "...", "bullets": [...] },
  "slideIndex": 3
}
```

### Content repurposing

Turns a finished deck into other content formats in one call.

```
POST /api/repurpose
Content-Type: application/json

{
  "deck": { "title": "...", "slides": [...] },
  "formats": ["linkedin", "twitter_thread", "blog", "email"],
  "tone": "professional"
}
```

```json
{
  "linkedin": "Full post text (150-300 words)...",
  "twitter_thread": ["1/ Hook tweet...", "2/ ...", "..."],
  "blog": "# Title\n\n## Section...",
  "email": "Subject: ...\n\nBody..."
}
```

Format constraints:
- `linkedin` — 150–300 words, 3–5 takeaways, max 3 hashtags
- `twitter_thread` — 7–10 tweets, each ≤280 chars, numbered
- `blog` — 600–900 words, H2 sections matching slide titles, Markdown
- `email` — subject line + 200-word body + CTA

### Export

```
POST /api/export/pdf    Body: { deck: Deck }  → application/pdf
POST /api/export/pptx   Body: { deck: Deck }  → .pptx blob
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion 12 |
| Charts | Recharts v3 |
| Fonts | Syne 800 (display), Geist Mono (labels) |
| PDF Export | PDFKit |
| PPTX Export | PptxGenJS |
| Images | LoremFlickr (free, no key) |
| LLM (cloud) | Groq — Llama 3.3 70B / 3.1 8B (free tier) |
| LLM (local) | Ollama — any model via OpenAI-compatible endpoint |
| Validation | Zod v4 |

---

## Performance

**SSE Streaming (10 slides, Groq):**
- Outline: ~3–5s
- First slide visible: ~8–12s
- Full deck: ~60–120s

**17-Agent Pipeline (12 slides, balanced policy, Groq):**
- Research + Structure: ~15–25s
- Layout Planning: ~5–8s
- Per-section parallel (5 agents): ~60–90s
- Cross-Deck QA (4 agents parallel): ~15–25s
- Speaker Notes: ~8–12s
- Total: ~2–3 minutes

**Ollama on Apple M1 Pro 16GB:** same pipelines take ~2× longer; GPU-accelerated via Metal.

---

## License

MIT
