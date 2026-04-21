# Fix E2E Tests — Local Worktree Setup

**Status:** Blocked — test files need fixes before they can pass  
**Date:** 2026-04-21

## Context

E2E tests in `e2e/live-app/` cannot run locally. The Docker container owns `node_modules` (root via named volume), so we use a **git worktree** with its own `node_modules` for local e2e execution.

## Infrastructure Setup (Already Done)

### 1. Docker playground runs on port 6173 (not 5173)

This keeps port 5173 free for local Vite dev / Playwright.

**Files changed:**
- `docker-compose.yml` — added `VITE_PORT=6173` env var to playground service
- `configs/playground-entrypoint.sh` — uses `${VITE_PORT:-5173}` for `--port`
- `ts-serve-playground.json` — proxy target changed to `http://playground:6173`

### 2. Playwright config uses dotenv for base URL

`playwright.journal.config.ts` (already committed upstream) reads `.env.local` for an optional `HTTPS_HOST`. Defaults to `http://localhost:5173` when unset.

### 3. Git worktree for e2e execution

```bash
cd ~/projects/wod-wiki/wod-wiki
git worktree add ../wod-wiki-e2e -b e2e/main
cd ../wod-wiki-e2e
bun install
bun x playwright install chromium
```

This gives us a clean `node_modules` owned by our user, independent of the Docker volume.

### 4. Running the tests

```bash
cd ~/projects/wod-wiki/wod-wiki-e2e
bun run test:e2e:journal
```

Playwright starts its own Vite dev server via `webServer.command` on port 5173 (`reuseExistingServer: true`).

---

## Bugs to Fix

### Bug 1: Wrong relative imports in `e2e/live-app/*.e2e.ts`

Page objects live at `e2e/pages/`, but tests in `e2e/live-app/` import them as `./pages/` (relative to `live-app/`), which resolves to `e2e/live-app/pages/` — a nonexistent path.

**Error:** `Cannot find module './pages/JournalEntryPage'`

**Files to fix:**

| File | Current import | Fixed import |
|------|---------------|--------------|
| `e2e/live-app/journal-entry.e2e.ts:19` | `'./pages/JournalEntryPage'` | `'../pages/JournalEntryPage'` |
| `e2e/live-app/journal-scroll.e2e.ts:2` | `'./pages/JournalPage'` | `'../pages/JournalPage'` |
| `e2e/live-app/wod-index-play-button.e2e.ts:2` | `'./pages/JournalEntryPage'` | `'../pages/JournalEntryPage'` |

### Bug 2: Hardcoded Tailscale URLs in page objects

The page object classes hardcode the Tailscale HTTPS domain. They should accept the base URL from the Playwright config (or test) instead.

**Files to fix:**

- `e2e/pages/JournalEntryPage.ts:3` — `const APP_URL = 'https://pluto.forest-adhara.ts.net:5173'`
  - Should default to `'http://localhost:5173'` or accept via constructor (it already does — the constructor accepts `baseUrl` with this as default, so callers pass `LOCAL_APP_URL`)
  - **Fix:** change default to `'http://localhost:5173'`

- `e2e/pages/JournalPage.ts:3` — `const PLAYGROUND_URL = 'https://pluto.forest-adhara.ts.net:5173'`
  - Constructor does NOT accept a baseUrl parameter — it's hardcoded.
  - **Fix:** add `baseUrl` constructor param (default `'http://localhost:5173'`) and use it in `goto()` like `JournalEntryPage` does

### Bug 3: Hardcoded URL in `wod-index-play-button.e2e.ts`

`e2e/live-app/wod-index-play-button.e2e.ts:5`:
```ts
const LOCAL_APP_URL = 'https://localhost:5173';
```

This is HTTPS on localhost — will fail without `ignoreHTTPSErrors`. Since the journal config only sets that when `HTTPS_HOST` is present, this test will fail by default.

**Fix:** use `http://localhost:5173` (or better, read from Playwright's `test.info().project.use.baseURL`).

Also line 22 has a stale error message referencing `localhost:5174`.

### Bug 4: `vite.config.ts` allowedHosts duplication (minor)

The Docker entrypoint `sed` injects `allowedHosts: true` on every container start, but the upstream `vite.config.ts` already has `allowedHosts` set. Each restart appends another copy, producing duplicate-key warnings.

**Fix options:**
1. Remove the `sed` line from `configs/playground-entrypoint.sh` since the repo already has `allowedHosts: true`
2. Or make the `sed` idempotent (check before inserting)

---

## Summary of Required Changes

```
e2e/live-app/journal-entry.e2e.ts          — fix import path ./pages → ../pages
e2e/live-app/journal-scroll.e2e.ts         — fix import path ./pages → ../pages
e2e/live-app/wod-index-play-button.e2e.ts  — fix import path ./pages → ../pages
                                               fix LOCAL_APP_URL to http://
                                               fix stale error message port
e2e/pages/JournalEntryPage.ts              — change default APP_URL to http://localhost:5173
e2e/pages/JournalPage.ts                   — add baseUrl param, change default to http://localhost:5173
configs/playground-entrypoint.sh           — remove sed (or make idempotent)
```

## Verification

After fixes, run from the worktree:

```bash
cd ~/projects/wod-wiki/wod-wiki-e2e
bun run test:e2e:journal
```

Expected: Vite starts on localhost:5173, Playwright runs all `e2e/live-app/*.e2e.ts` tests against it.
