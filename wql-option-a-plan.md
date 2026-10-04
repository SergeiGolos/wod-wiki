# WQL option A implementation plan

Status: implementation landed. Final consumer verification is in progress; physical-keyboard/phone and screen-reader checks remain external verification requirements.

Decision: adopt the adaptive token composer from [the interaction review](docs/wql-composer-review.html). Keep readable chips and one shared searchable picker. Use real keyboard focus on desktop and thumb-sized selection inside a bottom sheet on mobile. Retain an explicit, lossless WQL text editor.

## Scope and completion contract

Fix all eight reviewed gaps, including query loss, capability mismatch, Tab interception, inconsistent search, add/edit drift, stale host actions, touch targets and grouping precedence. Migrate stream headers, global/stream palettes, explorer, widget authoring, note query blocks, settings helpers and affected Storybook examples.

Preserve current persistence boundaries:

- Inline stream edits update the page query and URL.
- Stream query dialogs preview locally; Apply updates the page query once.
- Global search previews results; selecting a result navigates, not saves a filter.
- Explorer edits a draft; Run updates executed results; Save chooses a destination.
- Widget and query-block dialogs commit only through their final save action.
- Settings saves browser-local defaults and favorites, not the active page query.

No new query family, grammar redesign, storage schema, dependency, generic builder framework or second maintained editor. Advanced WQL is a supported editing mode, not a placeholder for missing implementation.

## Fixed interaction decisions

| Concern | Decision |
| --- | --- |
| Canonical query | Existing `AnyParsedQuery`, `parseQuery` and `serialize` own semantics. Chips are projections, never the complete source of truth. |
| Invalid draft | Preserve exact user text. Show errors; suppress preview execution and final commit. Never replace it with default pills. |
| Kind | Separate Find things from Measure numbers. Measure exposes aggregator and metric. |
| Find target | Singular `note`, `block`, `effort`, `session`, `segment`, `event`. |
| Source scope | Separate optional storage-scope filter using `WQL_SOURCE_VALUES`. All sources means no `source` filter. |
| Add/edit | One catalog and picker. Existing clauses say Edit. Choosing an absent field opens value selection immediately without emitting a blank filter. |
| Text entry | Unqualified words remain text unless a filter suggestion is explicitly selected. Complete WQL replaces the draft; valid `key:value` fragments edit a clause using the real parser. |
| Tab | In text completion, accept the active row and move to the next syntactic slot; Shift-Tab moves to the preceding slot. Outside completion, preserve native focus navigation. |
| Completion | Initially no active row. Down selects the first row. Enter chooses only an explicitly active row; every visible action row is keyboard reachable. |
| Multi-select | Toggle in place, preserve selected rows, label OR semantics. Done ends field editing; host Apply saves the complete draft. |
| Grouping | Ordered, duplicate-free dimensions. Add, remove and move up/down without drag. Available on targets where grouping has a meaningful consumer. |
| Mobile | 48px rows/actions, minimum 44px hit area, explicit Search focus, lower sheet with sticky footer and safe-area padding. |
| Advanced text | Explicit Edit WQL / Guided controls modes. Switching modes preserves exact text unless the user edits and canonicalization is lossless. |
| Host action | All Run/Apply/Save actions consume the same synchronously resolved draft. Debounce execution, never state or action resolution. |

## State and interface contract

Refactor in the existing composer files. Do not introduce a query-state service or a reducer framework by default.

1. The controlled `query` or uncontrolled draft string remains authoritative. Parse it once per change. An invalid parse still carries the original string.
2. For a valid query, derive chip descriptors from the entire AST. A guided edit changes only its corresponding AST field, then calls the serializer. Copy the changed array/path only; preserve other fields.
3. Treat opening a picker, its search text and a proposed empty field as transient editor state. Do not notify a host merely because a field editor opened.
4. Use a discriminated active-editor state: closed, clause catalog, value editor or WQL text. Value state identifies the particular clause/filter occurrence, not just its key. Remove independent flags that permit two pickers to own the keyboard.
5. Resolve pending text through one total helper in `queryAst.ts`. Return a valid query snapshot or an invalid snapshot containing exact text and its error. Do not infer success from non-empty text.
6. `onQueryChange` reports the resolved draft synchronously, including pending text and invalid text. Remove the competing debounced `onLiveQueryChange` state contract and migrate every caller. Hosts decide whether to execute a valid draft, with their existing debounce.
7. Keep `onSubmit` as the explicit submit action, but make it consume the resolved snapshot on the first action. Put composer-owned Run/Apply buttons through this same path using an action label. Preserve unrelated extension slots; they must not implement their own query flushing.
8. For widget Save and settings fields, the parent stores the synchronous draft and validity. Their final action validates that snapshot before writing. No imperative composer handle or hidden `flush()` ordering requirement.
9. On external controlled-query replacement, discard obsolete pending input and active occurrence selection. Back/Forward restores the query without replaying a local edit or emitting a mount-time rewrite.
10. Untouched query strings stay untouched. Compare semantic AST fields, excluding `raw`, advisory text and errors, when proving a serialize/parse round-trip. If any semantic field cannot survive, keep exact WQL text and block guided modification until a lossless path exists. Examples include standalone pipe offsets if the current serializer cannot emit them.

