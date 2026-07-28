# Research: Inventory telemetry seams for home funnel events (#755)

## 1. What the spec expects (`docs/wodwiki_teaching.agent.final.md` §6.2)

Section `6.2` (lines 668–698) defines a **dual-use event taxonomy**:

- One event stream, two consumers: user-facing surfaces (e.g., fluency ladder, benchmark re-tests) and the product team's improvement loop.
- Naming convention: `category:object_action` with fixed-string names and variable data in properties.
- Target taxonomy size: ~40 events, ≤20 properties each.
- **Three-step activation funnel**: `syntax:parse_succeeded` → `timer:workout_completed` → `result:score_logged`.
- **Home drop-off events**: each of the six home areas fires a fixed-string event: `home:demo_opened`, `home:path_started`, `home:collections_opened`, `home:behaviors_opened`, `home:explorer_opened`, `home:reference_opened` (line 698).

## 2. Existing instrumentation in `src/` and `playground/src/`

**Nothing exists for product/funnel telemetry.** Search for `track(`, `gtag(`, `posthog`, `mixpanel`, `plausible`, `amplitude`, `dataLayer.push`, `recordEvent`, `emitEvent`, and `home:` produced zero application-side event calls.

What *does* exist:

- `playground/index.html:13–18` — a Google tag (`gtag.js`) script block, but only `gtag('config', 'G-PROD-ID')` with a dev placeholder ID. No `gtag('event', ...)` calls anywhere.
- `playground/receiver-rpc.html:10–15` — the same placeholder gtag config.
- Runtime/workout event infrastructure only:
  - `src/runtime/events/EventBus.ts` — block-execution event bus (runtime internal).
  - `src/services/events/SimpleEventBus.ts` — generic typed service bus used by `WorkoutEventBus` and `WorkbenchEventBus`.
  - `src/services/WorkoutEventBus.ts` — workout lifecycle events (`start-workout`, `stop-workout`, `pause-workout`, `resume-workout`).
  - `src/services/WorkbenchEventBus.ts` — cross-panel workbench events (`workbench:scroll-to-block`, `workbench:start-workout`, etc.).
- Home page has local-quest progression only:
  - `playground/src/tour/HomeTour.tsx:82–92` defines `HOME_QUEST_STAGE` mapping quest ids (`qs-arrive`, `qs-tour-*`, `qs-edit`, `qs-run`) to tour stages.
  - `playground/src/tour/useTourScrollQuests` (called at `HomeTour.tsx:227`) and `usePageQuests` persist quest state in `localStorage`, not as analytics events.

**Clear statement:** There is no existing analytics/telemetry/event-logging layer for product behavior. The only external analytics wiring is the unconfigured gtag loader in `index.html`.

## 3. What the #725 analytics layer already captures

The V12 analytics layer is **workout-metric fact storage**, not product-event telemetry.

- `src/services/db/IndexedDBService.ts:105–109` defines the `analytics` object store (`AnalyticsDataPoint` rows) with indexes `by-type`, `by-segment`, `by-result`, `by-content`, `by-metric`, and `by-timestamp`.
- `src/services/db/IndexedDBService.ts:1118–1127` is the write surface: `saveAnalyticsPoints(points)` writes `AnalyticsDataPoint[]` via `store.put`.
- `src/types/storage.ts:178–221` shows the `AnalyticsDataPoint` schema. It is purpose-built for workout metrics: `noteId`, `segmentId`, `resultId`, `type` (metric key), `value` (number), `effortSlug`, `discipline`, `intensityTier`, `grain` (`segment` | `summary` | `rollup`), `timestamp` (canonical workout time), `createdAt`.
- Ingest path: `src/services/analytics/workoutDerivation.ts:124–222` — `normalizeSummaryFacts()` reads Tier-2 `outputType === 'analytics'` outputs from `WorkoutResult.data.logs` and writes summary-grain fact rows.
- Query/read path: `src/services/analytics/query/QueryService.ts:1–14` — four-stage WQL executor over the fact store (`SELECT` → `BUCKET` → `AGGREGATE` → `GROUP`). Exported from `src/services/analytics/query/index.ts`.
- Rollup: `src/services/analytics/rollup/rollupDriver.ts:30–123` — lazy ACWR/monotony/strain rollups saved back to the same `analytics` store.
- RPE: `src/services/analytics/captureSessionRpe.ts` — captures session RPE and writes it as facts.

**No event bus or hook seam for non-workout events.** `WorkoutEventBus` and `WorkbenchEventBus` are typed for their own domains and have no persistence. The fact store is populated exclusively from workout result logs and rollup drivers.

## 4. Consent / privacy constraints

- **No cookie consent, analytics opt-out, privacy policy, GDPR, or CCPA handling found** in `src/` or `playground/src/`.
- Third-party scripts in the app shell:
  - `playground/index.html:13` — `https://www.googletagmanager.com/gtag/js?id=G-PROD-ID` (placeholder, loads unconditionally).
  - `playground/receiver-rpc.html:10` — same gtag loader.
- Third-party embed: `src/components/organisms/editor/FrontmatterCompanion.tsx:976` — YouTube `www.youtube-nocookie.com` iframe (privacy mode, but still an external embed).
- **Implication:** Any telemetry implementation must first add a consent gate and conditionally load/forward to gtag; today the app has no opt-in/opt-out mechanism.

## 5. Recommended seam: a thin standalone `TelemetryService`

**Recommendation:** Add a new, standalone `TelemetryService` that follows existing repo conventions but does not reuse the workout fact store or the workout/workbench event buses.

### Why not the other options

