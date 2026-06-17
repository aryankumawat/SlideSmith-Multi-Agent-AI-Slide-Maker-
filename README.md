# SlideSmith

**Turn any idea into a presentation. Powered by Groq + Llama.**

SlideSmith is an AI presentation generator with a dark editorial interface. Type a topic, pick your settings, and get a fully-structured slide deck with charts, images, speaker notes, and export to PDF or PowerPoint — in about 60–120 seconds.

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

```
Browser (SSE client)
    ↓ POST /api/generate-deck
    ← stream: outline event, slide events, done event

Server-side pipeline (src/lib/deck-generator.ts):
  1. Generate outline          (Groq Llama 3.3 70B)
  2. Per-slide generation      (Groq Llama 3.1 8B, parallel)
     - Layout selection
     - Bullets / stat blocks / cards
     - Speaker notes
     - Chart spec (bar, line, pie, area, scatter)
     - Image prompt → LoremFlickr (free, no key)
  3. Stream each slide to client as it completes

Export:
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
│   │   ├── generate-deck/      # Primary SSE streaming endpoint
│   │   ├── export/pdf/         # PDF export (PDFKit)
│   │   ├── export/pptx/        # PowerPoint export (PptxGenJS)
│   │   └── multi-model-generate/ # Legacy 17-agent pipeline
│   ├── studio-new/             # Main UI (page.tsx)
│   └── page.tsx                # Root redirect
│
├── components/
│   ├── DeckGenerator.tsx       # Prompt form + settings panel
│   ├── SlideCanvas.tsx         # Slide rendering engine (all layouts + charts)
│   ├── SlideView.tsx           # Slide navigator + presentation mode
│   └── blocks/                 # Primitive content blocks
│
└── lib/
    ├── deck-generator.ts       # Core generation logic (outline + per-slide)
    ├── schema.ts               # TypeScript types (Slide, Deck, ChartSpec)
    ├── theming.ts              # 6 built-in themes
    └── multi-model/            # Legacy 17-agent system (still available)
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

### Generate deck (SSE)

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

Response is an SSE stream. Events:

```
event: outline
data: { "titles": ["Intro", "Market Overview", ...] }

event: slide
data: { "index": 0, "slide": { "layout": "title", "title": "...", ... } }

event: done
data: { "deck": { "title": "...", "slides": [...] } }
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

Groq free tier, 10-slide deck:

- Outline: ~3–5s
- Per-slide generation (streamed): ~45–90s total
- **First slide visible: ~8–12s**

---

## License

MIT