The exact exported type names are implementation details. Before changing exported props or helpers, inspect language-server references and migrate all consumers in the same cutover, including package exports and Storybook. No deprecated aliases.

## Gap-to-work map

| Gap | Root cause and required fix | Work items |
| --- | --- | --- |
| G1: find suffix loss | `astToPills` omits find grouping/unit/pipes; pill emission reconstructs an incomplete query. Edit the original AST and preserve exact unsupported text. | 1, 2, 8 |
| G2: source/capabilities | Noun choices replaced old source values; singular effort hits the wrong allowlist; source scope/kind remain conflated. Header Collections pivot still emits `source:page`. | 1, 3, 6 |
| G3: keyboard | `navTarget`, `stepNav` and Tab interception move only a visual ring. Input lacks active-option relationships. | 4, 5, 8 |
| G4: search consistency | Static lists ignore input; typed-value action is outside navigable option indexes. | 4, 8 |
| G5: add/edit/grouping | Independent add menus; empty pills; single-value Group By editor. | 3, 4, 6 |
| G6: stale commit | Pending text, committed pills, live callback and host state can describe different queries. | 2, 6, 8 |
| G7: mobile | Top-docked actions, autofocus, 16px removals and dense rows. | 5, 6, 8 |
| G8: grouping precedence | WQL overrides view settings; local option lists diverge from composer choices. | 3, 7, 8 |

## Implementation work

### 1. Protect query semantics before changing the UI

Files:

- `packages/ui/src/composer/queryAst.ts`
- `packages/ui/src/composer/WqlComposer.tsx`
- `packages/wql/src/serialize.ts`, only for demonstrated serializer loss
- `apps/playground/app/lib/wqlEdits.ts`
- `packages/ui/test/queryAst.test.ts`
- `packages/wql/tests/serialize.test.ts`
- `apps/playground/app/utils/wqlEdits.test.ts`

Actions:

- Replace reconstruct-from-all-pills edits with targeted edits to the parsed AST. Preserve `groupBy`, `displayUnit`, `pipes`, `window`, `join`, all filter values, negation and wildcard flags.
- Preserve find pipe column order, per-column units, sort direction, limit and offset. Prove serializer completeness against `RowsPipes`, not just the currently reproduced limit example. Fix serializer loss within existing grammar if found; no invented syntax.
- Never default an uncontrolled unsupported query to `defaultPills`. Both controlled and uncontrolled hosts retain its real text, validity and Advanced editor.
- Restore hidden clauses from the original query; visual omission does not mean deletion.
- Identify filter occurrences distinctly. Editing one of two filters with the same key must not merge or rewrite the other occurrence.
- Fix `sourceFilterFor('collections')` so it no longer constructs `source:page` or injects `type:collection` as a substitute for source scope. Collections means `source:collections`; page-ness remains a separate type filter.
- Distinguish explicit pivots from ordinary edits. Changing a time/filter never drops another field. A target/kind pivot lists incompatible clauses before applying it and offers Cancel; no silent narrowing/widening or clause loss.

Gate:

`find:segment{effort:snatch} by {effort} in lb | limit 5` retains all suffixes after a time edit, reopening, and an untouched save. Opening an editor emits no rewrite. Invalid or unsupported text remains visible and unchanged.

### 2. Unify draft resolution and commit

Files:

