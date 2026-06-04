# RFC-001: Frontend Module Architecture

**Status:** DRAFT — synced to repo state at commit `cd48a23` and to the submitted Project Confirmation; ready for team review
**Author:** Sanjeet Khangura (Frontend Lead)
**Date:** 2026-06-04
**Reviewers:** Chloe Chang, Kumardeep Singh, James Sinclair
**Related:** `docs/Project Confirmation.pdf` (binding submission for INFO 4290 S50), repo `README.md`, professor's rubric feedback (9.5/10)

---

## 1. Context

The Real-Time Transit System has four modules. Their canonical names from the submitted Project Confirmation (Figure 4, Component Diagram):
- **APIService** (`api/`, Go using Gin) — the public HTTP API
- **DataIngestService** (`ingest/`, Python using Pandas) — GTFS-RT polling and persistence
- **RealtimePredictor** / Model Training (`ml/`, Python using Pandas + scikit-learn) — stretch goal per prof
- **ProgressiveWebApp** (`frontend/`, Next.js + TypeScript) — the dashboard this RFC covers

This RFC commits the ProgressiveWebApp module to a concrete architecture, dependency set, project layout, and milestone sequence.

**Current state (commit `cd48a23`)** — the team has scaffolded the frontend with `create-next-app` (Next.js 16 + React 19 + Tailwind v4 + TypeScript + ESLint 9, with React Compiler enabled in `next.config.ts`). This RFC accepts those choices as input and documents the conventions, missing dependencies, and remaining setup tasks needed to start feature work.

**Submitted Project Confirmation (May 18, 2026)** is the binding scope/stack document for INFO 4290 S50. Key inputs from it:
- Frontend explicitly labeled a **Progressive Web App** in the Deployment Diagram (Figure 5)
- Container platform: **Docker Engine** (Figure 5)
- Container orchestration: **Kubernetes** — demoted to stretch by the prof
- Hosting: local server, fall back to Google Cloud
- A CDN is listed as optional for static assets

**Professor feedback (2026-06-04)** re-scoped the project into three tiers — core, secondary, stretch. This RFC reflects that re-scope. Admin UI is cut from v1. ML predictions are stretch but the UI is built to accept them gracefully. Historical reliability, schedule adherence, and bus bunching detection are secondary. K8s is stretch.

## 2. Goals & Non-Goals

**Goals**
- Lock the frontend project structure and conventions
- Propose the API surface from the UI's perspective so the Go lead has a concrete starting point
- Establish patterns for components, state, data fetching, styling, and types
- Define the CI hook so frontend changes are gated by lint + type-check + tests
- Sequence the work into milestones aligned with the prof's core / secondary / stretch tiers
- List the finishing tasks needed to complete M0 (config tightening + dependency installation)

**Non-Goals**
- Backend, database, or ML implementation decisions
- Final visual design polish
- Production hardening beyond the report's stated NFRs

## 3. Scope — Tiered per Professor Feedback

### Tier 1 — CORE (must ship for v1)
- **Route List page** — search, filter, saved routes, per-route status icons (Figure 4-1 of the master spec)
- **Route Details page (thin)** — route header, health rating (5-star), live map of bus positions

### Tier 2 — SECONDARY (build only after core ships)
- **AdherenceTable** — scheduled arrival times per stop (predicted column built null-safe — see Tier 3)
- **AlertBanner** — bus bunching alerts on Route Details
- **ReliabilityChart** — historical reliability line graph

### Tier 3 — STRETCH (only if time at the very end)
- **Predicted arrival times** — populate predicted column once ML serves data
- **Admin UI** — login, ingestion status, logs, threshold tuning, retrain/reprocess. Currently cut from v1; only re-enters if core + secondary done.

### Out of scope (will not build, frontend module)
- SSE / WebSocket push (polling-only)
- Multi-agency support
- Route comparison views
- Dark mode (Tailwind v4 default dark-mode media query is fine if it falls out for free, but not a goal)
- i18n
- Playwright e2e
- Visual regression

## 4. Required API Surface (proposal to Go lead)

