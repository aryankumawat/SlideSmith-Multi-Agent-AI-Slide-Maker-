# SlideSmith Bug Fixes + Groq Integration — Task Plan

## Bug Fixes

- [ ] **Task 1**: Fix Zod schema char-vs-word limits in `schemas.ts`
  - `Bullets` items: `z.string().max(12)` → `z.string().max(120)`
  - `OutlineSection` title: `z.string().max(8)` → `z.string().max(80)`
  - Acceptance: `tsc --noEmit` passes; a 40-char bullet no longer fails schema validation

- [ ] **Task 2**: Fix `createFallbackSlide` in `slidewriter.ts`
  - `layout: 'title-content'` → `'title+bullets'`
  - `citations: []` → `cites: []`
  - Acceptance: `tsc --noEmit` passes; no runtime type errors on fallback slides

- [ ] **Task 3**: Fix structurer fallback section object
  - Add missing `order` field
  - Remove spurious `chartReason` (not in `OutlineSection` schema)
  - Acceptance: `tsc --noEmit` passes

- [ ] **Task 4**: Fix researcher hardcoded "2024" year
  - Replace `"trends 2024"` with dynamic current year
  - Acceptance: Generated search queries use current year

- [ ] **Task 5**: Wire layout planner output into slidewriter
  - Add `layoutHints` optional field to `SlidewriterInput` interface
  - Pass layout hint into `buildSlidePrompt` so the LLM uses the intended layout
  - Acceptance: `tsc --noEmit` passes; prompt includes layout instruction when hints are present

- [ ] **Task 6**: Fix route.ts exec summary (private method call + missing flag passthrough)
  - Remove call to private `orchestrator.generateExecutiveSummary()`
  - Pass `generateExecutiveSummary` from request body into `generatePresentation()`
  - Acceptance: `tsc --noEmit` passes; no private-method access

- [ ] **Task 7**: Orchestrator singleton — avoid re-init on every request
  - Move orchestrator to module-level singleton in route.ts
  - Acceptance: `tsc --noEmit` passes; orchestrator initialized once per server process

- [ ] **Task 8**: Commit untracked `slide-layout-planner.ts`
  - `git add` the file
  - Acceptance: `git status` shows no untracked agent files

## Groq Integration

- [ ] **Task 9**: Add Groq provider support to `base-agent.ts`
  - Groq uses OpenAI-compatible `/openai/v1/chat/completions` endpoint
  - Add `groq` to provider enum in `ModelConfigSchema`
  - Acceptance: `tsc --noEmit` passes; Groq requests route to correct base URL

- [ ] **Task 10**: Add Groq models to `ollama-config.ts` (rename to `model-config.ts`)
  - Add `llama-3.3-70b` and `llama-3.1-8b` as Groq models
  - Add `GROQ_API_KEY` env var support
  - Acceptance: `getAllAvailableModels()` includes Groq models when key is present

- [ ] **Task 11**: Update routing policies to use Groq for complex agents
  - `BALANCED_POLICY`: researcher, structurer, deduplication, narrative-arc → `llama-3.3-70b` (Groq)
  - `QUALITY_POLICY`: all agents → `llama-3.3-70b` (Groq)
  - `SPEED_POLICY`: all agents → `llama-3.1-8b` (Groq)
  - Falls back to Ollama when `GROQ_API_KEY` is absent
  - Acceptance: `tsc --noEmit` passes; router selects Groq model when key is set

- [ ] **Task 12**: Update `.env.local.example` and README for Groq setup
  - Add `GROQ_API_KEY=` to env example
  - Document free tier and rate limits
  - Acceptance: Docs updated