- `packages/ui/src/composer/WqlComposer.tsx`
- `packages/ui/src/composer/queryAst.ts`
- `packages/ui/src/composer/diagnostics.ts`
- `packages/ui/src/composer/useWqlStageCounts.ts`
- `packages/ui/src/composer/index.ts`
- `apps/playground/src/components/organisms/command-palette/PaletteShell.tsx`
- `apps/playground/app/hooks/useExplorerQueryState.ts`

Actions:

- Implement the state/interface contract above. Separate free search text from active value-picker search text; typing a value must not become a page text filter.
- Recognize complete WQL, filter fragments, window fragments and ordinary text through the parser. Preserve query-shaped invalid input as invalid; do not degrade it into a text search.
- Treat repeated unqualified search editing as editing the intended text filter, not appending accidental AND clauses. Explicit Add another condition creates a distinct occurrence.
- Derive validity, diagnostics and submission from the same snapshot. Preview counts must describe that snapshot or be marked stale.
- Remove `liveWql` as a second palette query authority. Cancel pending preview work on close or new query; retain existing stale-response/version protection.
- Debounce only host search/preview execution. Run/Apply resolves immediately and clears any outstanding execution scheduled for an older draft.
- Update explorer URL state using replace while text is being edited, and establish a history checkpoint for deliberate Run/Apply. Preserve existing external Back/Forward restore behavior without generating a history entry per keystroke.
- Keep widget write rejection behavior: dialog stays open, draft intact, error visible. Query resolution must not bypass destination or widget readiness checks.

Gate:

Type then click Run or Apply immediately, without Enter or a delay. The action receives the exact visible draft. Invalid drafts never write or execute. Cancel leaves persisted state untouched.

### 3. Separate kind, target, scope and capability choices

Files:

- `packages/ui/src/composer/queryClauses.ts`
- `packages/ui/src/composer/clauseVocab.ts`
- `packages/ui/src/composer/ComposerRegistry.ts`
- `packages/ui/src/composer/suggestionSources.ts`
- `packages/wql/src/vocabulary.ts`
- `apps/playground/app/views/stream/streamProfile.ts`
- `apps/playground/app/lib/routeWqlConfig.ts`
- `apps/playground/app/lib/wqlEdits.ts`

Actions:

- Build choices from existing engine vocabularies: find targets, source values, aggregators, metric families, result planes, grouping dimensions and units. UI metadata stays in `queryClauses.ts`; do not add a second language registry.
- Replace overloaded Source controls with Kind, Target and Where stored. Source scope is independently multi-select where the engine honors it.
- Effort filters derive from `WQL_EFFORT_FILTER_KEYS`, including discipline/intensity/origin/text. Replace plural-noun routing in active code.
- Session offers the scope keys and plane filtering the session executor implements. Segment/event offer scope and fact-backed filters, including effort. Do not offer plane filtering on tables as effective unless its executor actually applies it.
- Distinguish parser acceptance from execution support. `runFindSession` and `runFindTable` have different capabilities; a parsed clause must not be advertised as a working filter when ignored by its consumer.
- Include engine result-plane values in the plane picker. Replace hardcoded producer-origin options with values from the relevant effort/telemetry source; preserve existing unsupported values visibly.
- Include registered dynamic tag keys through the existing registry and suggestion-binding path. If no suggestions exist, an open field still accepts a valid exact typed value. Closed fields reject unknown values with a specific error.
- Allow arbitrary supported relative periods and multi-unit bucket widths, not only `2w`/`4w`. Validate with the parser; day/week one-unit grouping is not `.rollup(1w)`.
- Change built-in stream profiles to canonical target/scope descriptors. Perform a one-time, narrow migration of persisted option IDs such as `notes`, `blocks`, `efforts` into canonical choices; source-location favorites remain scopes. Preserve explicit empty favorites and the existing storage-key aliases. Invalid stored options are reported, not silently turned into query clauses.

Gate:

Every built-in profile has a representable target/scope. Effort exposes the correct keys; Measure is reachable; note source scopes are independent of target. Favorite lists reorder/prioritize choices but never define grammar validity.

### 4. Replace separate menus with one searchable picker

Files:

- `packages/ui/src/composer/WqlComposer.tsx`
- `packages/ui/src/composer/QueryPalette.tsx`
- `packages/ui/src/composer/InlineClauseEditor.tsx`
- `packages/ui/src/composer/clauseItems.ts`
- `packages/ui/src/composer/filterTypeahead.ts`
- `packages/ui/src/composer/clauseVocab.ts`