Endpoint sketches from the UI's perspective. Backend RFC will refine response shapes.

### Tier 1 — CORE endpoints (must exist)
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes` | List all routes for the Route List, with status icon | 60s |
| `GET` | `/api/routes/:id` | Route header bundle: name, health score, basic metadata | 30s |
| `GET` | `/api/routes/:id/live` | Current bus positions for the live map | 15s |

### Tier 2 — SECONDARY endpoints
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes/:id/stops` | Stops + scheduled arrival times (predicted may be `null`) | 30s |
| `GET` | `/api/routes/:id/alerts` | Active alerts (bus bunching, delays). Could be folded into `/routes/:id` | 30s |
| `GET` | `/api/routes/:id/history?from=&to=&bucket=hour` | Historical reliability for the chart | One-shot |

### Tier 3 — STRETCH endpoints
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes/:id/predictions` | Predicted arrival times. Could be folded into the stops endpoint with `predicted: null` until ML lands | 30s |

### Polling cadence rationale
- Live bus positions @ 15s — matches the 60s "live updates" NFR with margin
- Route header / stops / alerts @ 30s — aligned with ingest cycle
- Route list @ 60s — status icons change slowly

### Coordination requirement
The Go API uses **Gin** (per the submitted Project Confirmation). Gin does **not** auto-generate OpenAPI like FastAPI/huma do — the API team must add a separate OpenAPI tool. Recommended options:
- `swaggo/swag` — generates OpenAPI 2.0 from Go comments on handlers (most common Gin pattern)
- `huma/v2` — supports Gin as a router and emits OpenAPI 3.x natively (cleaner if the API team is willing)
- Hand-maintained `openapi.yaml` checked into the repo

Whichever the API team picks, an `/openapi.json` (or equivalent) endpoint must exist by the time M1 starts so `openapi-typescript` can generate `types/api.ts`. If the OpenAPI doc isn't ready when M1 starts, the frontend hand-writes a sketch and regenerates in M4 against the real one.

## 5. Project Structure

```
frontend/                       (current state on commit cd48a23)
  app/
    favicon.ico
    globals.css                 # Tailwind v4 imports + @theme tokens + dark-mode media query
    layout.tsx                  # Root layout, Geist fonts
    page.tsx                    # Currently default Next.js welcome; replaced in M2
  public/                       # default create-next-app SVGs (cleaned in M2)
  eslint.config.mjs             # current is too permissive — see M0.5
  next.config.ts                # reactCompiler enabled; output:"standalone" pending Docker decision
  package.json                  # deps installed: next, react, tailwindcss v4, eslint 9, typescript 5
  postcss.config.mjs
  tsconfig.json                 # current is too loose — see M0.5
  README.md
  RFC.md                        # this document

planned additions (M0.5 → M3+):
  app/
    routes/[id]/page.tsx        # Route Details (M3)
  components/
    ui/                         # Pure presentational: Button, Badge, Card, StatusIcon, Skeleton, ErrorPanel, EmptyState
    routes/                     # Domain: RouteList, RouteCard, RouteMap, AdherenceTable, ReliabilityChart, AlertBanner
    layout/                     # Header, ErrorBoundary
  lib/
    api/
      client.ts                 # typed fetch wrapper
      polling.ts                # usePolling hook
    utils/                      # cn(), formatters, status mapping
  types/
    api.ts                      # generated from Go's /openapi.json (do not edit)
    domain.ts                   # hand-written UI-only types
  tests/
    unit/                       # Vitest
  .prettierrc                   # added in M0.5
  Dockerfile                    # pending Docker decision
