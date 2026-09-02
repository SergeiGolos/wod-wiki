---
labels: [wayfinder:map]
title: "Full-round e2e coverage — remaining open work"
map: "#690"
open_tickets: ["#690 (map)", "#697", "#719", "#720"]
status: "Coverage shipped; residue is quarantines + preview parity"
audited: 2026-09-01
---

# Wayfinder Map — Full-round e2e coverage (#690)

## Already delivered in this wayfinder (closed / landed)

- Full-round specs: `e2e/live-app/` (runtime-execution, review-surface,
  error-states, cast-roundtrip, widget-edit-behavior), `e2e/gates/`
  (journal/mobile/dark smokes), storybook smokes (`e2e/storybook*.e2e.ts`),
  production smoke (`e2e/smoke/production.smoke.e2e.ts`).
- #709 static shells for public routes (`scripts/generate-static-shells.ts`,
  wired into the playground build) — deep-link 404 softening.

## Still open — what each ticket would change

### #719 — Remediate quarantined live-app specs

- Today: 8 `test.fixme` quarantines in `e2e/live-app/` with e2e-remediation
  notes referencing this ticket: effort-detail ×2, efforts-catalog ×1,
  efforts-ui ×3, playground-full-integration ×1, results-widget-inlay ×1.
  Three (efforts-ui) are annotated "needs product decision (#719)";
  effort-catalog detail-page testids are still absent from the app.
- Change if done: converts quarantined specs into real coverage over
  effort detail/catalog flows and the results-widget inlay — the app needs
  testids and three product calls before the specs can be un-skipped.

### #697 — Final green sweep: zero open quarantines

- Today: quarantine count is 8, not 0.
- Change if done: purely a gate — CI runs with no `fixme`/`skip` left in
  `e2e/`. Strictly downstream of #719 (and of whatever product decisions it
  spawns). Changes nothing at runtime; changes the meaning of green.

### #720 — Preview-build parity (3 spec files vs production bundle)

- Today: 1 of 3 fixed (`NoteEditor.tsx:547-550` assigns `__codemirrorView`
  unconditionally). Remaining: `e2e/live-app/cast-roundtrip.e2e.ts:47-49` still
  `test.skip()`s under `E2E_TARGET=preview`, and the production-decoration issue
  in widget-edit-behavior is unverified.
- Change if done: those specs run against the production bundle in CI, so
  preview/dev-only regressions (build-time tree-shaking, decoration wiring)
  get caught before deploy instead of after.

## Next step

Make the three efforts-ui product decisions (#719) — they unblock most of
#697's sweep. #720's two leftovers are independent and small.
