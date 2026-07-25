# Code-Scanning Remediation Plan

## Goal
Fix all 30 open CodeQL alerts on [wod-wiki security/code-scanning](https://github.com/SergeiGolos/wod-wiki/security/code-scanning): 8 high, 2 medium, 20 code-quality.

## Tasks

- [ ] **1. Incomplete sanitization — escape backslashes before quotes (#369, #367, #336)**
  In `quoteYamlScalar` (`src/lib/frontmatter.ts:110`), `quoteYaml` (`src/repositories/effort-markdown.ts:41`), `quoteYaml` (`src/components/organisms/editor/FrontmatterCompanion.tsx:64`): change `val.replace(/"/g, '\\"')` → `val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')`.
  → Verify: round-trip `serialize → parse` of a value containing `\"` (e.g. `a\"b`) returns the original string; add a unit test in the existing frontmatter test file.

- [ ] **2. Missing regexp anchor — consolidate URL-subtype detection (#368, #331, #329)**
  `/youtube\.com|youtu\.be/i` (etc.) matches `notyoutube.com` / `youtube.com.evil.com`. Logic is duplicated 3×: `FrontmatterCompanion.tsx:81`, `sectionParser.ts:156`, `frontmatter-preview.ts:67`. Extract one shared `detectUrlSubtype(url)` helper (host-anchored regex, e.g. `/(^|\.)youtube\.com([/?#:]|$)/i`) into a shared util and call it from all three sites.
  → Verify: `notyoutube.com` and `youtube.com.evil.com` no longer classify as `youtube`; existing youtube/strava/amazon URLs still detected.

- [ ] **3. Cross-window information leak — scope postMessage origin (#358, #357)**
  `LocalTabBackend.ts:94` (`popup.postMessage(message, '*')`) and `LocalReceiverBackend.ts:74` (`window.opener.postMessage(message, '*')`). The receiver is same-origin (`${origin}${LOCAL_RECEIVER_HTML}`), so replace `'*'` with the explicit origin (`getOrigin()` / `window.location.origin`).
  → Verify: local-cast session handshake still pairs sender↔receiver (run cast flow in playground or its existing tests).

- [ ] **4. Insecure randomness — drop Math.random fallback (#356)**
  `LocalTabBackend.ts:137`: default `generateId` falls back to `Math.random().toString(36)`. Session IDs gate the cast pairing — replace fallback with `crypto.getRandomValues`-based hex (or require `crypto.randomUUID` and throw if absent).
  → Verify: `startSession()` still produces unique session IDs; no `Math.random` remains in the file.

- [ ] **5. Useless assignment to property — dead `this.origin` write (#241, #240, #239)**
  `ResistanceMetric.ts:12`, `DistanceMetric.ts:12`, `RepMetric.ts:21`: `this.origin = ... 'user' ...` is immediately overwritten by the `'hinted'` line. Delete the first assignment (keep `'hinted'`, the current behavior).
  → Verify: `npm run build` passes; runtime metric tests still green.

- [ ] **6. Index-out-of-bounds — restructure `i <= length` flush loops (#280, #279)**
  `sectionParser.ts:232` and `section-state.ts:255` index `mdLines[i]` inside `for (i = 0; i <= mdLines.length; i++)`. Restructure: loop `i < length` handling blank-line flushes, then a single trailing flush after the loop (no synthetic `isEnd` iteration).
  → Verify: editor section parsing tests pass; a doc ending in a markdown group (no trailing blank line) still flushes the final section.

- [ ] **7. Redundant operations (#255, #254, #253)**
  `MetricVisualizer.tsx:51`: `(metric.type || metric.type)` → `metric.type`. `ChromecastRuntimeSubscription.ts:113`: `f.type ?? f.type ?? ''` → `f.type ?? ''`. `AnalyticsTransformer.ts:67`: `f.type === 'duration' || f.type === 'duration'` → single check.
  → Verify: build passes; no behavior change.

- [ ] **8. Unneeded defensive code — unreachable null guards (#352–#347)**
  `cdlCellRenderer.tsx`: the dispatch at line 135 already returns early for `undefined/null`, making the guards in `renderBadge` (232), `renderPill` (256), `renderFallback` (363) dead. Remove the three early-return blocks.
  → Verify: review-grid stories/tests render badges/pills/fallbacks unchanged (empty cells still show `—` via the dispatcher guard).

- [ ] **9. Unused variables / imports (#366, #365, #361, #360, #359, #305)**
  Remove: `parseNoteId` import (`workbenchSessionStore.ts:40`); `playgroundRecorder` from the resultRecorder import (`:44`, keep `createResultRecorder`); `Dimension` (`fuseUnits.ts:3`, keep `UnitSet`); `ResistanceMetric` import (`fuseUnits.ts:4`); `activeStatementIds` from the `useWorkbenchSync()` destructure (`Workbench.tsx:228`); `flushSync` import + its `@ts-expect-error` comment (`widget-block-preview.tsx:29-30`).
  → Verify: `npm run build` passes with no unused-import errors.

- [ ] **10. Useless assignment to local (#294)**
  `playgroundDisplay.ts:50`: `catch { decodedName = name; }` re-assigns the value it already holds. Replace the catch body with a comment-only no-op (keep raw `name` on decode failure).
  → Verify: `formatPlaygroundPageTitle('%E0%A4%A')` (invalid escape) returns the raw name instead of throwing.

- [ ] **11. Verification (LAST)**
  Run `npm run build` and `npm run test` — both green. Push branch, wait for CodeQL re-scan on the PR, confirm all 30 alerts transition to closed/fixed.
  → Verify: security/code-scanning shows 0 open alerts on the PR check.

## Done When
- [ ] `npm run build` + `npm run test` green
- [ ] All 30 alerts closed by the CodeQL PR check

## Notes
- Tasks 1–4 are the security-relevant fixes (8 high + 2 medium); tasks 5–10 are pure code-quality and carry no behavior change.
- Task 2 is the only one that adds structure (shared helper) — justified because the same unanchored regex lives in 3 files and would re-alert independently.
- Task 8 relies on the dispatch-time guard at `cdlCellRenderer.tsx:135`; if `renderFallback` is ever called from a new site, the guard must move with it.
