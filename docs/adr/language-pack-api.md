# Language Pack API — umbrella sugar over per-package slices

A consumer extending the engine (a new sport domain, custom units, editor
behaviors) must contribute slices to several packages' registries at once —
tag identity in core, analyzer + analytics in lang, editor extensions in ui.
This ADR names that authoring unit (**Language Pack**, coined into
`CONTEXT.md`) and fixes its registration mechanics: a `defineLanguagePack()`
factory returns a slice-structured object, and the umbrella
`@bitcobblers/wod-wiki-engine` package's `registerLanguagePack(pack)` fans the slices out
in one call. Decided on wayfinder ticket
[#956](https://github.com/SergeiGolos/wod-wiki/issues/956); the registry
shape itself was already settled by
[`dialect-block-alignment.md`](./dialect-block-alignment.md) and is unchanged.

## Decision

```ts
const pack = defineLanguagePack({
  identity: { tags: ['swim', 'swimming'], name: 'Swimming', runnable: true },
  lang:     { analyzer: SwimDialect, analytics: [sendProcessor], language: undefined },
  ui:       { editorExtensions: swimCm },
});

// one call via the umbrella — fans slices to each package's registry:
registerLanguagePack(pack);

// granular path for consumers that don't install the umbrella:
langDialectRegistry.register(pack.lang);
uiEditorRegistry.register(pack.ui);
```

- **Units and fusion rules ride the analyzer.** No first-class `units` field —
  the `IDialect` contributes its Unit set (the rule the glossary already
  states). A second unit path was rejected as a duplicate convention.
- **`language` (custom Lezer grammar / CM `LanguageSupport`) stays optional**
  per `dialect-block-alignment.md`; omit → shared `whiteboardScript` grammar.
- **No display theming or WQL-vocabulary fields** — speculative until a
  consumer asks.
- **CLI:** `wod-run` / `wod-wql` accept a repeatable `--pack <module-spec>`
  flag (dynamic import, default export = the pack, registered before the
  run). Default stack when omitted. Keeps parse parity between app and CLI.
- **Semantics** inherit the existing `Registry`/ADR rules: built-ins
  removable/overridable by id, alias collisions throw at registration,
  overrides never replace the universal defaults (base Dialect Stack, shared
  grammar, default analytics always run).

## Considered options

- **Global registry in core (rejected).** One mutable list every package
  reads. Simplest call site, but it is the god-descriptor `CONTEXT.md`
  explicitly bans, and core's type surface would have to know CM `Extension`s
  — a DAG break (core ← ui dependency).
- **Per-package wiring only, no umbrella helper (rejected).** Purest DAG, but
  every consumer repeats the fan-out by hand and the umbrella package gains
  no API value. Kept as the *escape hatch*, not the primary path.
- **First-class `units` pack field (rejected).** More discoverable for pack
  authors, but creates a second unit path beside Dialect-contributes-units.
- **CLI config-file discovery (rejected for v1).** `.wod-wiki.json`-style
  auto-loading adds implicit behavior and a second place to look when a parse
  surprises you. Revisit only if a pack ecosystem ever demands it.

## Consequences

- Adding a domain = one `defineLanguagePack` + one `registerLanguagePack`.
  No closed enum, no scattered switches (the ADR's original goal, preserved).
- The umbrella package owns exactly one piece of cross-package behavior —
  the fan-out — and does it with plain imports of the slice registries. No
  hidden global state; the pack object is inert data until registered.
- Registration is live: the registry-backed `DialectStack` re-reads its list
  per parse, so runtime registration (Storybook controls, CLI `--pack`) takes
  effect without a reload.
- Public API surface to maintain: `defineLanguagePack`,
  `registerLanguagePack`, the slice registries, and the pack's default-export
  contract for CLI loading.

## Relationship to other decisions

- Extends [`dialect-block-alignment.md`](./dialect-block-alignment.md): that
  ADR fixed the registry's *shape* (tag identity + per-package slices); this
  ADR fixes the *authoring unit and registration mechanics* on top of it.
  Neither changes the runtime — it stays hint-driven and tag-blind.
- Serves the harmonized package split (`CONTEXT.md` § Packages, wayfinder map
  [#953](https://github.com/SergeiGolos/wod-wiki/issues/953)): the API is
  what makes "default dialects bundled, extensions compose on top" work
  across package boundaries.
