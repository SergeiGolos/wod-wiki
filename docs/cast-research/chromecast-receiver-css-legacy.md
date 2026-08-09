# Chromecast receiver renders unstyled on TV — root cause & fix

**Status:** FIXED in `vite.receiver.config.ts` (`legacyReceiverCssPlugin`, build-only). Verified against the built artifact — see Verification.
**Date:** 2026-08-09

## Symptom

Casting to the TV shows the receiver with content but no styling — no layout,
colors, or typography. The local debug second window (`?local=<sessionId>`
popup) renders correctly.

## Why local works and TV doesn't

Both paths load the **same** `receiver-rpc.html` + the same bundled
`@/index.css` (`playground/src/receiver-rpc.tsx:42`). The difference is the
browser engine, not the code path:

| Path | Engine | Result |
|------|--------|--------|
| Local debug tab | desktop Chrome (current) | full styling |
| TV (CAF receiver) | Chromecast firmware Chromium / Android System WebView | no styling |

Chromecast receiver Chromium is pinned by device firmware (legacy Chromecast
Gen 1–3/Ultra ≈ Chromium 70; Chromecast with Google TV = Android System
WebView, commonly Chrome 83–98 until updated via Play Store). The TV renders
content and runs the JS (the app visibly works), so the device parses modern
JS — but its CSS engine is below Chrome 99.

## Root cause: Tailwind v4 output is Chrome 111+ only

The shipped receiver stylesheet (`storybook-static/assets/receiver-*.css`,
246 KB, tailwindcss v4.3.2) contains:

| Feature | Occurrences | First supported | Effect on older Chromium |
|---|---|---|---|
| `@layer` blocks (theme, base, components, utilities, properties) | 5 | Chrome 99 | **entire layer dropped by the parser → zero styles** |
| `color-mix()` | 832 | Chrome 111 | guarded by Tailwind's own `@supports` fallbacks (412 blocks) — degrades gracefully |
| `oklch()` / `@property` | 125 / 74 | Chrome 111 / 85 | invalid values dropped; `@property` at-rule skipped |

Everything Tailwind emits — theme tokens, base reset, all utilities — lives
inside `@layer` blocks. A WebView < Chrome 99 discards all five layers
wholesale, which produces exactly the observed "no style at all". The inline
`<style>` boot loader in `playground/receiver-rpc.html` is plain CSS, which is
why the splash screen looks right and the app after it doesn't.

This matches the official Tailwind v4 baseline: Safari 16.4+, Chrome 111+,
Firefox 128+. Chromecast receivers are below that line.

## Fix (validated PoC)

Only the **built receiver artifact** needs lowering — the dev-server path
(local debug tab) is fine as-is and stays untouched. Two-step post-process of
the emitted `receiver-*.css` (run from a `closeBundle` plugin in
`vite.receiver.config.ts`, or a small script chained after
`postbuild-storybook`):

1. **Unwrap `@layer` blocks** with postcss (already in node_modules). The file
   has a single layer order declaration, so unwrapping in document order
   preserves the cascade. Drop `@property` at-rules (old parsers skip them
   anyway). Lightning CSS alone does **not** lower cascade layers — this step
   is mandatory.
2. **Lower colors with Lightning CSS** (already in node_modules,
   v1.32.0) at `targets: { chrome: 87 }`. It emits hex/rgb fallbacks first and
   wraps `lab()` upgrades in `@supports (color:lab(...))` — safe progressive
   enhancement.

PoC result on the real built stylesheet:

```
before: @layer=5  @property=74  oklch=125  color-mix=832
after:  @layer=0  @property=0   oklch=0    lab() only inside @supports upgrades
size:   246,538 → 244,902 bytes
```

`--color-*` theme vars resolve to hex at base level; utilities keep their
`var()` indirection. Tailwind's own `@supports (color:color-mix(...))`
fallbacks remain intact.

**What degrades on the old engine:** registered-property transitions
(`@property`-driven transform animations) and wide-gamut color precision.
Layout, flex/grid, typography, and all colors are preserved.

### Optional hardening

- `vite.receiver.config.ts` has no `build.target` — Vite's default
  (~Chrome 87) is why the JS already runs on the TV. If legacy Chromecast
  (Chromium ~70) must be supported, set `build.target: 'chrome70'` and
  `build.cssTarget` to match, and re-check `?.`/`??` usage.
- The fix ships to **both** published receiver artifacts (GitHub Pages
  playground build and storybook-static), since both bundle the same
  Tailwind v4 CSS. The playground build (`playground/vite.config.ts`) would
  need the same pass if the registered Cast App ID points at
  `wod.wiki/receiver-rpc.html`.

## Google Cast receiver best practices — gap check

| Practice | Status in repo |
|---|---|
| Serve receiver over HTTPS | ✅ wod.wiki / storybook.wod.wiki |
| Custom receiver controls its own CSS | ✅ but CSS must target the device engine — **this is the bug** |
| Remote debugging via `chrome://inspect` while the app runs on the device | use this to confirm the WebView version on the target TV |
| Overscan: keep UI inside a ~10% safe-area margin | ⚠️ `body` and panels use full-bleed `h-screen w-screen`; no safe-area inset |
| Idle/branding screen while waiting for a sender | ✅ `waiting-for-cast` splash |
| No interaction required; D-pad navigation | ✅ `useSpatialNavigation`, `data-nav-id` attributes |
| Keep receiver lightweight (low-end hardware, limited memory) | ⚠️ receiver bundles the full app CSS (246 KB) and shared vendor chunks; a receiver-scoped content scan would shrink both |

## Verification (done)

1. `bun x vite build --config vite.receiver.config.ts` → emitted
   `storybook-static/assets/receiver-*.css` has **zero** `@layer`, `@property`,
   `oklch`; all 138 `lab(` occurrences sit inside `@supports` upgrade blocks;
   theme vars are hex (`--color-zinc-950:#09090b`); fresh sourcemap written.
2. Built `receiver-rpc.html` served statically and driven in headless Chromium
   at 1920×1080: 2,360 rules parsed, `body` computes to `rgb(0,0,0)` via the
   `.bg-black` → `var(--color-black)` chain, white foreground, flex layout,
   idle splash centered and styled (screenshot verified). The
   `waiting-for-cast (degraded)` suffix is the expected boot fallback without
   a CAF cast context, not a styling issue.
3. Dev path untouched: the plugin is `apply: 'build'` in the receiver config
   only — the playground dev server (local debug tab) serves Tailwind v4 CSS
   as before.

## Still open

- **On-device check**: cast to the TV, `chrome://inspect` the receiver,
  confirm parsed rule count and record the actual WebView version.
- **Playground production build** (`playground/vite.config.ts` → wod.wiki)
  still ships unlayered v4 CSS for its `receiver-rpc.html`. It was NOT
  lowered because the playground build emits one CSS asset shared with the
  main app, and unwrapping layers there changes cascade precedence for the
  50 hand-written unlayered rules (they currently beat layered utilities
  regardless of position). If the registered Cast App ID (`38F01E0E`) points
  at `wod.wiki/receiver-rpc.html`, either repoint it at the (now lowered)
  storybook-static receiver, or split the receiver's CSS into its own asset
  in the playground build and lower only that one.
- **Overscan / weight** items from the best-practice table above remain.
