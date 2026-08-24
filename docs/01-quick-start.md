# Quick start

WOD Wiki is a workout journal that turns Markdown + `time` blocks into a running clock and queryable training history.

## Install

You need [Bun](https://bun.sh). This repo does **not** use npm or yarn.

```bash
bun install
```

## Run the app

```bash
bun run playground
```

Open <http://localhost:5173>. The playground is the reference Vite app in `playground/src/`.

## Run Storybook

Storybook hosts the component catalog and the engine workbench.

```bash
bun run storybook
```

Open <http://localhost:6006>.

## Write your first workout

Create or open any note. Add a fenced `time` block:

```markdown
# My first WOD

```time
5:00 AMRAP
  5 Pull Ups
  10 Push Ups
  15 Air Squats
```

Press **Run**. The block becomes a live clock.

## Run tests

```bash
bun run test              # unit tests in src/
bun run test:components   # integration tests in tests/
bun run test:all          # both
```

## What to read next

- [`02-syntax-reference.md`](./02-syntax-reference.md) — learn the language
- [`04-metric-lifecycle.md`](./04-metric-lifecycle.md) — understand how data flows
- [`05-architecture.md`](./05-architecture.md) — how the app and engine fit together
