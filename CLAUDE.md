# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server (Vite, port 8080)
npm run build         # Production build
npm run lint          # ESLint over the whole repo
npm test              # Run all Vitest unit tests once
npm run test:watch    # Vitest watch mode
```

Run a single test file: `npx vitest run src/test/calculator.test.ts`
Run tests matching a name: `npx vitest run -t "turnover"`

There is no e2e suite yet — `playwright.config.ts` points at `./e2e`, which does not exist.

## Architecture

This is a single-page ops-planning calculator: given demand/growth/turnover inputs, it projects
month-by-month headcount gap and hiring timing over a period. Everything lives under
`src/features/ops-planning/` (the calculation engine) and `src/components/ops/` (the UI that
renders it). Path alias `@` → `src` (configured in `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`).

### Calculation engine (`src/features/ops-planning/`)

`calculator.ts` exports `runPlannerProjection(inputs: PlannerInputs): ProjectionResult` — the single
entry point. It orchestrates pure functions from sibling modules in three sequential passes over the
timeline (built by `timeline.ts`):

1. **Demand pass** — `demand.ts` computes per-month client base, gross volume, AI-deflected volume,
   and human volume, caching results in a `Map` keyed by timeline index (values feed forward via
   `previousClients`).
2. **Planning pass** — walks the timeline again to decide where hiring cohorts (`HireCohort`) need to
   open, based on projected gap between agents needed and effective headcount (`ramp.ts` supplies the
   ramp-up factor for cohorts still maturing).
3. **Simulation pass** — replays the timeline a third time with a mutable `SimulationState`
   (`legacyPleno` / `legacyRookie` / `cohorts`) to apply turnover (`turnover.ts`) and produce the final
   `MonthlyProjection` row per month, including cohort-level ramp contributions.

Key domain rules worth knowing before touching this code (also documented in `README.md`):
- **Turnover** is rateado (pro-rated) from an annual/semestral/trimestral/mensal input into a monthly
  rate, and can apply `start_of_month` (before hiring/ramp) or `end_of_month` (after) — this changes
  which cohorts absorb the loss.
- **Hiring modes**: `"gap"` opens a vaga in the month the gap appears; `"antecipado"` opens it earlier
  (lead time + ramp-up offset) so the hire is already mature by the gap month.
- **AI deflection**: `volumeHuman = volumeGross * (1 - aiPct)`, where `aiPct` grows monthly and is
  capped at 95% (`aiCoveragePct + aiGrowthMonthly * month + extraAutomation`).
- Headcount is split into `legacyPleno` (always 100% effective) and `legacyRookie` (ramps over 3
  months via `rookieRampFactors`), plus per-cohort ramp curves for new hires — don't conflate these
  three effectiveness tracks when changing capacity math.

`calculator.ts` also re-exports several helpers (`getTimelineKey`, `getRampFactor`,
`resolveContactRate`, `computeAdjustedMix`) — import them from `calculator.ts` rather than reaching
into `timeline.ts`/`ramp.ts`/`capacity.ts` directly, to match existing call sites.

### Reactive layer

- `usePlannerState.ts` owns the `PlannerInputs` form state (patch/patchPercent helpers, turnover month
  toggles, formatting prefs).
- `usePlannerProjection.ts` runs `runPlannerProjection` off the main thread via `planner.worker.ts`
  (a Web Worker, lazily constructed, module type). Every input change bumps a `requestId` so stale
  worker responses are dropped. If the worker fails to construct or `postMessage` throws, it falls
  back to synchronous `computeSync` — expect this fallback path when testing in environments without
  Worker support.
- `src/pages/Index.tsx` composes the page: fixed `ExecutiveSummary` always visible, then four lazy-loaded
  tabs (`overview` → `ChartsSection`, `hiring` → `HiringTimeline`, `details` → `MonthlyTable` +
  `MonthlyAuditPanel`, `ai` → `MetricAnalyzer`).

### AI feature (`MetricAnalyzer.tsx`, `src/lib/ai.ts`)

A chat/audit panel that calls either Gemini (`askGemini`, `@google/generative-ai`, direct browser call)
or Qwen via Alibaba DashScope (`askQwen`, `fetch` to a compatible-mode endpoint). In dev, DashScope
calls are routed through the Vite proxy (`/api/dashscope`) configured in `vite.config.ts` to avoid CORS;
in prod they hit the DashScope URL directly. Requires `VITE_GEMINI_API_KEY` and/or
`VITE_DASHSCOPE_API_KEY` in `.env` — `ModelSelector.tsx` disables whichever provider has no key set.

### UI layer

`src/components/ui/` is the generated shadcn/ui primitive set; only a subset is actually wired into
`src/components/ops/*` and `src/pages/*` (the rest is unused scaffolding from the original template —
don't assume every file there is live before checking imports). Styling is Tailwind with semantic
design tokens (see `tailwind.config.ts` / `src/index.css`), not ad hoc utility soup.

### Testing

Vitest + jsdom + Testing Library. Tests live in two places: colocated engine tests
(`src/features/ops-planning/*.test.ts`) and a larger suite plus component tests under `src/test/`
(`src/test/calculator.test.ts` is the ~1100-line, 72-case suite covering ramp-up, lead time, turnover,
growth modes, AI deflection, and edge cases — check it before changing projection math, since it's the
main regression net for `calculator.ts`).