```

*Note: Tailwind v4 uses CSS-first config — there is no `tailwind.config.ts` file. Theme tokens (status colors, custom spacing) are declared in `app/globals.css` via `@theme inline { ... }` blocks. The existing scaffold uses this pattern already.*

## 6. Dependencies

### Already installed (locked by team scaffold at commit cd48a23)
- `next@16.2.6`
- `react@19.2.4`, `react-dom@19.2.4`
- `typescript@^5`
- `tailwindcss@^4`, `@tailwindcss/postcss@^4`
- `eslint@^9`, `eslint-config-next@16.2.6`
- `babel-plugin-react-compiler@1.0.0` (React Compiler enabled via `next.config.ts`)
- `@types/node`, `@types/react`, `@types/react-dom`

### To install in M0.5 (finishing tasks)

**Runtime**
- `leaflet`, `react-leaflet`, `@types/leaflet` — map
- `recharts` — charts
- `clsx` — class composition
- `date-fns` — timezone-safe formatting
- PWA tooling — `serwist` + `@serwist/next` (or `next-pwa` if it has Next 16 + App Router support by then). Picks a service-worker library compatible with Next 16 + App Router. M0.5 implementation chooses the actual library

**Dev**
- `eslint-plugin-jsx-a11y` + a11y rule wiring in `eslint.config.mjs`
- `prettier`, `prettier-plugin-tailwindcss`
- `openapi-typescript` (CLI)
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `jest-axe`

**Explicitly not installed:** SWR, TanStack Query, Redux/Zustand, styled-components/emotion, Mapbox.

### React Compiler note
With React Compiler enabled, `useMemo` / `useCallback` / `React.memo` are mostly unnecessary — the compiler auto-memoizes. Default to *not* hand-memoizing; only reach for the hooks when you have a measured reason.

## 7. Component Architecture

Rule of thumb:
- **`components/ui/`** — renders only props it received. No data fetching, no hooks beyond `useState`. Reusable across the app.
- **`components/routes/`** — domain containers. Use hooks from `lib/api/` to fetch data. Compose UI components for rendering.
- **`app/`** — page entry points. Compose containers + layout, handle URL params.
- **`lib/utils/`** — pure functions (status mapping, formatters). Never imports React.

Domain logic (e.g. "given a route's adherence stats, what status icon to show") lives in `lib/utils/`, never inside components.

## 8. Data Fetching & State

Per the locked stack: plain `fetch` + `useEffect` + `setInterval`. One shared hook to keep this DRY:

```ts
// lib/api/polling.ts
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[]
): { data: T | null; error: Error | null; loading: boolean; refresh: () => void };
```

Containers use `usePolling` for live data and bare `fetch` (with `useEffect`) for one-shot loads.

### State boundaries
- **Server state** — polling hooks, component-local
- **Client state** — React hooks (`useState`/`useReducer`); no global store
- **URL state** — Next.js router params (preferred over component state for shareable URLs)

### Loading / error / empty
Every container handles all three. Pattern:

```tsx
if (loading) return <RouteListSkeleton />;
if (error) return <ErrorPanel error={error} onRetry={refresh} />;
if (data.routes.length === 0) return <EmptyState ... />;
return <RouteList routes={data.routes} />;
```

### Null-safe rendering for Tier 3 fields
`AdherenceTable`'s predicted column reads `stop.predictedArrival`. When `null` (ML not serving yet), the cell renders `—`. No code change needed when ML lands — the column starts populating automatically.

## 9. Type Strategy

Current `tsconfig.json` has `strict: true` but is otherwise loose. **M0.5 will tighten it to:**
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- `allowJs: false` (currently `true` — flip to ban JS files entirely)

Other rules:
- ESLint: `@typescript-eslint/no-explicit-any` set to **error** (M0.5 will add the rule)
- API types generated from Go's `/openapi.json` via `openapi-typescript`, output to `types/api.ts`, regenerated by `npm run gen:api`
- Domain types not in the API in `types/domain.ts`
- Component prop types: explicit interfaces when reused, inferred when local

## 10. Styling Conventions

Tailwind v4 uses CSS-first config — theme tokens live in `app/globals.css`, not a JS file.

- Tailwind v4 only — no CSS Modules, no styled-components, no emotion
- Class composition via `clsx()` from `lib/utils/cn.ts`
- Theme tokens (colors, spacing, breakpoints, status colors) declared in `app/globals.css` via `@theme inline { ... }`; no inline hex colors in components
- Mobile-first, minimum supported width 360px (NFR 2.2.4.2)
- Status colors mapped semantically — added to `globals.css` in M0.5:
  ```css
  :root {
    --status-clear: #16a34a;     /* green */
    --status-warning: #ca8a04;   /* amber */
    --status-issue: #dc2626;     /* red */
  }
  @theme inline {
    --color-status-clear: var(--status-clear);
    --color-status-warning: var(--status-warning);
    --color-status-issue: var(--status-issue);
  }
  ```
- Accessibility target: **WCAG 2.1 AA**, enforced by `eslint-plugin-jsx-a11y` (added in M0.5)

## 11. Testing Strategy

### v1
- Vitest + React Testing Library for unit tests
- Coverage target: **60%+ on `lib/`**, no minimum on `components/` (visual review covers them)
- One smoke test per page
- A11y assertions via `@testing-library/jest-dom` + `jest-axe`

### v2+
- Playwright for end-to-end
- Visual regression (deferred)

## 12. CI Integration

GitHub Actions workflow `.github/workflows/frontend.yml` (added in M0.5):
- Triggers on changes under `frontend/**` (PR + push to `main`)
- Steps: checkout → setup Node LTS → `npm ci` (cached) → `npm run lint` → `npm run type-check` → `npm run test` → `npm run build`
- Note: `infra/ci/` exists as a stretch-goal placeholder — our GH Actions workflow is the actual CI for v1

## 13. Build & Deploy

**Docker is locked** per the submitted Project Confirmation Figure 5 (Docker Engine is the container platform). K8s for orchestration is a stretch goal per prof; the frontend's deploy artefact is the same regardless (one Docker image).

- `next.config.ts` → add `output: "standalone"` in M0.5
- `frontend/Dockerfile` produces a single image (M0.5 deliverable)
- The image runs on the user's local server as primary host (per submitted form); falls back to a Google Cloud Compute Engine VM if the local server is unavailable
- If K8s stretch is undertaken later, the same image deploys as a `Deployment` resource — no frontend code change needed

The image build also produces the PWA artefacts (manifest, icons, service worker) baked into `.next/static`. The optional CDN noted in Figure 5 can serve those static assets without changing the runtime container.

## 14. Implementation Milestones

Restructured to align with the prof's core/secondary/stretch tiers, and to reflect that the team has already done most of M0.

### Overview
| ID | Tier | Goal | Est. | Status |
|---|---|---|---|---|
| **M0** | Core | Scaffold + initial toolchain | 1–2d | **DONE by team** (commit `cd48a23`) |
| **M0.5** | Core | Finishing tasks: tighten config, install missing deps, add CI workflow | 1–2d | TODO |
| **M1** | Core | Shared infra: API client, polling hook, UI primitives, mocks | 2–3d | TODO (after M0.5) |
| **M2** | Core | Route List page end-to-end against mocks | 2–3d | TODO |
| **M3** | Core | Route Details *thin* (header + health + live map) | 2–3d | TODO (parallel with M2) |
| **M4** | Core | Integration with real Go API for core endpoints; a11y/perf pass | 2–3d | TODO |
| **M5** | Secondary | AdherenceTable + AlertBanner + ReliabilityChart | 3–5d | TODO |
| **M6** | Stretch | Predicted-time wiring + (if time) admin UI | flex | Stretch |

Total estimate (core only, M0.5 → M4): **8–13 days solo**, **~6–9 days with M2/M3 parallel**.

---

### M0 — Scaffold *(Core)* — DONE by team
The team scaffolded the project at commit `cd48a23`. Already done:
- `create-next-app` with TS, Tailwind v4, ESLint, App Router
- React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- Geist Sans + Mono fonts wired into root layout
- Initial `globals.css` with light/dark CSS variables

### M0.5 — Foundation Finishing Tasks *(Core)*
**Goal:** Bring the scaffold up to the standards needed for feature work; satisfy the PWA + Docker commitments from the submitted form.

**Deliverables**
- Update `tsconfig.json`:
  - Add `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`
  - Set `allowJs: false`
- Update `eslint.config.mjs`:
  - Add `eslint-plugin-jsx-a11y` rules
  - Add `@typescript-eslint/no-explicit-any: error`
  - Add no-unused-vars / consistent-return rules to taste
- Add `.prettierrc` + `prettier-plugin-tailwindcss`
- Add status color tokens to `app/globals.css` (see Section 10)
- Install missing runtime deps: `leaflet`, `react-leaflet`, `@types/leaflet`, `recharts`, `clsx`, `date-fns`
- Install missing dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `jest-axe`, `openapi-typescript`, `eslint-plugin-jsx-a11y`, `prettier`, `prettier-plugin-tailwindcss`
- **PWA setup:**
  - `public/manifest.json` with app name, short name, theme color (matches Tailwind status palette), background color, display mode (`standalone`), icons (192px + 512px PNG, maskable + any)
  - PWA icons (192px and 512px PNG) in `public/icons/`
  - Service worker via `serwist` (or current Next 16 + App Router compatible alternative) — caches the app shell + static assets; network-first for API calls
  - PWA meta tags in `app/layout.tsx` (`theme-color`, `apple-mobile-web-app-capable`, viewport)
  - Lighthouse PWA audit passes ("Installable" + "PWA Optimized")
- **Docker setup:**
  - `frontend/Dockerfile` — multi-stage build, final image runs `node server.js`
  - `next.config.ts` → set `output: "standalone"`
  - Verify image builds and runs locally
- Add `npm run` scripts: `type-check`, `test`, `format`, `gen:api`
- Add Vitest config + a single passing smoke test
- Add `.github/workflows/frontend.yml` (lint, type-check, test, build, optionally docker build)
- Replace default Next.js welcome page with a minimal placeholder linking to the Route List route (M2 stub)
- Delete unused create-next-app SVGs (`public/file.svg`, `public/globe.svg`, etc.)

**Acceptance**
- CI green on PR
- `npm run lint`, `npm run type-check`, `npm run test`, `npm run build` all pass locally
- `docker build -t realtimetransit-frontend .` succeeds; container runs and serves the placeholder page
- Lighthouse a11y >= 90 on the placeholder page
- Lighthouse PWA audit passes "Installable"

---

### M1 — Shared Infrastructure *(Core)*
**Goal:** Cross-cutting code in place so M2/M3 can be built from primitives.

**Deliverables**
- `lib/api/client.ts` — typed fetch wrapper (error normalization)
- `lib/api/polling.ts` — `usePolling<T>` hook
- `lib/utils/status.ts` — adherence score → status enum → color/icon
- `lib/utils/format.ts` — time, distance, duration formatters (`date-fns`)
- `lib/utils/cn.ts` — clsx wrapper
- `types/api.ts` — generated from sketch OpenAPI (co-drafted with Go lead) or hand-written interim
- `types/domain.ts` — `StatusLevel`, `AlertSeverity`
- `components/ui/` primitives: `Button`, `Card`, `Badge`, `StatusIcon`, `Skeleton`, `ErrorPanel`, `EmptyState`, `Spinner`
- `components/layout/` — `Header`, `ErrorBoundary`
- Mock API server (MSW or fixture file) so M2/M3 don't block on backend

**Acceptance**
- Every UI primitive has at least one Vitest test
- `usePolling` tested with fake timers
- Mock API serves `/api/routes`, `/api/routes/:id`, `/api/routes/:id/live`

---

### M2 — Route List Page *(Core)*
**Goal:** Figure 4-1 implemented end-to-end against mocks.

**Deliverables**
- `app/page.tsx` replaces the placeholder
- `components/routes/RouteList.tsx`, `RouteCard.tsx`, `RouteSearch.tsx`, `RouteFilters.tsx`
- `components/routes/SavedRoutes.tsx` *(storage mechanism deferred — see Section 15 Q8)*
- `app/page.test.tsx` — smoke test

**Acceptance**
- All Figure 4-1 elements render
- Search/filter update URL params and visible list
- Saved routes persist across reloads
- Status icons render correctly for clear/warning/issue
- Loading/error/empty states implemented
- 360px responsive QA passes

---

### M3 — Route Details (Thin) *(Core)*
**Goal:** Minimum-viable Route Details — header, health, live map.

**Deliverables**
- `app/routes/[id]/page.tsx`
- `components/routes/RouteHeader.tsx` — route name + 5-star health
- `components/routes/RouteMap.tsx` — Leaflet with bus markers colored by status, polyline, auto-fit bounds
- Polling: 15s for `/live`, 30s for `/routes/:id`
- Map color mapping unit tests + page smoke test

**Acceptance**
- Page loads with name, health, and live map
- Live map updates every 15s with mock data
- Map renders at 360px without overflow
- A11y: map has `aria-label`
- Explicitly OUT of this milestone: adherence table, alert banner, reliability chart (those are M5)

---

### M4 — Core Integration + Polish *(Core)*
**Goal:** Wire core pages to the real Go API; ship a usable v1 demo.

**Deliverables**
- Regenerate `types/api.ts` from real Go `/openapi.json` (core endpoints only)
- Replace core mocks with real API calls
- Responsive QA at 360, 768, 1024
- axe + Lighthouse pass on Route List + Route Details thin
- `frontend/README.md` updated with run/test/deploy instructions

**Acceptance**
- Core pages work against real Go API
- CI green
- Lighthouse >= 90 on perf + a11y + best practices for core pages

---

### M5 — Secondary Features *(Secondary — only after M4 ships)*
**Goal:** Add historical reliability, schedule adherence, bus bunching to Route Details.

**Deliverables**
- `components/routes/AdherenceTable.tsx` — scheduled + predicted columns (predicted null-safe)
- `components/routes/AlertBanner.tsx` — bus bunching alerts
- `components/routes/ReliabilityChart.tsx` — Recharts historical line chart (hour-of-day × deviation)
- Route Details renders the three secondary components below the live map
- Polling: 30s for `/routes/:id/stops`, `/routes/:id/alerts`; one-shot for `/history`

**Acceptance**
- Adherence table renders with scheduled times; predicted column shows `—` for nulls
- Alert banner shows bunching detection from API
- Reliability chart shows historical deviation by hour
- All elements responsive at 360px
- All elements pass a11y audit

---

### M6 — Stretch Features *(Stretch — only if all of M0.5–M5 done)*

**Priority order**
1. **Predicted-time data wiring** — once ML serves predictions, the `AdherenceTable` predicted column populates automatically. Minimal frontend change.
2. **Admin UI** (only if time after #1) — login, ingestion status, logs, thresholds, retrain/reprocess. Adds `app/admin/`, `components/admin/`, `lib/auth/`.

---

## 15. Open Questions

### Resolved (see Decisions Log)
1. ~~Admin UI in v1?~~ — Cut from v1; only stretch.
2. ~~Map tile provider~~ — OSM only.
3. ~~Browser support matrix~~ — Evergreen Chrome/Firefox/Edge + iOS Safari last 2.
4. ~~Accessibility level~~ — WCAG 2.1 AA.
5. ~~i18n~~ — Deferred to v2, English-only.
6. ~~Predicted arrival times in UI~~ — Build column null-safe; populates when ML lands.
7. ~~Route Details thin scope~~ — Header + health + live map only in core (M3).
9. ~~Docker decision~~ — Locked. Docker Engine confirmed by Project Confirmation Figure 5.
12. ~~PWA approach~~ — Full PWA in M0.5 (manifest + icons + service worker).

### Still open
8. **Saved routes — backend or localStorage?** — Deferred. Revisit at M2 kickoff. Default proposal: localStorage only (no PII, no accounts).

### Coordination items (not user decisions)
10. **OpenAPI availability via Gin** — Project Confirmation locks Go + Gin. Gin doesn't auto-generate OpenAPI; the API team must pick a tool (`swaggo/swag`, `huma/v2`, or hand-maintained). Required by M1 start; otherwise frontend hand-writes a sketch and regenerates in M4.
11. **K8s status with prof** — submitted form had K8s as primary container management; prof's feedback demoted it to stretch. `infra/k8s/` exists. Frontend deploys the same Docker image whether or not the K8s stretch is undertaken — no frontend code change required.

### Notes on repo state (not RFC decisions)
- The original `docs/INFO 4190 - Final Report.pdf` was deleted from the repo by the team. The team must have a working copy elsewhere — confirm before M1 starts since this RFC references it as background context.
- `docs/Project Confirmation.pdf` is the binding submitted form; tracked publicly.

## 16. Out of Scope (will not build, frontend module)

- SSE / WebSocket push updates (polling-only)
- Playwright e2e
- Visual regression
- Multi-agency support
- Saved-route notifications
- Route comparison views
- Explicit dark-mode design (Tailwind default media query stays as scaffolded but no design effort)
- i18n
- Kubernetes deployment (lives in `infra/k8s/` as stretch — owned by infra, not frontend)

## 17. Decisions Log

| Date | Decision | Driver |
|---|---|---|
| 2026-06-04 | Stack locked: Next.js 16 + React 19 + Tailwind v4 + ESLint 9 + React Compiler | Team scaffold (commit `cd48a23`) |
| 2026-06-04 | No SWR, no TanStack — plain `fetch` + `setInterval` | Supply-chain concern |
| 2026-06-04 | Polling cadences: 60s (list) / 30s (details) / 15s (live map) | This RFC |
| 2026-06-04 | Strict TS + no `any` + ESLint a11y enforced (added in M0.5) | LEARN.md + WCAG target |
| 2026-06-04 | Map tiles: OSM only | Team decision |
| 2026-06-04 | Browser support: evergreen Chrome/Firefox/Edge + iOS Safari last 2 | Team decision |
| 2026-06-04 | Accessibility: WCAG 2.1 AA via `eslint-plugin-jsx-a11y` + axe | Team decision |
| 2026-06-04 | i18n deferred to v2; v1 English-only | Team decision |
| 2026-06-04 | Saved routes storage: **DEFERRED** until M2 kickoff | Needs more thought |
| 2026-06-04 | Scope re-cut into core/secondary/stretch per prof feedback | Prof feedback 9.5/10 |
| 2026-06-04 | Admin UI cut from v1; only re-enters as Tier 3 stretch | Prof did not list admin in any tier |
| 2026-06-04 | Route Details thin in core (M3): header + health + live map only | Prof feedback — "basic route status display" |
| 2026-06-04 | AdherenceTable / AlertBanner / ReliabilityChart moved to M5 (secondary) | Prof tiered them as secondary |
| 2026-06-04 | Predicted times — column built null-safe in M5; populates from ML in M6 stretch | Prof tiered ML as stretch |
| 2026-06-04 | **Docker locked** — Docker Engine confirmed by Project Confirmation Figure 5 | Submitted form |
| 2026-06-04 | Milestones restructured: M0 done by team; M0.5 added for finishing tasks; M0.5 → M6 owned by frontend lead | Aligns with prof tiers + reflects existing scaffold |
| 2026-06-04 | Tailwind v4 CSS-first config (no `tailwind.config.ts`); status tokens in `app/globals.css` | Tailwind v4 + team scaffold pattern |
| 2026-06-04 | React Compiler stays enabled; avoid manual `useMemo`/`useCallback` unless measured | Team scaffold choice |
| 2026-06-04 | **Full PWA in M0.5** — manifest + icons + service worker via `serwist` (or Next 16 + App Router compatible alternative) | Project Confirmation Figure 5 labels the dashboard as PWA |
| 2026-06-04 | Go API uses Gin framework (per submitted form); OpenAPI generation requires a separate tool (`swaggo/swag` recommended) | Project Confirmation Tech Stack |
| 2026-06-04 | K8s status: stretch (prof demoted from submitted "primary"); frontend deploy artefact unchanged | Prof feedback |
| 2026-06-04 | Canonical module names from Component Diagram (Figure 4): APIService, DataIngestService, RealtimePredictor, ProgressiveWebApp | Submitted form alignment |
