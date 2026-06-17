# SlideSmith

**Turn any idea into a presentation. Powered by Groq + Llama.**

SlideSmith is an AI presentation generator with a dark editorial interface. It runs two generation modes: a fast SSE streaming pipeline for real-time output, and a 17-agent collaborative pipeline for maximum quality. Both export to PDF and PowerPoint.

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

### Mode 2 — 17-Agent Collaborative Pipeline

```
POST /api/multi-model-generate

Orchestrated DAG (src/lib/multi-model/orchestrator.ts):
  Step 1   Researcher            → fact extraction, evidence synthesis
  Step 2   Structurer            → narrative arc, section decomposition
  Step 2b  Slide Layout Planner  → optimal visual layout per slide
  Step 3   Per-section parallel:
             Slidewriter + Copy Tightener + Readability Analyzer
             + Media Finder + Data Viz Planner
  Step 3b  Image Generation Dispatcher → LoremFlickr
  Step 4   Cross-deck QA (parallel):
             Fact Checker + Accessibility Linter
             + Deduplication Agent + Narrative Arc Auditor
  Step 5   Speaker Notes Generator
  Step 6   Final Assembly
  Step 7   Executive Summary (optional)
  Step 8   Audience Adaptation (optional)
```

Best for: maximum quality, full QA scores, audience-tuned output. ~2–3 min on Groq.

### Agent Roster

| # | Agent | Role |
|---|-------|------|
| 1 | Researcher | Fact extraction, source validation |
| 2 | Structurer | Narrative arc, section planning |
| 3 | Slide Layout Planner | Visual layout assignment |
| 4 | Slidewriter | Content composition per slide |
| 5 | Copy Tightener | Tone normalisation, consistency |
| 6 | Readability Analyzer | Flesch-Kincaid scoring |
| 7 | Media Finder | Asset retrieval, alt-text |
| 8 | Data Viz Planner | Chart type + encoding |
| 9 | Image Generation Dispatcher | Prompt → image |
| 10 | Fact Checker | Claim verification |
| 11 | Accessibility Linter | WCAG 2.1 AA compliance |
| 12 | Deduplication & Coherence | Duplicates, contradictions |
| 13 | Narrative Arc Auditor | Hook/tension/evidence/CTA flow |
| 14 | Speaker Notes Generator | Presenter guidance + timing |
| 15 | Executive Summary | Key point distillation |
| 16 | Audience Adapter | Complexity + tone recalibration |
| 17 | Live Widget Planner | Real-time data integration |

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
│   │   ├── multi-model-generate/ # 17-agent pipeline endpoint
│   │   ├── export/pdf/           # PDF export (PDFKit)
│   │   └── export/pptx/          # PowerPoint export (PptxGenJS)
│   ├── studio-new/               # Main UI (page.tsx)
│   └── page.tsx                  # Root redirect
│
├── components/
│   ├── DeckGenerator.tsx         # Prompt form + settings panel
│   ├── SlideCanvas.tsx           # Slide rendering engine (all layouts + charts)
│   ├── SlideView.tsx             # Slide navigator + presentation mode
│   └── blocks/                   # Primitive content blocks
│
└── lib/
    ├── deck-generator.ts         # SSE pipeline: outline + per-slide generation
    ├── schema.ts                 # Core TypeScript types (Slide, Deck, ChartSpec)
    ├── theming.ts                # 6 built-in themes
    └── multi-model/              # 17-agent pipeline
        ├── agents/               # 17 agent implementations
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
        ├── orchestrator.ts       # DAG execution engine (8 steps)
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
  "text_density": "medium"
}
```

Response is an SSE stream:

```
event: outline
data: { "titles": ["Intro", "Market Overview", ...] }

event: slide
data: { "index": 0, "slide": { "layout": "title", "title": "...", ... } }

event: done
data: { "deck": { "title": "...", "slides": [...] } }
```

### 17-agent generation

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
