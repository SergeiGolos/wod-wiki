# Quickstart: Explore the WOD Wiki System

1) Open the System Overview
- Path: `docs/Overview.md`
- Read the four core sections; follow at least one link in each.

2) Try Parsing
- Open `stories/parsing` in Storybook or view parser files under `src/parser/`.
- Locate an example WodScript and step through how tokens map to constructs.

3) Run a Runtime Demo
- In Storybook, open a runtime story (e.g., `stories/runtime/JitCompiler.stories.tsx`).
- Observe event ordering and deterministic outcomes.

4) Browse the UI
- Open editor and clock components under `src/editor/` and `src/clock/`.
- View corresponding stories under `stories/`.

5) Inspect Metrics
- Read `src/runtime/MetricComposer.ts` and related tests.
- Check how metrics are composed and inherited.
