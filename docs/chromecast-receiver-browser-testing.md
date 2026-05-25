# Chromecast receiver browser testing

Use this lane when you need to validate the receiver shell without a physical Chromecast device or CAF session.

## Goals

- render the receiver waiting shell in a normal desktop browser
- verify the offline / no-CAF fallback instead of a stuck black loader
- exercise the explicit standalone testing lane

## Start the receiver locally

From the repo root:

```bash
bun run dev:app
```

Open one of these URLs:

- normal receiver entry: `http://127.0.0.1:5173/receiver-rpc.html`
- explicit standalone mode: `http://127.0.0.1:5173/receiver-rpc.html?receiverMode=standalone`

## Expected behaviour

### `?receiverMode=standalone`

- skips CAF bootstrap entirely
- dismisses the boot loader immediately
- renders the waiting shell with status `waiting-for-cast (standalone)`
- lets you inspect layout/copy in any browser

### plain `receiver-rpc.html`

- attempts normal CAF startup when available
- if CAF is missing, dismisses the loader and renders the fallback waiting shell
- if CAF starts but `READY` never fires, times out into the fallback waiting shell instead of staying black
- if receiver start fails, keeps the waiting shell visible with recovery copy

## Validation commands

Targeted unit coverage:

```bash
bun test ./src/services/cast/receiverBootLoader.test.ts --preload ./tests/unit-setup.ts
```

## When to use this lane

Use browser testing for:

- waiting-shell copy/layout changes
- loader lifecycle regressions
- offline or missing-CAF resilience checks

Do **not** use it as proof of end-to-end Cast transport health. For sender/session validation, use the emulator-hosted Chromecast workflow documented in the testing runbooks.
