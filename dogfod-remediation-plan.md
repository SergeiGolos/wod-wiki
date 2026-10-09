# Dogfood remediation plans

Review and implementation of [dogfod-report.md](dogfod-report.md). Source references below describe the pre-fix review. Issues 1–7 are implemented; issue 8 remains an accepted GitHub Pages limitation. Local production checks do not claim that these fixes are deployed.

## Review and priority

Severity totals are correct. Category totals should be **Functional 3, UX 4, Console 1**. Issue 1 blocks release. Issue 4 concerns source classification, not date grouping. Shared named pages are intentional, so issue 3 must not introduce uniqueness. Issue 8 is accepted hosting noise; a custom 404 cannot make its initial response HTTP 200. Accessibility was not audited. Per-note deletion and local-only link hints remain separate follow-ups.

Implement **1**, then **2**, then **3–5**, then **6–7**; accept **8**. Routing, search, and validation are independent. Share the clone fixture between 3 and 4. Ship 1 once its checks pass.

## Plans and acceptance

### 1. Persist runs, then announce saved status

- Source: [NoteByIdPage.tsx:181–198](apps/playground/app/pages/NoteByIdPage.tsx) discards the recorder promise; [JournalDatePage.tsx:99–145](apps/playground/app/pages/JournalDatePage.tsx) swallows rejection. [FullscreenTimer.tsx:77–91](apps/playground/src/components/organisms/review/FullscreenTimer.tsx) closes/transitions without awaiting commit. The existing persistence path is transactional. **[INFERENCE]** These gaps can explain loss; the production failing branch is unknown.
- Change: await the existing recorder through the timer/editor/page callback chain, migrating every affected caller. Surface invalid completion inputs and write errors. Keep the result payload and stable ID until commit; offer same-ID retry without premature dismissal. Refresh badges/Sessions after success. Call live outputs "captured", not "saved". Preserve note/block identity, metrics, and partial-stop semantics.
- Check: three completed `/notes/:id` overlay runs through Stop twice and Exit once yield three distinct sessions plus their events and Sessions entries after reload. Completion then Stop/Exit never duplicates or changes completion status. Rejected writes leave no partial transaction, show an error, and retain retryable data; retry saves once. Extend `e2e/live-app/note-persistence-save-load.e2e.ts` and existing atomic/identity coverage. Update [workout-data-pipeline.md](docs/domain-model/workout-data-pipeline.md) and the clock guide.

### 2. Restore the unmatched-route view

- Source/change: [App.tsx:154–160](apps/playground/app/App.tsx) mounts `*` only while the root route is absent. Mount one unconditional wildcard, retaining loading/re-seed recovery when needed and otherwise using the existing [NotFoundPage](apps/playground/app/pages/NotFoundPage.tsx).
- Check: direct and in-app unknown paths show "Page not found" with working Go home navigation after cold and settled boot. Missing local notes retain their note-specific error. Extend `e2e/live-app/error-states.e2e.ts`, replace wording-only route tests with behavior checks, and update the route ADR.

### 3. Clear the clone's inherited named-page slug

- Source/change: [NotePlacementDialog.tsx:57–63,109–117](apps/playground/app/components/organisms/journal/NotePlacementDialog.tsx) seeds/submits the original slug. Default it to empty in clone mode only; preserve relationships mode, date/content/tags/lineage, and existing shared-page data. Explain that explicitly selecting an existing named page shares it rather than creating a unique permalink. No uniqueness migration.
- Check: default clone has a new UUID and no inherited `/p/` link; the original link still resolves correctly. A fresh slug opens the clone. Intentional shared membership still works, as required by `IndexedDBContentProvider.roundtrip.test.ts:147–159`. Update field help; exercise with issue 4.

### 4. Include lineage-stamped journal notes

- Source: clones store `type: 'journal'`, `sourceId: entry.id`; [QueryService.ts:121–136](packages/wql/src/QueryService.ts) rejects nonempty sources other than `'journal'`. The day page filters journal kind. **[INFERENCE]** This split explains the missing clone.
- Change: align journal selection with user journal membership on note and block projections. Distinguish source-note lineage from corpus provenance; preserve seed/non-journal exclusions and backlinks. Do not accept arbitrary unknown sources or change date grouping. Inspect LSP references before modifying exported `sourceMatches`.
- Check: original and same-date clone appear once each in both journal views, with matching totals after reload. Text search finds the clone and backlinks remain; seeded guides, dashboards, efforts, and playgrounds stay excluded. Extend `packages/wql/tests/domainCandidates.test.ts` and the journal E2E clone scenario; document the classification correction.

### 5. Search titles and bodies in FIND

- Source: [wqlSearchSource.ts:56–64](apps/playground/app/services/wqlSearchSource.ts) passes drafts to `searchEntries`, which rejects parse errors; static sources extract words separately. Existing search supports title/body matching. **[INFERENCE]** Parsing contributes, but does not establish every reported single-word failure.
- Change: inspect the actual FIND draft, serialize plain text with the existing engine, and reuse content queries. Preserve selected scope and configured defaults, explicit malformed-WQL diagnostics, page results, and existing stale-response guards. No new index or dependency.
- Check: `pushup`, `fran`, unique titles, multi-word body text, and quoted text return expected note identities within scope; selection opens the note. Page search, scope changes, clearing, and rapid query replacement remain correct. Update `wqlSearchSource.test.ts` with behavior checks rather than mock forwarding, plus its contract comments.