Actions:

- Reuse `InlineClauseEditor` for the shared picker content. Add and Edit invoke the same field-value step. Filter, calculation and grouping can be category shortcuts, not separate selection implementations.
- Search every static and dynamic list. Prefix-prioritize field keys; substring-match value labels/values. Preserve known selected values even when absent from a refreshed suggestion source.
- Give Search text and Use exact value real selectable indexes/IDs. Deduplicate exact matches without hiding a valid user action.
- Initially no highlighted action. Navigation bounds use the actual rendered list, not a larger unrendered candidate collection. Scroll the active option into view.
- Single selection updates the draft and returns to the catalog/query. Multi-selection toggles in place with checkmarks and a Done action.
- Grouping is one ordered dimension selection backed by AST `groupBy`. Removing a dimension changes only that dimension; move-up/down controls change its order. Preserve dynamic dimensions that are not in static vocab.
- Relative time and native civil-date inputs share one Window field. Label start/end, validate order/calendar dates with the existing parser, and use All time to remove the window.
- Built-in filter editor supports Include/Exclude and Exact/Starts with without discarding AST flags. Joins and presentation pipes may remain Advanced text, with visible summary chips and edit links. They must remain fully editable and preserved; a dedicated pipe-builder form is not required for option A.
- Custom slot editors render inside the active dialog/picker region rather than escaping its focus ownership through a body portal.

Gate:

Typing `eff` narrows both field and grouping lists. Pointer and keyboard can select exact text while suggestions remain. Add filter opens values directly; reopening a two-dimension group preserves both and their order.

### 5. Implement desktop focus and mobile selection layouts

Files:

- `packages/ui/src/composer/WqlComposer.tsx`
- `packages/ui/src/composer/QueryPalette.tsx`
- `packages/ui/src/composer/InlineClauseEditor.tsx`
- `packages/ui/src/dialog/EditorDialog.tsx`
- `packages/ui/src/dialog/visualViewport.ts`
- `apps/playground/src/components/organisms/command-palette/PaletteShell.tsx`
- `apps/playground/src/components/molecules/CommandListView.tsx`

Desktop:

- Replace pill-body `div role=button` with real buttons. Separate remove actions rather than nesting an interactive remove button inside another button.
- Delete `navTarget`, `navItems`, `stepNav`, visual remove navigation and Alt+Tab capture. Text-mode Tab accepts an active completion and advances its slot; without an active completion, native Tab reaches the host action or next field.
- Use input-owned combobox selection with stable IDs, `aria-controls`, `aria-expanded` and `aria-activedescendant`. Distinguish active row from selected value. Give every input a real label.
- Enter selects an active suggestion; otherwise it commits typed text or invokes the host action when no text is pending. Ctrl/Command+Enter submits the complete draft even during value editing. Ignore submit shortcuts while `isComposing` is true.
- Empty-input Backspace focuses the preceding visible chip. Removal requires a focused chip's Delete/Backspace or labelled remove control. Keep a local undo opportunity for the last clause removal; do not remove a hidden filter by accident.
- Escape dismisses exactly one level, then restores opener focus. Custom editors and the host dialog honor the same stack.
- Results has its own labelled focus/navigation region. Explicitly moving into Results changes keyboard ownership; editing a filter never simultaneously selects a result.

Mobile:

- Adapt the existing dialog host to bottom-sheet presentation. Extend `EditorDialog` only for this real presentation difference; preserve default layout for unrelated existing callers.
- Reuse `useVisualViewportRect`, `100dvh` fallback and safe-area padding. Do not duplicate viewport listeners in each composer host.
- Open at roughly the lower two-thirds of the visible viewport, allow content to expand to full height when needed, and keep Cancel/final action outside the scrolling body. Footer follows the visual viewport while typing.
- Start with category/field choices and focus a non-input heading/panel. Search is an explicit tap. Inputs use at least 16px text; rows/actions use 48px targets.
- Single-select returns to the prior step. Multi-select stays open; Done returns to the query summary. Back is visible and keyboard usable; swipe is not required.
- Reuse current keyboard behavior regardless of width. A tablet with a physical keyboard and a narrow desktop window stay usable. Layout breakpoint and pointer density must not disable keys.
- Avoid nested modal sheets for a field inside widget/block dialogs. Replace the dialog body with the field-selection step and return to the same parent draft.