- **Do not write `home:*` events into the `analytics` fact store.** The `AnalyticsDataPoint` schema (`src/types/storage.ts:178–221`) is a workout-metric row: it requires `noteId`, `segmentId`, `resultId`, a numeric `value`, and carries effort/discipline/grain fields. Forcing telemetry events into it would require emptying required fields, extending `grain` with `'event'`, and adding a JSON-properties bag. That pollutes WQL queries and rollup logic and breaks the store's single purpose.
- **Do not reuse `WorkoutEventBus`/`WorkbenchEventBus`.** They are typed for runtime/workbench events and have no persistence, so they cannot satisfy the dual-use requirement of feeding user-facing surfaces and product dashboards later.

### Why a standalone service is the thinnest viable seam

1. **Follows repo conventions** — use the same `SimpleEventBus<T>` pattern (`src/services/events/SimpleEventBus.ts`) for in-app pub/sub, and the same `IndexedDBService` singleton pattern for persistence.
2. **Minimal schema** — a new `telemetry` object store with a small, event-shaped row (`id`, `sessionId`, `userId?`, `name`, `properties`, `timestamp`, `createdAt`). No contortions of the workout-fact schema.
3. **Dual-use by design** — local consumers (e.g., a future fluency ladder or home funnel view) subscribe via the bus; persisted rows feed product dashboards and can be exported or queried without touching workout analytics.
4. **Consent-ready** — the service can hold an `enabled` flag (default off) and only forward to `window.dataLayer`/`gtag` when the user has consented, addressing the missing consent gap.
5. **Future-proof** — adding a new store and service is a clean cut; it does not destabilize the V12 analytics migration that just closed.

### Proposed API shape

```typescript
// src/types/storage.ts
export interface TelemetryEvent {
  id: string;                      // crypto.randomUUID()
  sessionId: string;               // stable session id
  userId?: string;                 // set after signup
  name: string;                    // 'home:demo_opened', 'syntax:parse_succeeded', ...
  properties: Record<string, unknown>;
  timestamp: number;                 // event time
  createdAt: number;               // persist time
}

// src/services/telemetry/TelemetryService.ts
export interface TelemetryService {
  record(event: Omit<TelemetryEvent, 'id' | 'createdAt'>): void;
  subscribe(handler: (event: TelemetryEvent) => void): () => void;
  setConsent(enabled: boolean): void;
}
export const telemetryService: TelemetryService = createTelemetryService();

// src/hooks/useTelemetry.ts
export function useTelemetry(): (event: Omit<TelemetryEvent, 'id' | 'createdAt'>) => void;
```

### Files a future execution effort would touch

- **New** `src/services/telemetry/TelemetryService.ts` — singleton service wrapping `SimpleEventBus<TelemetryEvent>` and `IndexedDBService` `telemetry` store writes, plus optional `gtag` forwarding guarded by consent.
- **New** `src/hooks/useTelemetry.ts` — React hook to subscribe/emit from components.
- `src/types/storage.ts` — add `TelemetryEvent` interface.
- `src/services/db/IndexedDBService.ts` — add `telemetry` object store, `saveTelemetryEvents`, `getTelemetryEvents`, and bump `DB_VERSION` (`src/services/db/IndexedDBService.ts:127–128`).
- `src/services/events/IServiceEventBus.ts` — already the right contract; no change needed.
- `playground/src/tour/HomeTour.tsx` — fire `home:demo_opened` on the primary editor/run CTAs (`startRun` at `:252`, `handleTimerComplete` at `:270` for the run completion, `handleShare` at `:330`, `handleNewNote` at `:337`).
- `playground/src/tour/TourOutro.tsx` — fire `home:collections_opened` on the `/collections` link (`:50`), `home:path_started` on syntax-guide links, and `home:reference_opened` on quick-reference CTAs.
- `playground/src/App.tsx` — initialize the telemetry service at app start (set session id, load consent preference).
- `playground/index.html` — make the gtag loader consent-aware (e.g., do not load until consent is granted, or load with `type="text/plain"` and promote after opt-in).
- **Future** `src/services/analytics/telemetryQuery.ts` — small WQL-like query helper over the `telemetry` store so the Explorer/Dashboard can surface funnel counts without joining the workout fact store.

## Findings

- No product-telemetry instrumentation exists in `src/` or `playground/src/` today; the only external analytics wiring is the placeholder `gtag.js` loader in `playground/index.html:13`.
- The #725 analytics layer (`src/services/analytics/`) is a workout-metric fact store (`AnalyticsDataPoint`), written from Tier-2 result logs via `normalizeSummaryFacts`; it has no event bus or hook seam for non-workout events like `home:demo_opened`.
- No cookie consent, privacy policy, analytics opt-out, or GDPR/CCPA handling exists; the gtag loader currently runs unconditionally.
- The `SimpleEventBus<T>` pattern (`src/services/events/SimpleEventBus.ts`) is the right in-app distribution primitive, but it should be wrapped in a new standalone service rather than repurposing the workout or workbench buses.
- The thinnest viable seam is a new `TelemetryService` writing to a dedicated `telemetry` IndexedDB store, forwarding to `gtag` only under a consent flag, and exposing a `record()` API plus a `useTelemetry()` hook.
- Key implementation sites are `playground/src/tour/HomeTour.tsx` (hero CTAs), `playground/src/tour/TourOutro.tsx` (jump-right-in links), `src/services/telemetry/TelemetryService.ts` (new), `src/services/db/IndexedDBService.ts` (new store), and `playground/index.html` (consent-gated gtag load).
- Reusing the `analytics` fact store for events is not recommended because its schema is workout-metric specific (required `noteId`/`segmentId`/`resultId`, numeric `value`, effort fields) and would pollute WQL/rollup logic.
