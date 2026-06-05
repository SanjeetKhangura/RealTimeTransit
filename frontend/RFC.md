# RFC-001: Frontend Module Architecture

- **Status:** DRAFT. Synced to `main` @ `cd48a23` (frontend scaffold landed in `5d87d84`) and to the submitted Project Confirmation. Ready for team review.
- **Author:** Sanjeet Khangura (Frontend Lead)
- **Date:** 2026-06-04 (revised 2026-06-05 after PR #1 review)
- **Reviewers:** Chloe Chang, Kumardeep Singh, James Sinclair
- **Related:** `docs/Project Confirmation.pdf` (our submitted plan for INFO 4290 S50; initial, may change), repo `README.md`, professor's rubric feedback (9.5/10)

---

## 1. Context

The Real-Time Transit System has four modules. Their canonical names from the submitted Project Confirmation (Figure 4, Component Diagram):
- **APIService** (`api/`, Go): the public HTTP API
- **DataIngestService** (`ingest/`, Python using Pandas): GTFS-RT polling and persistence
- **RealtimePredictor** / Model Training (`ml/`, Python using Pandas + scikit-learn): stretch goal per prof
- **ProgressiveWebApp** (`frontend/`, Next.js + TypeScript): the dashboard this RFC covers

This RFC commits the ProgressiveWebApp module to a concrete architecture, dependency set, project layout, and milestone sequence.

**Current state (frontend scaffold at commit `5d87d84`; synced against `main` @ `cd48a23`):** the team has scaffolded the frontend with `create-next-app` (Next.js 16 + React 19 + Tailwind v4 + TypeScript + ESLint 9, with React Compiler enabled in `next.config.ts`). This RFC accepts those choices as input and documents the conventions, missing dependencies, and remaining setup tasks needed to start feature work.

**Submitted Project Confirmation (May 18, 2026)** is our submitted scope/stack plan for INFO 4290 S50. It represents our initial plan and may change as the project evolves. Key inputs from it:
- Frontend explicitly labeled a **Progressive Web App** in the Deployment Diagram (Figure 5)
- Container platform listed as **Docker Engine** (Figure 5)
- Container orchestration listed as **Kubernetes**, since demoted to stretch by the prof
- Hosting: local server, fall back to Google Cloud
- A CDN is listed as optional for static assets

**Professor feedback (2026-06-04)** re-scoped the project into three tiers: core, secondary, and stretch. This RFC reflects that re-scope. Admin UI is cut from v1. ML predictions are stretch but the UI is built to accept them gracefully. Historical reliability, schedule adherence, and bus bunching detection are secondary. K8s is stretch.

### Where the database fits
The persistence layer is **PostgreSQL + TimescaleDB + PostGIS** (`infra/db/schema-0.0.1.sql`). The frontend has **zero direct database access**: every read goes through the Go **APIService** over HTTP/JSON. The flow is one-directional from the UI's perspective:

```
DataIngestService (Python) ─writes─┐
RealtimePredictor (Python) ─writes─┤
                                   ▼
                    PostgreSQL + TimescaleDB + PostGIS
                                   ▲
                            reads  │
                                   │
                        APIService (Go)
                                   ▲
                          HTTP/JSON│  (this is the only boundary the frontend sees)
                                   │
                        ProgressiveWebApp (this RFC)
```

This matters for the frontend in two concrete ways:
1. **The DB schema is the source of truth for response shapes.** The API contract (and therefore `types/api.ts`) should mirror the realtime tables the ingest worker populates: `vehicle_positions` (live map), `trip_updates.arrival_delay` (adherence), and `service_alerts` (alert banner). When the API team designs response DTOs, the field names and nullability should trace back to these columns so the UI isn't guessing.
2. **Polling cadences are bounded by ingest cadence, not by the UI.** The data the API serves is only as fresh as the last ingest write to the hypertables. Our polling intervals (Section 4) are set at or slightly above the ingest cycle, since polling faster than the ingest worker writes would just re-fetch identical rows.

The schema-to-UI mapping by milestone is documented in Section 4.

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

## 3. Scope: Tiered per Professor Feedback

### Tier 1: CORE (must ship for v1)
- **Route List page**: search, filter, saved routes, per-route status icons (Figure 4-1 of the master spec)
- **Route Details page (thin)**: route header, health rating (5-star), live map of bus positions, a **realtime-status indicator** (shows "showing scheduled data" when the realtime feed is stale, satisfying the resilience requirement), and an accessible **text-equivalent bus list** as the screen-reader representation of the map

### Tier 2: SECONDARY (build only after core ships)
- **AdherenceTable**: scheduled arrival times per stop (predicted column built null-safe; see Tier 3)
- **AlertBanner**: bus bunching alerts on Route Details
- **ReliabilityChart**: historical reliability line graph

### Tier 3: STRETCH (only if time at the very end)
- **Predicted arrival times**: populate predicted column once ML serves data
- **Admin UI**: login, ingestion status, logs, threshold tuning, retrain/reprocess. Currently cut from v1; only re-enters if core + secondary done.

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

### Tier 1: CORE endpoints (must exist)
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes` | List all routes for the Route List, with status icon | 60s |
| `GET` | `/api/routes/:id` | Route header bundle: name, health score, basic metadata | 30s |
| `GET` | `/api/routes/:id/live` | Current bus positions for the live map | 15s |

### Tier 2: SECONDARY endpoints
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes/:id/stops` | Stops + scheduled arrival times (predicted may be `null`) | 30s |
| `GET` | `/api/routes/:id/alerts` | Active alerts (bus bunching, delays). Could be folded into `/routes/:id` | 30s |
| `GET` | `/api/routes/:id/history?from=&to=&bucket=hour` | Historical reliability for the chart | One-shot |

### Tier 3: STRETCH endpoints
| Method | Path | Purpose | Polled? |
|---|---|---|---|
| `GET` | `/api/routes/:id/predictions` | Predicted arrival times. Could be folded into the stops endpoint with `predicted: null` until ML lands | 30s |

### Polling cadence rationale
- Live bus positions @ 15s: matches the 60s "live updates" NFR with margin
- Route header / stops / alerts @ 30s: aligned with ingest cycle
- Route list @ 60s: status icons change slowly

### Schema alignment (callout to API team)
The endpoints above should hydrate directly from the existing DB schema (`infra/db/schema-0.0.1.sql`). The expected source table per endpoint:

| Endpoint | Source table(s) | Key columns the UI needs |
|---|---|---|
| `/api/routes` | `routes` | `route_id`, `route_short_name`, `route_long_name`, `route_type` |
| `/api/routes/:id/live` | `vehicle_positions` (hypertable) | latest row per `vehicle_id`: `lat`, `lon`, `bearing`, `current_status`, `stop_id` |
| `/api/routes/:id/stops` | `stops` + `trip_updates` | `stops.stop_id`/name; `trip_updates.arrival_time`, `arrival_delay` |
| `/api/routes/:id/alerts` | `service_alerts` (hypertable) | `cause`, `effect`, `header_text`, `description_text`, `start_time`, `end_time` |
| `/api/routes/:id/history` | `trip_updates` (time-bucketed) | `arrival_delay` aggregated by hour via Timescale `time_bucket()` |

Two contract requirements that fall out of the schema:
- **Nullability must be preserved across the wire.** `trip_updates.arrival_delay`, `vehicle_positions.bearing`/`speed`, and predicted fields can be absent. The API should emit them as nullable so the UI's null-safe rendering (Section 8) stays correct rather than receiving `0` as a sentinel.
- **Timestamps stay UTC + ISO 8601.** The hypertables key on a `ts` column; all timestamps cross the API as UTC ISO strings and are formatted to the agency timezone (**America/Vancouver**) in the UI via `date-fns` + `@date-fns/tz`. No timezone conversion server-side.
- **Responses carry a freshness / data-source signal.** `/api/routes/:id` and `/api/routes/:id/live` should include the timestamp of the latest underlying `vehicle_positions` row and a `dataSource` flag (`realtime` vs `scheduled`). The UI uses this to drive the M3 realtime-status indicator and to decide when to show "showing scheduled data" (resilience requirement).

### Coordination requirement
The frontend's `types/api.ts` is generated from the API's OpenAPI document, so the API needs to emit one. The submitted Project Confirmation listed Gin, but the API owner is on board with switching to **Huma**, which emits OpenAPI 3.x natively and is the leading choice. That is cleaner for our `openapi-typescript` pipeline than bolting a spec generator onto Gin. The final framework call rests with the API team; the only hard requirement from the frontend's side is a machine-readable OpenAPI doc.

- **Huma** (leading): emits OpenAPI 3.x natively, no extra spec tooling
- If Gin is kept instead: add `swaggo/swag` (OpenAPI 2.0 from handler comments) or hand-maintain an `openapi.yaml`

Whichever the API team picks, an `/openapi.json` (or equivalent) endpoint should exist by the time M1 starts so `openapi-typescript` can generate `types/api.ts`. If the OpenAPI doc isn't ready when M1 starts, the frontend hand-writes a sketch and regenerates in M4 against the real one.

## 5. Project Structure

```
frontend/                       (current state; scaffold at commit 5d87d84)
  app/
    favicon.ico
    globals.css                 # Tailwind v4 imports + @theme tokens + dark-mode media query
    layout.tsx                  # Root layout, Geist fonts
    page.tsx                    # Currently default Next.js welcome; replaced in M2
  public/                       # default create-next-app SVGs (cleaned in M2)
  eslint.config.mjs             # current is too permissive; see M0.5
  next.config.ts                # reactCompiler enabled; output:standalone planned in M0.5
  package.json                  # deps installed: next, react, tailwindcss v4, eslint 9, typescript 5
  postcss.config.mjs
  tsconfig.json                 # current is too loose; see M0.5
  README.md
  RFC.md                        # this document

planned additions (M0.5 → M3+):
  app/
    routes/[id]/page.tsx        # Route Details (M3)
  components/
    ui/                         # Pure presentational: Button, Badge, Card, StatusIcon, Skeleton, Spinner, ErrorPanel, EmptyState, StaleBanner
    routes/                     # Domain: RouteList, RouteCard, RouteMap, RouteMapList, RealtimeStatusIndicator, AdherenceTable, ReliabilityChart, AlertBanner
    layout/                     # Header, ErrorBoundary
  lib/
    api/
      client.ts                 # typed fetch wrapper
      polling.ts                # usePolling hook
    utils/                      # cn(), formatters, status mapping
  types/
    api.ts                      # generated from Go's /openapi.json (do not edit)
    domain.ts                   # hand-written UI-only types
  (unit tests co-located beside source as *.test.ts(x); Vitest, no separate tests/ tree)
  .prettierrc                   # added in M0.5
  Dockerfile                    # optional (see Section 13)
```

*Note: Tailwind v4 uses CSS-first config, so there is no `tailwind.config.ts` file. Theme tokens (status colors, custom spacing) are declared in `app/globals.css` via `@theme inline { ... }` blocks. The existing scaffold uses this pattern already.*

## 6. Dependencies

### Already installed (locked by team scaffold at commit 5d87d84)
- `next@16.2.6`
- `react@19.2.4`, `react-dom@19.2.4`
- `typescript@^5`
- `tailwindcss@^4`, `@tailwindcss/postcss@^4`
- `eslint@^9`, `eslint-config-next@16.2.6`
- `babel-plugin-react-compiler@1.0.0` (React Compiler enabled via `next.config.ts`)
- `@types/node`, `@types/react`, `@types/react-dom`

### To install in M0.5 (finishing tasks)

**Runtime**
- `leaflet`, `react-leaflet@^5`, `@types/leaflet`: map (react-leaflet **v5** required for React 19; v4 is React 18 only)
- `recharts@^3`: charts (**v3** required for React 19 compatibility)
- `clsx`: class composition
- `date-fns` + `@date-fns/tz`: date formatting, fixed to the agency timezone (America/Vancouver); core `date-fns` is not timezone-aware on its own
- PWA tooling, `serwist` + `@serwist/next` (the App Router-compatible service-worker library for Next 16). `next-pwa` is explicitly **not** used: it is effectively unmaintained and lacks App Router support

**Dev**
- `eslint-plugin-jsx-a11y` + a11y rule wiring in `eslint.config.mjs`
- `prettier`, `prettier-plugin-tailwindcss`
- `openapi-typescript` (CLI)
- `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `jest-axe`
- `msw`: mock API at the network layer for tests and for M1-M3 development before the Go backend is ready

**Explicitly not installed:** SWR, TanStack Query, Redux/Zustand, styled-components/emotion, Mapbox, next-pwa.

### React Compiler note
With React Compiler enabled, `useMemo` / `useCallback` / `React.memo` are mostly unnecessary, since the compiler auto-memoizes. Default to *not* hand-memoizing; only reach for the hooks when you have a measured reason.

## 7. Component Architecture

Rule of thumb:
- **`components/ui/`**: renders only props it received. No data fetching, no hooks beyond `useState`. Reusable across the app.
- **`components/routes/`**: domain containers. Use hooks from `lib/api/` to fetch data. Compose UI components for rendering.
- **`app/`**: page entry points. Compose containers + layout, handle URL params.
- **`lib/utils/`**: pure functions (status mapping, formatters). Never imports React.

Domain logic (e.g. "given a route's adherence stats, what status icon to show") lives in `lib/utils/`, never inside components.

## 8. Data Fetching & State

Per the locked stack: plain `fetch` + `useEffect` + `setInterval`. One shared hook to keep this DRY:

```ts
// lib/api/polling.ts
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: unknown[]
): {
  data: T | null;        // retained across transient poll failures (stale-while-error)
  error: Error | null;   // populated on failure; only blocks rendering when there is no usable data
  loading: boolean;      // true only on the initial load
  isStale: boolean;      // true when the last poll failed but `data` is still being shown
  lastUpdated: Date | null;
  refresh: () => void;
};
```

Containers use `usePolling` for live data and bare `fetch` (with `useEffect`) for one-shot loads.

### Polling behavior
- **Stale-while-error:** a failed poll does not discard the last good `data`. The hook keeps showing it, sets `isStale: true`, and exposes `lastUpdated`. A full `ErrorPanel` is shown only on *initial* load failure (no data yet). Containers surface staleness as a non-blocking `StaleBanner` rather than blanking the view. This matters for a 15s-polling dashboard where one transient failure shouldn't wipe the live map.
- **Pause when hidden:** polling pauses while `document.visibilityState === "hidden"` and resumes (with an immediate refresh) on `visibilitychange` back to visible. Avoids hammering the API and draining battery in backgrounded tabs.

### State boundaries
- **Server state**: polling hooks, component-local
- **Client state**: React hooks (`useState`/`useReducer`); no global store
- **URL state**: Next.js router params (preferred over component state for shareable URLs)

### Loading / error / empty
Every container handles all three. Pattern:

```tsx
if (loading) return <RouteListSkeleton />;                  // initial load only
if (error && !data) return <ErrorPanel error={error} onRetry={refresh} />;  // no usable data yet
if (data.routes.length === 0) return <EmptyState ... />;
return (
  <>
    {isStale && <StaleBanner lastUpdated={lastUpdated} onRetry={refresh} />}
    <RouteList routes={data.routes} />
  </>
);
```

### Null-safe rendering for Tier 3 fields
`AdherenceTable`'s predicted column reads `stop.predictedArrival`. When `null` (ML not serving yet), the cell renders `N/A`. No code change is needed when ML lands; the column starts populating automatically.

## 9. Type Strategy

Current `tsconfig.json` has `strict: true` but is otherwise loose. **M0.5 will tighten it to:**
- `noUncheckedIndexedAccess: true`
- `noImplicitOverride: true`
- `exactOptionalPropertyTypes: true`
- `allowJs: false` (currently `true`; flip to ban JS files entirely)

Other rules:
- ESLint: `@typescript-eslint/no-explicit-any` set to **error** (M0.5 will add the rule)
- API types generated from Go's `/openapi.json` via `openapi-typescript`, output to `types/api.ts`, regenerated by `npm run gen:api`
- Heads-up: `openapi-typescript` emits nullable-optional fields as `field?: T | null`. With `exactOptionalPropertyTypes: true`, `undefined` cannot be assigned to such fields, so read them defensively and prefer `?? null`. Expect minor friction in M4 when wiring the real generated types
- Domain types not in the API in `types/domain.ts`
- Component prop types: explicit interfaces when reused, inferred when local

## 10. Styling Conventions

Tailwind v4 uses CSS-first config, so theme tokens live in `app/globals.css`, not a JS file.

- Tailwind v4 only: no CSS Modules, no styled-components, no emotion
- Class composition via `clsx()` from `lib/utils/cn.ts`
- Theme tokens (colors, spacing, breakpoints, status colors) declared in `app/globals.css` via `@theme inline { ... }`; no inline hex colors in components
- Mobile-first, minimum supported width 360px (NFR 2.2.4.2)
- Status colors mapped semantically, added to `globals.css` in M0.5:
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
- Tests co-located beside the file under test (`Foo.tsx` → `Foo.test.tsx`); no separate `tests/` tree
- API calls mocked with **MSW** so component/page tests exercise the real `fetch` path
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
- Note: `infra/ci/` exists as a stretch-goal placeholder; our GH Actions workflow is the actual CI for v1

## 13. Build & Deploy

**Docker is optional, not required for v1.** The submitted Project Confirmation Figure 5 shows Docker Engine, but the infra owner's position is that containerizing has little benefit until the Kubernetes stretch is undertaken, so it is a nice-to-have rather than a gate. Containers stay consistent and reliable across hosts, so we may still dockerize; just be aware the tooling can be painful on Windows. If we skip it, the frontend deploys as a plain Next.js standalone build.

- `next.config.ts`: set `output: "standalone"` in M0.5 (useful with or without Docker; produces a self-contained server build)
- `frontend/Dockerfile`: optional M0.5 deliverable, produces a single image if we choose to containerize
- The build runs on the team's local server as primary host (per submitted form) and falls back to a Google Cloud Compute Engine VM if the local server is unavailable
- If the K8s stretch is undertaken later, the same image deploys as a `Deployment` resource with no frontend code change

The build also produces the PWA artefacts (manifest, icons, service worker) baked into `.next/static`. The optional CDN noted in Figure 5 can serve those static assets without changing the runtime.

## 14. Implementation Milestones

Restructured to align with the prof's core/secondary/stretch tiers, and to reflect that the team has already done most of M0.

### Overview
| ID | Tier | Goal | Est. | Status |
|---|---|---|---|---|
| **M0** | Core | Scaffold + initial toolchain | 1-2d | **DONE by team** (commit `5d87d84`) |
| **M0.5** | Core | Finishing tasks: tighten config, install missing deps, add CI workflow | 1-2d | TODO |
| **M1** | Core | Shared infra: API client, polling hook, UI primitives, mocks | 2-3d | TODO (after M0.5) |
| **M2** | Core | Route List page end-to-end against mocks | 2-3d | TODO |
| **M3** | Core | Route Details *thin* (header + health + live map) | 2-3d | TODO (parallel with M2) |
| **M4** | Core | Integration with real Go API for core endpoints; a11y/perf pass | 2-3d | TODO |
| **M5** | Secondary | AdherenceTable + AlertBanner + ReliabilityChart | 3-5d | TODO |
| **M6** | Stretch | Predicted-time wiring + (if time) admin UI | flex | Stretch |

Total estimate (core only, M0.5 to M4): **8-13 days solo**, **~6-9 days with M2/M3 parallel**.

---

### M0: Scaffold *(Core)* (DONE by team)
The team scaffolded the project at commit `5d87d84`. Already done:
- `create-next-app` with TS, Tailwind v4, ESLint, App Router
- React Compiler enabled (`reactCompiler: true` in `next.config.ts`)
- Geist Sans + Mono fonts wired into root layout
- Initial `globals.css` with light/dark CSS variables

### M0.5: Foundation Finishing Tasks *(Core)*
**Goal:** Bring the scaffold up to the standards needed for feature work and satisfy the PWA commitment from the submitted form (Docker is optional, see Section 13).

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
- Install missing runtime deps: `leaflet`, `react-leaflet@^5`, `@types/leaflet`, `recharts@^3`, `clsx`, `date-fns`, `@date-fns/tz`
- Install missing dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `jest-axe`, `msw`, `openapi-typescript`, `eslint-plugin-jsx-a11y`, `prettier`, `prettier-plugin-tailwindcss`
- **PWA setup:**
  - `public/manifest.json` with app name, short name, theme color (matches Tailwind status palette), background color, display mode (`standalone`), icons (192px + 512px PNG, maskable + any)
  - PWA icons (192px and 512px PNG) in `public/icons/`
  - Service worker via `serwist` + `@serwist/next`: caches the app shell + static assets; network-first for API calls
  - PWA meta tags in `app/layout.tsx` (`theme-color`, `apple-mobile-web-app-capable`, viewport)
  - PWA installability verified manually (Lighthouse dropped its PWA audit category in v12, so there is no PWA audit to run): valid `manifest.json`, service worker registers, and install / "Add to Home Screen" works in Chromium + iOS Safari
- **Docker setup (optional, see Section 13):**
  - `next.config.ts`: set `output: "standalone"` (do this regardless; it produces a self-contained build)
  - Optionally add `frontend/Dockerfile` (multi-stage build, final image runs `node server.js`) and verify it builds and runs locally
- Add `npm run` scripts: `type-check`, `test`, `format`, `gen:api`
- Add Vitest config + a single passing smoke test
- Add `.github/workflows/frontend.yml` (lint, type-check, test, build, optionally docker build)
- Replace default Next.js welcome page with a minimal placeholder linking to the Route List route (M2 stub)
- Delete unused create-next-app SVGs (`public/file.svg`, `public/globe.svg`, etc.)

**Acceptance**
- CI green on PR
- `npm run lint`, `npm run type-check`, `npm run test`, `npm run build` all pass locally
- If dockerizing (optional): `docker build -t realtimetransit-frontend .` succeeds and the container serves the placeholder page; otherwise `npm run build` with `output: "standalone"` produces a runnable server build
- Lighthouse a11y >= 90 on the placeholder page
- PWA installability verified manually: manifest valid, service worker registered, install / Add-to-Home-Screen works (Lighthouse no longer ships a PWA audit)

---

### M1: Shared Infrastructure *(Core)*
**Goal:** Cross-cutting code in place so M2/M3 can be built from primitives.

**Deliverables**
- `lib/api/client.ts`: typed fetch wrapper (error normalization)
- `lib/api/polling.ts`: `usePolling<T>` hook (stale-while-error: retains last data on a failed poll, exposes `isStale`/`lastUpdated`; pauses when the tab is hidden, refreshes on focus)
- `lib/utils/status.ts`: adherence score to status enum to color/icon
- `lib/utils/format.ts`: time, distance, duration formatters (`date-fns` + `@date-fns/tz`, fixed to America/Vancouver)
- `lib/utils/cn.ts`: clsx wrapper
- `types/api.ts`: generated from sketch OpenAPI (co-drafted with Go lead) or hand-written interim
- `types/domain.ts`: `StatusLevel`, `AlertSeverity`
- `components/ui/` primitives: `Button`, `Card`, `Badge`, `StatusIcon`, `Skeleton`, `Spinner`, `ErrorPanel`, `EmptyState`, `StaleBanner`
- `components/layout/`: `Header`, `ErrorBoundary`
- MSW mock API so M2/M3 don't block on backend; handlers for `/api/routes`, `/api/routes/:id`, `/api/routes/:id/live` including failure/latency cases to exercise stale-while-error

**Acceptance**
- Every UI primitive has at least one Vitest test
- `usePolling` tested with fake timers, including stale-while-error (data retained on failure) and pause-on-hidden
- MSW serves `/api/routes`, `/api/routes/:id`, `/api/routes/:id/live`, plus error/latency variants

---

### M2: Route List Page *(Core)*
**Goal:** Figure 4-1 implemented end-to-end against mocks.

**Deliverables**
- `app/page.tsx` replaces the placeholder
- `components/routes/RouteList.tsx`, `RouteCard.tsx`, `RouteSearch.tsx`, `RouteFilters.tsx`
- `components/routes/SavedRoutes.tsx` *(localStorage only, no accounts; see Section 15 Q8)*
- `app/page.test.tsx`: smoke test

**Acceptance**
- All Figure 4-1 elements render
- Search/filter update URL params and visible list
- Saved routes persist across reloads
- Status icons render correctly for clear/warning/issue
- Loading/error/empty states implemented
- 360px responsive QA passes

---

### M3: Route Details (Thin) *(Core)*
**Goal:** Minimum-viable Route Details: header, health, live map.

**Deliverables**
- `app/routes/[id]/page.tsx`
- `components/routes/RouteHeader.tsx`: route name + 5-star health
- `components/routes/RouteMap.tsx`: Leaflet with bus markers colored by status, polyline, auto-fit bounds
- `components/routes/RouteMapList.tsx`: accessible text-equivalent of the map, a list of vehicles (route, current/next stop, status) exposed to screen readers; the map itself is `aria-hidden` and treated as a supplementary visual
- `components/routes/RealtimeStatusIndicator.tsx`: badge driven by the API's `dataSource`/freshness field; shows "Live" vs "Showing scheduled data (realtime unavailable)"
- Times rendered in America/Vancouver via `date-fns` + `@date-fns/tz`
- Polling: 15s for `/live`, 30s for `/routes/:id`; `usePolling` stale-while-error keeps the last positions visible if a poll fails, with a `StaleBanner`
- Map color mapping unit tests + page smoke test + a11y test asserting the text-equivalent list

**Acceptance**
- Page loads with name, health, and live map
- Live map updates every 15s with mock data
- Map renders at 360px without overflow
- A11y: the map is `aria-hidden` and a screen-reader-accessible text-equivalent bus list conveys the same vehicle data (route, stop, status); axe passes
- Realtime-status indicator shows "Live" with fresh data and "Showing scheduled data" when the API reports a stale realtime feed
- A failed `/live` poll keeps the last positions on screen (stale-while-error) and shows a non-blocking stale/reconnecting banner
- Times display in America/Vancouver regardless of viewer timezone
- Explicitly OUT of this milestone: adherence table, alert banner, reliability chart (those are M5)

---

### M4: Core Integration + Polish *(Core)*
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

### M5: Secondary Features *(Secondary, only after M4 ships)*
**Goal:** Add historical reliability, schedule adherence, bus bunching to Route Details.

**Deliverables**
- `components/routes/AdherenceTable.tsx`: scheduled + predicted columns (predicted null-safe)
- `components/routes/AlertBanner.tsx`: bus bunching alerts
- `components/routes/ReliabilityChart.tsx`: Recharts historical line chart (hour-of-day × deviation)
- Route Details renders the three secondary components below the live map
- Polling: 30s for `/routes/:id/stops`, `/routes/:id/alerts`; one-shot for `/history`

**Acceptance**
- Adherence table renders with scheduled times; predicted column shows `N/A` for nulls
- Alert banner shows bunching detection from API
- Reliability chart shows historical deviation by hour
- All elements responsive at 360px
- All elements pass a11y audit

---

### M6: Stretch Features *(Stretch, only if all of M0.5-M5 done)*

**Priority order**
1. **Predicted-time data wiring**: once ML serves predictions, the `AdherenceTable` predicted column populates automatically. Minimal frontend change.
2. **Admin UI** (only if time after #1): login, ingestion status, logs, thresholds, retrain/reprocess. Adds `app/admin/`, `components/admin/`, `lib/auth/`.

---

## 15. Open Questions

### Resolved (see Decisions Log)
1. ~~Admin UI in v1?~~ Cut from v1; only stretch.
2. ~~Map tile provider~~ OSM only.
3. ~~Browser support matrix~~ Evergreen Chrome/Firefox/Edge + iOS Safari last 2.
4. ~~Accessibility level~~ WCAG 2.1 AA.
5. ~~i18n~~ Deferred to v2, English-only.
6. ~~Predicted arrival times in UI~~ Build column null-safe; populates when ML lands.
7. ~~Route Details thin scope~~ Header + health + live map only in core (M3).
8. ~~Saved routes storage~~ localStorage only, no user accounts (no PII, nothing to sync server-side).
9. ~~Docker decision~~ Optional, not required for v1 (see Section 13).
12. ~~PWA approach~~ Full PWA in M0.5 (manifest + icons + service worker).
13. ~~Timezone display~~ Agency-fixed **America/Vancouver** via `date-fns` + `@date-fns/tz` (not viewer-local).
14. ~~Map accessibility~~ Text-equivalent bus list in M3; the Leaflet map is `aria-hidden` and supplementary.

### Coordination items (not user decisions)
10. **OpenAPI generation** the API owner is on board with switching to **Huma**, which emits OpenAPI 3.x natively, so the frontend can generate `types/api.ts` directly. If Gin is kept instead, the API team adds `swaggo/swag` (or hand-maintains the spec). Required by M1 start; otherwise frontend hand-writes a sketch and regenerates in M4.
11. **K8s status with prof** submitted form had K8s as primary container management; prof's feedback demoted it to stretch. `infra/k8s/` exists. The frontend deploys the same artefact whether or not the K8s stretch is undertaken, so no frontend code change is required.

### Notes on repo state (not RFC decisions)
- We removed the original `docs/INFO 4190 - Final Report.pdf` from the repo. We keep a working copy elsewhere; confirm access before M1 starts since this RFC references it as background context.
- `docs/Project Confirmation.pdf` is our submitted plan; it is tracked publicly and represents our initial scope/stack, which may still change.

## 16. Out of Scope (will not build, frontend module)

- SSE / WebSocket push updates (polling-only)
- Playwright e2e
- Visual regression
- Multi-agency support
- Saved-route notifications
- Route comparison views
- Explicit dark-mode design (Tailwind default media query stays as scaffolded but no design effort)
- i18n
- Kubernetes deployment (lives in `infra/k8s/` as stretch; owned by infra, not frontend)

## 17. Decisions Log

| Date | Decision | Driver |
|---|---|---|
| 2026-06-04 | Stack locked: Next.js 16 + React 19 + Tailwind v4 + ESLint 9 + React Compiler | Team scaffold (commit `5d87d84`) |
| 2026-06-04 | No SWR, no TanStack; plain `fetch` + `setInterval` | Supply-chain concern |
| 2026-06-04 | Polling cadences: 60s (list) / 30s (details) / 15s (live map) | This RFC |
| 2026-06-04 | Strict TS + no `any` + ESLint a11y enforced (added in M0.5) | LEARN.md + WCAG target |
| 2026-06-04 | Map tiles: OSM only | Team decision |
| 2026-06-04 | Browser support: evergreen Chrome/Firefox/Edge + iOS Safari last 2 | Team decision |
| 2026-06-04 | Accessibility: WCAG 2.1 AA via `eslint-plugin-jsx-a11y` + axe | Team decision |
| 2026-06-04 | i18n deferred to v2; v1 English-only | Team decision |
| 2026-06-04 | Saved routes storage: **localStorage only**, no user accounts | No PII, nothing to sync server-side |
| 2026-06-04 | Scope re-cut into core/secondary/stretch per prof feedback | Prof feedback 9.5/10 |
| 2026-06-04 | Admin UI cut from v1; only re-enters as Tier 3 stretch | Prof did not list admin in any tier |
| 2026-06-04 | Route Details thin in core (M3): header + health + live map only | Prof feedback, "basic route status display" |
| 2026-06-04 | AdherenceTable / AlertBanner / ReliabilityChart moved to M5 (secondary) | Prof tiered them as secondary |
| 2026-06-04 | Predicted times: column built null-safe in M5; populates from ML in M6 stretch | Prof tiered ML as stretch |
| 2026-06-05 | **Docker downgraded to optional** for v1 (was locked); revisit only at the K8s stretch | Infra owner review (PR #1) |
| 2026-06-04 | Milestones restructured: M0 done by team; M0.5 added for finishing tasks; M0.5 → M6 owned by frontend lead | Aligns with prof tiers + reflects existing scaffold |
| 2026-06-04 | Tailwind v4 CSS-first config (no `tailwind.config.ts`); status tokens in `app/globals.css` | Tailwind v4 + team scaffold pattern |
| 2026-06-04 | React Compiler stays enabled; avoid manual `useMemo`/`useCallback` unless measured | Team scaffold choice |
| 2026-06-04 | **Full PWA in M0.5**: manifest + icons + service worker via `serwist` + `@serwist/next`; `next-pwa` rejected (unmaintained, no App Router support) | Project Confirmation Figure 5 labels the dashboard as PWA |
| 2026-06-04 | PWA installability checked manually (valid manifest, SW registers, install works); Lighthouse PWA audit no longer exists (removed in Lighthouse v12) | Tooling reality |
| 2026-06-05 | API framework: **Huma leading** (emits OpenAPI 3.x natively); Gin fallback would need `swaggo/swag` | API owner on board (PR #1) |
| 2026-06-04 | K8s status: stretch (prof demoted from submitted "primary"); frontend deploy artefact unchanged | Prof feedback |
| 2026-06-04 | Canonical module names from Component Diagram (Figure 4): APIService, DataIngestService, RealtimePredictor, ProgressiveWebApp | Submitted form alignment |
| 2026-06-04 | Frontend has **zero direct DB access**; all reads via the Go APIService; DB schema is the source of truth for response shapes; polling bounded by ingest cadence | `infra/db/schema-0.0.1.sql` |
| 2026-06-04 | Timezone: **agency-fixed America/Vancouver** via `date-fns` + `@date-fns/tz` (not viewer-local) | Region-specific transit tool |
| 2026-06-04 | Realtime-status indicator built in **core (M3)** (resilience requirement); driven by API `dataSource`/freshness field | Spec resilience NFR |
| 2026-06-04 | Map a11y: **text-equivalent bus list** in M3; Leaflet map `aria-hidden` and supplementary | WCAG 2.1 AA reality for interactive maps |
| 2026-06-04 | API mocking via **MSW** (dev-only) for M1-M3 and tests; fixture-only approach rejected | Realistic network-layer mocking |
| 2026-06-04 | `usePolling`: **stale-while-error** (retain last data on failed poll) + **pause when tab hidden** | Polling-dashboard UX |
| 2026-06-04 | Pinned `react-leaflet@^5` + `recharts@^3` for React 19 compatibility | Dependency compat |
| 2026-06-04 | Commit attribution corrected: frontend scaffold is `5d87d84`; `cd48a23` is the `main` sync point | Git history accuracy |
| 2026-06-05 | PR #1 review applied: em dashes removed, "binding" softened to "initial plan", header metadata listified, repo-state notes rewritten in first person | Infra owner review (PR #1) |