Gate:

Tab accepts an active text completion; outside completion it reaches Run and later widget fields. Assistive output names the active option. On mobile, filtering can finish without opening the keyboard, with reachable Cancel/Apply and no horizontal overflow at 320px.

### 6. Migrate every query-editing host

| Host and files | Required cutover | Acceptance |
| --- | --- | --- |
| `StreamQueryBar.tsx`, `QueriableStreamView.tsx` | Compact shared composer mode for desktop entry/summary; same parsing and catalog as expanded editor. Keep mobile summary entry. Remove header-only `draftText` parsing and destructive empty Backspace. | Same filter entered through header and dialog has identical WQL semantics. Source scope survives expansion. |
| `PaletteShell.tsx`, `CommandListView.tsx`, `palette-types.ts` | One draft; separate result navigation from query editing; Apply consumes current valid snapshot. Move query-dialog actions to sticky footer and use bottom sheet on mobile. | Apply immediately after typing is current; Cancel leaves page URL unchanged; result activation happens only in Results. |
| `AnalyticsExplorerPage.tsx`, `ExplorerCommandBar.tsx`, `useExplorerQueryState.ts` | Composer-owned Run action; draft/submitted split retained; Save uses resolved draft. Examples dismissal must not consume another editor's Escape. Existing metric shortcuts use the same AST edit rules. | First Run includes pending text; group order preserved; changing metric does not remove time/filter/presentation state accidentally. |
| `WidgetComposerDialog.tsx`, `QueryToDashboardDialog.tsx` | Synchronous draft/validity, shared picker, preview marked current/stale; retain read-only subset and token-substitution execution. | Save persists query and widget fields once; Cancel discards; rejected write stays editable. |
| `WqlQueryInspectorModal.tsx`, `QueryBlockView.tsx` | Replace custom overlay with shared editor dialog; controlled draft/validity; Apply writes lossless WQL using existing fence patcher. | Escape/focus restore work; changing a filter preserves surrounding note source and every other query clause. |
| `QueryDefaultsSection.tsx` | Keep text-first defaults with optional shared helper and shared validation; supported favorite selectors replace unvalidated free-form active choices. | Save/Reset affect browser configuration only; empty list remains empty; advanced defaults survive reopening. |
| Storybook composer/workbench and query-block prototypes | Update public props, chips, demo slots, shortcut hints and examples together. Remove demonstrations of retired Tab behavior. | No old prop/picker path remains in exports or examples. |

Names in the table are existing files. Locate current references with the language server before exported symbol changes. Do not change routes as part of this work.

### 7. Make grouping and configuration precedence visible

Files:

- `apps/playground/app/views/stream/QueriableStreamView.tsx`
- `apps/playground/app/views/stream/ViewSettingsDialog.tsx`
- `apps/playground/app/lib/routeWqlConfig.ts`
- `apps/playground/app/pages/QueryDefaultsSection.tsx`

Actions:

- Preserve the current precedence: WQL grouping, then view preference, then level default. Do not silently change existing collection/effort arrangement.
- When query grouping wins, display Controlled by query, its dimensions and an Edit query action. Disable misleading fallback group buttons until query grouping is removed or changed through the shared editor.
- Label fallback grouping Arrange cards by. Query dimensions and chart bucket widths remain in the query editor.
- Distinguish local view favorites from valid query dimensions. A view-only `date` or `tag` label must not be blindly serialized as a different WQL dimension. Preserve existing profile defaults and validate actual consumer mappings.
- Defaults affect landing only when `?q=` is absent. Reopening, Back/Forward and share links retain explicit query choices.
- Keep updates to profile choices, settings descriptions and migrations together. Source reviewed during planning shows profile defaults such as `by {tag}`; do not replace them without checking `parseGroupingDimension` and the stream grouping consumer.

Gate:

Changing a fallback grouping cannot appear selected while WQL overrides it. Clearing query grouping reveals the saved fallback. Settings favorites affect all related pickers consistently without excluding valid text queries.

### 8. Verify consumer behavior and keep targeted regression coverage

Extend existing tests instead of adding a new framework. Existing tests that assert obsolete chip defaults, virtual Tab states or prop wiring must be deleted or replaced with consumer behavior, not repinned.

Permanent coverage:

- `packages/ui/test/queryAst.test.ts`: suffix preservation after unrelated edits; repeated-key occurrence edits; scope/target independence; civil range and negated/wildcard values; unsupported exact text preservation. Existing round-trip cases must not silently return early when projection unexpectedly fails.
- `packages/ui/test/composer.test.tsx`: actual Tab/focus path, explicit completion choice, keyboard exact-value selection, multiple ordered groups, first-action submission including pending text, invalid suppression and nested Escape ownership.
- `packages/wql/tests/serialize.test.ts`: add only demonstrated parse/serialize loss such as pipe offsets; assert semantic equality, not incidental formatting.
- Existing stream/palette/explorer/ViewSettings tests: real host outcomes, query URL, grouping winner, Cancel and immediate Apply/Run. Preserve the app's per-file isolation convention.
- Widget/block integration coverage: actual save contract and source patch preservation. Use existing tests located through references; add one small behavior test only where no regression check exists.

Final verification commands, run after the coherent cutover:

```sh
bun run test:package -- packages/ui/test/queryAst.test.ts packages/ui/test/composer.test.tsx packages/wql/tests/serialize.test.ts
bun run test:playground:unit
bun run typecheck:packages
bun run lint:packages
bun run lint:playground
bun run typecheck:storybook
bun run lint:storybook
bun run build
bun run docs:check
```

Verification results below distinguish completed commands from unavailable device checks. The playground typecheck script is a documented skip and is not evidence of type correctness.

Runtime proof, beyond tests:

1. Open Library at desktop width. Enter a filter through the header; reopen in query dialog; Apply without waiting for debounce; observe URL and result state.
2. Open the segment suffix example in explorer, widget and query-block editor. Change only time/filter; inspect emitted/saved WQL. Reopen it and compare semantic ASTs.
3. Tab through explorer and widget controls; exercise arrows, exact typed value, two groups, reorder and Escape. Observe real focus, not CSS state.
4. Open mobile Library, explorer, widget and block editing at 320px, 390px and tablet width. Complete a thumb-only selection flow; measure targets/footer; then attach keyboard behavior.
5. Test Android Chrome and iOS Safari with real software keyboards, safe areas and orientation changes. Check pinch zoom and focus visibility. Emulation alone cannot prove keyboard placement.
6. Check keyboard/screen-reader output with at least one desktop screen reader and VoiceOver or TalkBack. Confirm selected versus active values and modal focus containment.
7. Confirm invalid draft retains previous preview with a stale label. Cancel and failed writes leave original page query, widget and note source intact.
8. Recheck global result navigation, session/date/detail streams and browser Back/Forward. Capture actual rendered desktop/mobile layouts and action outcomes.

### 9. Document the completed contract and remove obsolete paths

After runtime proof:

- Update composer prop documentation and interaction examples in existing source/Storybook.
- Update `docs/app/screens-and-workflow.md` and affected stream/note/dashboard screen docs with keyboard, mobile and commit rules.
- Update `docs/language/wql-reference.md` only if serializer/capability documentation changed. UI changes must not imply new grammar.
- Add the project's existing changelog entry for the behavior cutover.
- Update the review with implemented outcomes and measured verification, clearly distinguishing them from its original findings.
- Remove dead Tab-ring state, old independent add picker logic, obsolete exported helpers/aliases and replaced tests. Remove body portals only where their callers migrated; retain unrelated consumers.
- Do not leave a runtime flag choosing between old and new composer behavior. Revert the coherent change set if release verification fails, rather than keep two editors alive.

## Dependencies and ownership

Critical order: **1 → 2 → 3/4 → 5/6 → 7 → 8 → 9**.

One integration owner controls `WqlComposer.tsx`, `queryAst.ts`, shared picker interfaces and exports. Agree on the draft/capability contract before host edits.

After that contract is stable, independent work can run concurrently:

- Picker/focus work in shared UI.
- Host integration in stream/palette versus explorer/widget/block files, with non-overlapping ownership.
- Settings/grouping integration once capability descriptors are fixed.

Mobile shell work depends on the shared picker and dialog ownership. It must not invent another selection-state model. All writers skip shared build/lint/full-suite runs until integration; the owner runs the final gates once.

## Completion checklist

