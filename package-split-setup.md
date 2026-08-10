# Package Split Setup

## Goal

Turn the wod-wiki monorepo into packages with clean, one-way seams — `wod-wiki-core`
(data vocabulary), `wod-wiki-lang` (parse + compile + execute + analytics-gen),
`wod-wiki-wql` (pure query), `wod-wiki-sources` (markdown + lint), `playground` (UI) —
so each tests, validates, and releases independently. Boundaries are settled in
[`CONTEXT.md` § Packages](./CONTEXT.md#packages-the-5-way-split); this is the **setup**
plan. Execution order tracks the wayfinder map (`docs/wayfinder/split-into-packages.md`).

## Setup decisions — principal

**Repo layout (DECIDED: 3 repos, not 5).** The five packages are not equal in coupling:
core, lang, and wql are **tightly coupled and must co-release** (every core change ripples
into lang and wql; they share the CodeMirror/Lezer singleton problem). sources and
playground have genuinely independent cycles (data/app). So:

- **`wod-wiki-packages`** — one workspace repo holding **core + lang + wql** as separate
  packages sharing one `node_modules`. ⟹ **solves the CM/Lezer singleton by construction**
  (landmine #3 disappears: one CM instance, no published-package dedupe), and one version
  sync for the coupled trio. They stay *separate packages with clean seams* — this is not
  a god-package.
- **`wod-wiki-sources`** — markdown data + parser-only lint + collection→index build; its
  own CI (validates via `wod-wiki-lang` as an npm dep) + **own GitHub Pages** deploy.
- **`wod-wiki-playground`** — this repo becomes the app; consumes core/lang/wql + sources'
  index at build time.

Alternative if you want max independence despite the release tax: **5 repos** (one per
package) — but then core/lang/wql each publish independently and you re-fragment the CM
singleton across 3 releases.

## Setup decisions — secondary (DECIDED)

- **npm scope:** `@wod-wiki/*` — `@wod-wiki/core`, `@wod-wiki/lang`, `@wod-wiki/wql`,
  `@wod-wiki/sources-index` (replaces `@bitcobblers/whiteboard-lang` on the next publish).
- **Sources → playground index transport:** publish `@wod-wiki/sources-index` (npm,
  recommended default) vs HTTP-fetch the JSON from sources' GitHub Pages at playground build
  time — still open, resolves during the sources setup task.
- **Release cadence:** packages workspace = one co-released version; sources + playground
  independent.

## Tasks

- [ ] Cut the `workbenchSessionStore → playground` reverse import → Verify: no
      `src → playground` import remains; `bun run test` green
- [ ] Consolidate kernel types (shapes → core; kill `storage.ts → Editor/types` upward
      import; dedupe `core/models/TimeSpan` vs `runtime/models/TimeSpan`) → Verify:
      type-check + `bun run test` green
- [ ] Resolve CM/Lezer singleton (3-repo layout makes it moot — confirm) → Verify:
      decision recorded in CONTEXT.md
- [ ] Stand up `wod-wiki-packages` workspace: move core/lang/wql in; workspace tsconfig +
      single node_modules → Verify: all three packages build in-workspace
- [ ] Publish core / lang / wql (scoped; lang ships a `.../runtime` sub-export so
      pure-TS consumers don't pull React) → Verify: `npm pack` + install from tarball
      into a scratch app; parser storybook renders parse output with no execution import
- [ ] Stand up `wod-wiki-sources`: move `markdown/` + `tools/lint-wods.ts` (fix its stale
      `./wod` path → `markdown/`) + `scripts/generate-static-block-index.ts`; own CI
      validating collections via lang; own GitHub Pages deploy → Verify: CI green; Pages
      site builds; index artifact produced
- [ ] Migrate playground to consume core/lang/wql (workspace or npm) + sources index at
      build time; delete the `@/` source alias in `playground/vite.config.ts` → Verify:
      full app build + e2e green against the packages
- [ ] Remove from the playground repo the engine code that now lives in packages
      (parser/runtime/dialects/analytics-engine/query) → Verify: playground builds purely
      against the packages; no duplicate source remains

## Done When

- Each package builds + tests independently; playground end-to-end green against published
  packages; sources has its own CI + GitHub Pages; no cross-repo cycles; no `@/` alias, no
  duplicated engine code, no shims.

## Notes

- Paused before any code change — this plan locks the setup shape first, as requested.
- If you choose **5 repos** instead of 3, only tasks 4–5 differ (one repo per package +
  published-package CM dedupe returns as real work). — **DECIDED: 3 repos; this note is
  historical.**
- The reverse-import + kernel-consolidation tasks (1–2) are landmines that must be cut in
  this repo regardless of layout — they block every package boundary.
