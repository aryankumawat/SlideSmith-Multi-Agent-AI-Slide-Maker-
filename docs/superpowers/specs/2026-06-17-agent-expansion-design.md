# SlideSmith — Agent Expansion & Paragraph Content Design

**Date:** 2026-06-17
**Status:** Approved — implementation in progress

---

## Problem Statement

Four pain points identified during usage:

1. **Generic content** — slides lack specific, data-backed facts. Researcher's web search path is dormant without explicit API keys.
2. **No per-slide iteration** — regenerating one bad slide requires a full deck re-run.
3. **No repurposing** — finished decks can't be turned into LinkedIn posts, threads, or blog articles.
4. **Fake chart data** — the Data Viz Planner guesses numbers; charts have no real sourcing.

Plus a content rendering gap: slides only support `bullets`, never flowing prose, even when prose would read better.

---

## Design

### 1. Four New Agents

#### Agent 1: Live Researcher (`live-researcher.ts`)

Replaces/augments the existing Researcher in the 17-agent pipeline. Promotes web search to the primary path.

**Input:**
```ts
{ topic: string; audience: string; tone: string; maxSnippets?: number }
```

**Execution:**
1. Try Brave Search API (`BRAVE_API_KEY`) → if present, fetch top 10 results
2. Try Tavily API (`TAVILY_API_KEY`) → if Brave unavailable
3. Fall back to LLM-simulated research → marks snippets `searchMode: 'llm-simulated'`
4. Deduplicates across sources, validates URLs, scores confidence

**Output:** Same `ResearchSnippet[]` shape as existing Researcher — zero downstream changes.

**Pipeline position:** Step 1 (replaces Researcher)

---

#### Agent 2: Chart Data Fetcher (`chart-data-fetcher.ts`)

Fetches real statistics for each slide that has a `chart_spec`.

**Input:**
```ts
{ chartTopic: string; chartType: 'bar' | 'line' | 'pie' | 'area'; slideTitle: string }
```

**Execution:**
1. Searches for real data points matching the chart topic
2. Extracts `{ label, value, unit, source }` rows
3. Falls back to LLM-generated data, marks it `dataSource: 'simulated'`

**Output:**
```ts
{
  data: Array<{ label: string; value: number; unit: string; source?: string }>;
  dataSource: 'live' | 'simulated';
}
```

**Pipeline position:** Step 3, parallel with Media Finder — runs once per slide with a `chart_spec`

---

#### Agent 3: Slide Regenerator (`slide-regenerator.ts`)

On-demand single-slide rewrite. Not part of the main DAG.

**Input:**
```ts
{
  deck: Deck;
  slideIndex: number;
  feedback: string;       // e.g. "too dense", "needs a chart", "wrong tone"
  targetLayout?: string;
}
```

**Execution:**
1. Extracts target slide + 1 slide of surrounding context for coherence
2. Runs: Slidewriter → Copy Tightener → Layout Planner on that one slide only
3. Recalculates speaker notes for the regenerated slide
4. Returns full deck with the one slide replaced

**Endpoint:** `POST /api/regenerate-slide`

---

#### Agent 4: Content Repurposer (`content-repurposer.ts`)

Turns a finished deck into other content formats.

**Input:**
```ts
{
  deck: Deck;
  formats: Array<'linkedin' | 'twitter_thread' | 'blog' | 'email'>;
  tone?: string;
}
```

**Execution:** Generates each format in parallel from deck title + slide titles + bullets + speaker notes.

**Format constraints:**
- `linkedin`: 150–300 words, 3–5 takeaways, no hashtag spam
- `twitter_thread`: 8–12 tweets, each ≤280 chars, numbered
- `blog`: 600–900 words, H2 sections matching slide titles
- `email`: subject line + 200-word body + CTA

**Output:**
```ts
{ linkedin?: string; twitter_thread?: string[]; blog?: string; email?: string }
```

**Pipeline position:** Step 9 (after Final Assembly), optional, triggered by `generateRepurposedContent` flag

---

### 2. Paragraph Content Support

**Problem:** `Slide.bullets` is the only content field. Prose-oriented slides (closing, context, quote) get forced into bullet lists.

#### Schema changes (`schemas.ts`, `schema.ts`)

```ts
export type Slide = {
  // existing fields...
  bullets?: string[];
  paragraph?: string;          // NEW: flowing prose, 2–4 sentences
  content_format?: 'bullets' | 'paragraph' | 'mixed'; // NEW: per-slide preference
}
```

`mixed` = paragraph first, then 2–3 bullet takeaways below it.

#### Request schema

Add `content_format` to `GenerateDeckRequestSchema`:
```ts
content_format: z.enum(['bullets', 'paragraph', 'mixed']).default('mixed')
```

#### Generation logic (Slidewriter + deck-generator.ts)

Layout-based defaults:
- `quote`, `closing`, `image` → `paragraph`
- `stats`, `cards` → `bullets` (these are inherently list-like)
- `split`, `bullets` layouts → `mixed` when `text_density` is `text_heavy`, else `bullets`

User override: if `content_format` is set on the request, it takes precedence for all slides. Per-slide override: if the LLM returns both `paragraph` and `bullets`, honour `content_format` to decide which to use.

#### Renderer (`SlideCanvas.tsx`)

Add paragraph render path in every layout block:
- Paragraph renders as `<p>` with `lineHeight: 1.7`, `maxWidth: '65ch'`
- `mixed`: paragraph renders above bullets with `marginBottom: 12px` separator
- Falls back to bullets if `paragraph` is absent

#### UI (`DeckGenerator.tsx`)

Add a **Content Style** pill group alongside the existing Density pills:

```
[ Bullets ]  [ Paragraphs ]  [ Mixed ]
```

Default: Mixed. Sends as `content_format` in the request body.

---

## File Changelist

| File | Change |
|------|--------|
| `src/lib/multi-model/schemas.ts` | Add `paragraph`, `content_format` to Slide type |
| `src/lib/schema.ts` | Same additions to core Slide type |
| `src/lib/multi-model/agents/live-researcher.ts` | New agent |
| `src/lib/multi-model/agents/chart-data-fetcher.ts` | New agent |
| `src/lib/multi-model/agents/slide-regenerator.ts` | New agent |
| `src/lib/multi-model/agents/content-repurposer.ts` | New agent |
| `src/lib/multi-model/orchestrator.ts` | Wire Chart Data Fetcher (Step 3), Content Repurposer (Step 9) |
| `src/lib/deck-generator.ts` | Add paragraph logic to per-slide prompt + content_format handling |
| `src/lib/multi-model/agents/slidewriter.ts` | Add paragraph output to prompt |
| `src/components/SlideCanvas.tsx` | Paragraph render path in all layout blocks |
| `src/components/DeckGenerator.tsx` | Content Style pill group |
| `src/app/api/regenerate-slide/route.ts` | New endpoint (Slide Regenerator) |
| `src/app/api/repurpose/route.ts` | New endpoint (Content Repurposer) |

---

## Degradation Behaviour

| Feature | No API keys | With API keys |
|---------|------------|---------------|
| Live Researcher | LLM-simulated, `searchMode: 'llm-simulated'` | Real web results |
| Chart Data Fetcher | LLM-generated data, `dataSource: 'simulated'` | Real statistics |
| Slide Regenerator | Works (LLM only) | Works |
| Content Repurposer | Works (LLM only) | Works |

---

## Out of Scope

- Plugin interface for community agent registration (separate spec)
- UI for Content Repurposer output (separate spec — just the backend + API for now)
- Translation/localisation agent