- [x] G1 through G8 have observable browser or runnable regression evidence.
- [x] Find suffixes, negation, ranges, dynamic keys and joins survive unrelated edits or remain exact editable WQL.
- [x] Singular targets, Measure kind and storage scopes agree across every host.
- [ ] Dogfood contract supersedes native-only completion Tab: verify acceptance, slot advance, and native focus exit without an active row.
- [x] Multiple groups and their order are editable without raw re-entry.
- [x] Run/Apply/Save consume current visible draft; invalid queries cannot write.
- [ ] Physical-device verification only: mobile selection works without forced keyboard in emulation; action reachability with real iOS/Android keyboards remains unverified.
- [ ] Settings and grouping precedence are visible, URL restore works, and Cancel is non-destructive.
- [x] Every affected production caller, test, package export and demo uses the new contract.
- [x] Verification results and limits are recorded; obsolete paths are removed.

## Planning evidence and limits

The prior review includes reproduced query-loss, keyboard and mobile geometry evidence. This plan additionally checked the current AST fields, serializer, source pivot helpers, stream profiles, grouping precedence, `EditorDialog`, visual-viewport hook and test configuration.

Important additional source evidence:

- `packages/wql/src/wql.ts:79-98,176-205` defines complete query state, including find grouping, pipes and unit.
- `packages/wql/src/serialize.ts:88-122` handles canonical emission; its pipe handling warrants explicit offset coverage.
- `apps/playground/app/lib/wqlEdits.ts:40-63` still constructs removed `source:page` for Collections.
- `packages/wql/src/QueryService.ts:583-653,659-705` shows session/table execution capability differences.
- `packages/ui/src/dialog/EditorDialog.tsx:56-103,105-154` already implements focus restoration, Tab containment, visual-viewport layout and sticky footer.
- `apps/playground/app/views/stream/ViewSettingsDialog.tsx:46-54,111-128` exposes separate route-configured grouping controls.

## Implementation verification

- Composer, AST, serializer, rejected query-block write and cache suffix identity: 51 tests passed across five files. Package typecheck passed after the final regressions.
- Package typecheck passed. Package lint: zero errors, 22 warnings. Playground source lint: zero errors, three warnings. Storybook lint passed. Documentation links passed for 888 files.
- `bun run build` passed for all packages, the playground and Storybook, including declarations.
- First playground unit invocation overlapped package output cleaning and failed module imports. After build artifacts were restored, the suite reached 2550 passes and 14 failures in three stream/palette files; repairs and final verification are in progress.
- `typecheck:storybook` cannot run because the package has no such script. Direct `tsc -p apps/storybook/tsconfig.json --noEmit` reaches unrelated source/dist runtime-type and workbench errors. The affected WQL story's unsupported executor option was removed; the broad check is not a pass.
- Chromium exercised immediate Run/Apply, exact invalid text, grouping reorder and fallback explanation, native Tab/Escape/removal/Undo, scoped palette Cancel, global Results keyboard ownership and note navigation, widget save/reopen and actual note fence save/reopen/Cancel. A rejected block write retains the dialog/draft and original persisted source in its runnable regression.
- Session list and date routes rendered canonical session/window chips; effort catalog rendered the singular effort target. Catalog-backed effort detail opened without browser errors and correctly has no query composer.
- Sheet geometry: 320 × 740 palette y=252–740; 390 × 844 palette y=287–844; 768 × 1024 palette y=348–1024. Footer actions measured 48px, non-input initial focus, no horizontal overflow. Actual block sheet at 320 × 740 occupied y=162–740 with 48px actions.
- Desktop and mobile screenshots were captured, but image inspection is unavailable. DOM bounds and accessibility snapshots do not establish a visual review. Physical iOS/Android keyboards, orientation/safe areas and VoiceOver/TalkBack/desktop screen readers are not available here.
- No existing changelog convention was found. Existing workflow/reference/review documents carry the cutover contract and evidence; no new changelog was invented.
- Desktop editing contract: the composer mounts `WqlTextEditor` (CodeMirror, shared `wqlLanguage` + `wqlCompletionSource`). Invalid drafts stay local; `useComposerQueryState.setQuery` never writes an unparseable string to the URL, so Back/Forward only restores runnable queries. Compact header is one row (58px at 1280). Visualization select sits under the WQL readout in the widget dialog.
- Historical typeahead proof covered head/target/key/value click replacement and delimiter chaining. The dogfood cutover below replaces the global key list with shared target capabilities and adds grouping, windows, pipes, canonical values, and completion Tab acceptance. Historical native-only keyboard checks do not establish the new contract.

