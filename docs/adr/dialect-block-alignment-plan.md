# Dialect Block Alignment — Implementation Plan

Companion to [the ADR](./dialect-block-alignment.md). The ADR settles *what* and
*why*; this settles *how* and *in what order*.

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Block Dialect** = the fence tag; the one property parser + analytics key on | One axis aligns all stages; matches the existing analytics model |
| 2 | One **registry** of descriptors (tags + aliases + optional overrides) is the source of truth | Deletes the closed enum and the scattered lists; adding a domain = one registration |
| 3 | Defaults always present; **dialects override, never replace** | Least disruptive; no override → default applies |
| 4 | The stack stays **universal** (tag annotates, doesn't scope) | Sport dialects are content-pattern detectors, not exclusive domains |
| 5 | The **runtime is untouched** — hint-driven, tag-blind, no strategy seam | The analyzer→hint→strategy channel already conveys domain; a tag seam would duplicate it |
| 6 | **Flat registry** — `wod`/`log`/`plan`/`climb` are peers | climb is already "a climbing log"; domain+mode compose per-dialect, no separate axis |
| 7 | climb rides the **shared grammar** (semantic analyzer, not a new parser) | Spec-confirmed: "uses the shared Whiteboard parser" |
| 8 | Analytics **inverts** the per-processor `dialects` allow-list → dialect-declared processors | The dialect owns its analytics; defaults always load |

## What changes

- **New:** `src/dialects/blockDialectRegistry.ts` — the registry + `DialectDescriptor`
  type + `matchFence` / `languageFor` / `isRegistered` lookups.
- **`section-state.ts`** — delete `EditorDialect`, `VALID_DIALECTS`; `matchDialectFence`
  → `registry.matchFence(trimmed)`. A recognized tag yields a runnable section whose
  `dialect` is the descriptor's canonical tag; `EditorSection.dialect` widens to
  `string`.
- **`whiteboard-script-language.ts` / the markdown `codeLanguages` predicate** —
  read `registry.languageFor(info)`; delete the hardcoded list.
- **The six editor extensions** — replace `type === "wod"` with
  `registry.isRegistered(section.dialect)` (or a derived `section.isRunnable`).
  Generalizes defaults to every runnable dialect.
- **`whiteboard-autocomplete.ts`** — snippet list sourced from the registry
  (`registry.all().map(d => '```' + d.tags[0])`); `wrapInWodFence` →
  `wrapInDialectFence`.
- **Analytics** — `createAnalyticsEngineForBlock` keeps reading `block.dialect`;
  the profile becomes [default processors] + [descriptor.analytics overrides]. The
  per-processor `dialects` field is removed/ignored; dialects declare their processors.
- **Legacy `DialectRegistry` (`src/services/`)** — fold its test helpers onto the
  new registry / `DialectStack`; delete the file.

## Phased rollout

### Phase 1 — Registry-driven editor dialect (low risk, high signal)

Stand up the registry with `wod`/`log`/`plan` registered unchanged (behaviour
identical), then add `climb`. `matchDialectFence` → lookup. ` ```climb ` now parses
as a runnable section.

- `src/dialects/blockDialectRegistry.ts` (new)
- `src/components/Editor/extensions/section-state.ts` — enum → lookup
- Register `wod` (tags `['wod','whiteboard']`), `log`, `plan`, `climb`
- **Test:** existing `section-state` tests pass unchanged; new test that ` ```climb `
  yields a runnable section with `dialect: 'climb'` and a `contentId`.

### Phase 2 — Dialect-driven CM language

The `codeLanguages` predicate reads `registry.languageFor`. climb fences get
highlighting (shared grammar).

- `src/parser/whiteboard-script-language.ts` + the predicate site
- **Test:** ` ```climb ` content is highlighted by `whiteboardScriptLanguage`.

### Phase 3 — Editor defaults generalize

Refactor the six `type === "wod"` filters to `registry.isRegistered(dialect)` (or a
derived `isRunnable`). climb inherits decorations/feedback/lint/results for free.

- `preview-decorations.ts`, `cursor-focus-panel.ts`, `line-ids.ts`,
  `whiteboard-linter.ts`, `whiteboard-results-widget.ts`, `runtime-panel-state.ts`
- **Test:** a ` ```climb ` block renders the card/fence style and the metric panel.

### Phase 4 — Analytics inversion + climb end-to-end

Move analytics from per-processor allow-lists to dialect-declared processors. Wire
`ClimbDialect`'s analytics. Confirm climb runs and projects.

- `src/core/analytics/StandardAnalyticsProfile.ts`, `createAnalyticsEngineForBlock.ts`
- climb descriptor's `analytics` overrides; remove `dialects` fields from processors
- **Test:** `StandardAnalyticsProfile.build()` for a climb context includes climb
  processors + defaults; climb block executes and emits grade/send analytics.

### Phase 5 — Legacy cleanup

Delete `src/services/DialectRegistry.ts`; move its test helpers onto the registry /
`DialectStack`. One dialect registry remains.

- `src/services/DialectRegistry.ts` (delete), `dialect-test-helpers.ts`, the
  smoke test that constructs it
- **Test:** no remaining imports of `DialectRegistry`.

## File count

| Area | Files | Count |
|------|-------|-------|
| Registry | `blockDialectRegistry.ts` (new) | 1 |
| Section parser | `section-state.ts` | 1 |
| CM language | `whiteboard-script-language.ts` + predicate | 1–2 |
| Editor filters | preview-decorations, cursor-focus-panel, line-ids, linter, results-widget, runtime-panel-state | 6 |
| Autocomplete | `whiteboard-autocomplete.ts` | 1 |
| Analytics | `StandardAnalyticsProfile.ts`, `createAnalyticsEngineForBlock.ts`, processor `dialects` removal | 3+ |
| Legacy | `DialectRegistry.ts` (delete), test helpers | 2 |
| Tests | per phase | 5+ |
| **Total** | | **~20** |

## Test strategy

- **The interface is the test surface.** The registry's lookups
  (`matchFence`, `languageFor`, `isRegistered`) are pure — test them directly, no
  React, no CodeMirror.
- **Behaviour, not implementation.** Section-state tests assert " ` ```climb `
  yields a runnable section with `dialect: 'climb'`," not which enum value was used.
- **Snapshot the dialect set.** A test that asserts the registered tags
  (`wod`, `whiteboard`, `log`, `plan`, `climb`) guards against accidental removal.
- **Alias collision.** A registration-time test that two descriptors claiming the
  same alias throws.

## Migration / risks

- **`EditorSection.dialect` widens** from the `EditorDialect` union to `string`.
  Any code exhaustively switching on the union needs a default branch — find via
  `lsp references` before the change.
- **Analytics inversion is the riskiest phase** (P4): today every processor
  hardcodes its `dialects` list. Inverting changes *who* declares eligibility. Do
  it behind the existing `StandardAnalyticsProfile.build()` so the profile assembly
  stays the seam; processors stop carrying the field.
- **Alias collisions** (two dialects, same tag) must fail loud at registry
  construction, not silently produce wrong sections.
- **climb as the proving case.** If climb parses, highlights, decorates, runs, and
  projects after P1–P4, the seam is real. Any stage where climb needs a special
  case is a gap in the "defaults generalize" claim.