### 6. Remove the fabricated CONTAINS count

- Source/change: [FacetProperties.tsx:338,426–427](apps/playground/app/nav/panels/FacetProperties.tsx) defaults missing counts to zero and already hides null. Use null for freeform rows; retain genuine categorical counts and the main results total. No extra count query.
- Check: two matching notes show no misleading zero badge. Include/exclude/remove/clear still work; categorical counters remain. Verify the rendered sidebar; update existing coverage only if it pins the old badge.

### 7. Validate MET at its YAML path

- Source/change: [effort-markdown.ts:194–231,286–311](apps/playground/src/repositories/effort-markdown.ts) ignores top-level MET and defaults missing nested MET to zero. Distinguish missing `baseAttributes.met` before defaulting; name that path for invalid values. Preserve edit-mode `baseEffort` fallback and the nested schema.
- Check: top-level `met: 5` fails without saving; nested `met: 5` succeeds. Missing, zero, negative, and nonnumeric values fail; edit fallback remains valid. Extend `effort-markdown.test.ts` with validation behavior; replace its exact-message assertion rather than re-pin prose.

### 8. Accept the GitHub Pages fallback status

- Source/decision: [404.html](apps/playground/public/404.html) redirects to root; `index.html` restores the URL. [generate-static-shells.ts](scripts/generate-static-shells.ts) already supplies finite public-route shells. Keep this design. Revisit server-side rewrites only if clean dynamic-route HTTP responses become required; hash routing changes existing links.
- Check: after issue 2, valid direct links recover with path/query/hash intact and unknown links show the 404 view. Generated shells remain available. Accept the initial dynamic-document 404, not missing assets or JavaScript exceptions.

## Final verification

Repeatable verification commands:

```sh
bun test apps/playground/src/repositories/effort-markdown.test.ts --preload ./apps/playground/tests/unit-setup.ts
bun run test:playground:unit
bun run test:packages
bun run build:app
E2E_TARGET=preview bun x playwright test --config playwright.journal.config.ts --project journal-chromium e2e/live-app/note-persistence-save-load.e2e.ts e2e/live-app/error-states.e2e.ts e2e/live-app/journal-entry.e2e.ts
```

Exercise actual clone, palette, and sidebar UI on desktop and 390×844. Check deployed direct links too; Vite preview does not prove GitHub Pages fallback behavior. Close each issue only with its acceptance evidence; record 8 as accepted, not fixed.

## Implementation evidence

- [x] 1. Completion awaits the atomic recorder; Saved appears after commit. Next-driven completion and partial Exit persist. Failed writes retain the payload and ID, block dismissal, and expose Retry save. Production E2E proves three distinct runs, events, exact Sessions links, reload, rollback, and retry.
- [x] 2. Unconditional wildcard preserves loading/re-seed recovery and renders the existing not-found view. Cold and in-app unknown-route checks pass; mobile Go home works.
- [x] 3. Clone defaults to no named page. Fresh named-page selection, original membership, and lineage survive. Shared named pages remain allowed.
- [x] 4. Journal scope includes UUID and legacy `journal/YYYY-MM-DD` lineage. Corpus exclusions remain. Candidate/whole-store parity has an identity regression.
- [x] 5. FIND searches titles and bodies in the live or configured scope. Desktop and 390×844 quoted phrase searches open the expected named note. Incremental quote typing stays guided. Note saving indexes the stored title before building search rows.
- [x] 6. Freeform CONTAINS rows omit fabricated counts. Actual sidebar smoke and conditions tests cover the change; categorical counts remain.
- [x] 7. Effort validation names `baseAttributes.met`, rejects misplaced/invalid values, and retains edit fallback. Parser tests and actual effort creation cover both failure and success.
- [x] 8. Accepted, not fixed. Live `wod.wiki` dynamic-note HEAD returns HTTP 404; browser fallback preserves path, query, and hash and displays the expected local-only missing-note state. No hosting or URL-scheme change.

Verification observed: playground unit suite 2857 passed across 282 files; package types and package/application builds passed. Shared package suite had 163 passing files and one unrelated performance failure, alias lookup averaged 1.312 ms against a <1 ms assertion. The UI package suite passed 120 tests, and affected hook/query/composer regressions passed 26 tests. Changed-source lint reports no errors and four warnings. The playground typecheck script explicitly skips strict tsc; Vite build is its configured compile check. Documentation links pass.

Final production E2E: 20 passed, 1 existing IndexedDB-rejection quarantine skipped, across persistence, journal, and error-state files. Journal boot waits for the existing seed-readiness gate before reload; both legacy-date-note clones and UUID-note clones list correctly. Final WQL suite: 626 passed, 5 skipped across 50 files. Final affected playground checks: 93 passed. Sidebar exclude still emits the existing unsupported `!text:` advisory; this remediation changes badges, not text-negation semantics.