## Journal composer dogfood verification gate

Report build: deployed `v0.35.2075`. Fix verification must record the deployed version and revision separately from the local package version. Local work starts from revision `7c563a153f51754460a5feb84148f8d249c976b7`; the generated WQL metadata still reports `0.11.0` / `48fdcee`, so it is not proof of the current source revision.

Before closing deployment-verification issues #1013, #1004, #720, or #719, record the tested URL, visible build version, deployment revision, browser, viewport, and observed results for each check:

- [ ] Unsupported note predicates show advisories and key squiggles without changing the matched count.
- [ ] `by {effort}` on a note stream explicitly reports tag fallback and offers a valid grouping correction.
- [ ] Discipline values are canonical, unique ignoring case, and vault-backed values rank first.
- [ ] Note field suggestions include source/text/type/catalog and exclude unsupported discipline.
- [ ] Main Add condition opens a focused picker on desktop; mobile opens the same query editor.
- [ ] Pipe, column, direction, negation, relative-window, and date-range completion paths are reachable.
- [ ] Tab accepts and advances; both arrow directions wrap; mixed Tab/Enter/Escape sequences remain usable.
- [ ] Invalid drafts show actual profile guidance, error squiggles, and unmistakably stale results.
- [ ] Main view shows matched-of-total counts and effective grouping on desktop and mobile.
- [ ] Opening the palette retains exact invalid text; Apply cannot overwrite the page with an invalid or stale draft.
- [ ] Enter without an active option closes the popup and commits the current valid draft.
- [ ] A fresh root load has no unmatched-route warning while seed content loads.

GitHub Pages deep-link 404 behavior remains outside this fix. Local evidence does not close production checks. Physical keyboards, screen readers, and device safe-area behavior require separate evidence.

### Local journal dogfood evidence, 2026-10-03

Tested `http://127.0.0.1:5179/journal` with source revision `7c563a153f51754460a5feb84148f8d249c976b7` plus these uncommitted fixes. Chromium reports version 154. Desktop viewport was 1600 × 1000; mobile layouts were 390 × 844 and 320 × 740. No deployed build was tested.

- Real IndexedDB notes were created through `journalNotes.create`. A text-scoped note query returned 1 of 891; adding ignored `discipline:climbing` kept the same note and count and displayed the ignored-key advisory with an effort-query recovery example.
- `by {effort}` displayed `by tag (query fallback)`, grouped the fixture under `#climbing`, and offered a switch that rewrote the query to `by {tag}`. The rail matched the actual tag group.
- Desktop Add condition opened the target-aware catalog with its search control focused. Note text completion offered source/text/type/catalog and omitted discipline. Effort discipline completion offered canonical values without climbing/crossfit/yoga or case duplicates.
- Actual completion popups exposed pipe kinds, order columns, asc/desc, negated note fields, d/w after `last 4`, `to` after the start date, and valid content grouping dimensions. Home/End selected edges; Down from last and Up from first wrapped symmetrically; Tab accepted; Enter with no selected option closed the popup without inserting an option.
- An unterminated quoted draft rendered error squiggles. Global Ctrl-K retained that exact text; Cancel kept the page draft. Previous results retained their committed tag grouping rather than adopting an intermediate valid draft's default grouping.
- Mobile displayed 1 of 891, 2 applied and 1 ignored, advisories, and the effective fallback dimension outside the palette. Neither tested width had horizontal overflow. The 390px editor sheet occupied y=231–844; Cancel and Apply targets were 48px high. Screenshots were captured, but image inspection is unavailable in this session, so geometry is not a visual-review pass.
- Fresh root loads on both the existing origin and an uncached localhost origin produced no unmatched-route warning or page error.
- Real app `StreamQueryEngine` runs exercised note, effort, block, session, segment, and event paths. The isolated vault had no executed session/event records, so nonempty table conversion is covered by bounded regressions rather than a populated-vault browser claim.
- Final checks passed: WQL/UI package suites, 91 tests across 11 files; seven isolated app files, 94 tests; package typecheck; package declarations/build; playground production build; documentation links, 888 files. Scoped lint had no errors and 30 warnings, mostly existing test-setup `any` types. Palette tests passed with React `act` warnings; the build reported ineffective dynamic-import warnings.
