# Explorer Deep-Link Cold Load — 404 Status

**Ticket:** #909 · **Map:** #898 (Dashboard-as-Note) · **Date:** 2026-08-04 · **Branch:** metrics-explorer

Question: cold-loading `https://wod.wiki/analytics/explorer?q=...` returns a 404; the route only works via in-app navigation. These links put the query in `?q=`, so they're meant to be shareable.

---

## Verdict (answered up front)

**The page already renders correctly in a real browser on a cold open.** The reported "404" is the **HTTP status code** GitHub Pages returns for every deep link — not a broken page. Pages has no path-rewrite mechanism, so it cannot serve `index.html` with a 200 for unknown paths. Decision: **accept the status-quo** (works in browsers), document it here, and pin the contract with a cold-link smoke test. A status-code fix is hosting-level (move prod to the existing S3+CloudFront pipeline, or put a Cloudflare worker in front) and is out of scope for this map.

## Request flow today

```
DNS wod.wiki → GitHub Pages (static, no rewrites)
  → unknown path returns HTTP 404 with body playground/public/404.html
    → inline script stores location.href (query included) in
       sessionStorage['spa-redirect'] and location.replace('/')
      → index.html inline script (playground/index.html:17-23) reads the
         stored URL and history.replaceState's it before BrowserRouter boots
        → Routes render /analytics/explorer, nuqs/useExplorerQueryState
           restores ?q=
```

Verified live: a raw `GET https://wod.wiki/analytics/explorer` and `/journal` both return **HTTP 404**; `GET /404.html` returns the fallback page. A JS-executing fetch of `/analytics/explorer` boots the app and renders the Metric Explorer with the correct document title and `?q=` preserved. So the redirect hack works in browsers — only the served status is 404.

This is **not specific to `/analytics/*`**: every deep link cold-loads with HTTP 404. The explorer is just the one surfaced by the dogfood report because its `?q=` links are explicitly shareable.

## Why no code-only fix

GitHub Pages is static file hosting. There is no rewrite/fallback config that can change the status code for unknown paths. The `404.html` + `index.html` pair is already the best achievable on Pages. The deploy pipeline is `.github/workflows/_release.yml` (`upload-pages-artifact` / `deploy-pages`). (Previews, by contrast, deploy to S3+CloudFront via `.github/workflows/main.yml`, which *does* support SPA fallback — but prod does not.)

## What the 404 status actually breaks

Users in a browser: nothing — the page renders. The status matters for crawlers/search, link-unfurlers (social/Slack previews), and any status-checking client or monitoring that treats 404 as dead.

## Accepted resolution

- **Document** (this note): the cold-load renders; the 404 is a Pages limitation.
- **Smoke test** (`e2e/smoke/production.smoke.e2e.ts`, "#909"): a direct `page.goto('/analytics/explorer?q=...')` asserting the explorer renders and the URL survives the redirect round-trip — pins the real contract (render, not status) against regressions in the `404.html`/`index.html` fallback pair.

## Out-of-scope alternatives (recorded for a future infra decision)

- **Move prod to the existing S3+CloudFront pipeline** — previews already use it; add a 404→`/index.html` custom error response with 200 (and 403) and point `wod.wiki` at the distribution instead of Pages. Fixes the status for all deep links; rewrites the prod deploy pipeline.
- **Cloudflare worker in front of Pages** — origin stays Pages; a worker rewrites non-asset GETs to `/index.html` with 200.

## Verification

All claims read against the repo 2026-08-04 (branch `metrics-explorer`): `playground/public/404.html`, `playground/index.html:17-23`, `playground/src/App.tsx:355` (BrowserRouter) + routes table, `playground/src/lib/routes.tsx:46,158-166` (`analyticsExplorerPath`), `playground/vite.config.ts`, `.github/workflows/_release.yml` & `main.yml`. Live HTTP behavior verified against `https://wod.wiki`.
