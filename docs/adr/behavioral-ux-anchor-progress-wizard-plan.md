# PRD-0010: Behavioral UX — Anchor, Progress, Reciprocity Guardrail, First-Note Wizard

**Status:** Draft — paired with [ADR-0010](./behavioral-ux-anchor-progress-wizard.md)
**Date:** 2026-07-06
**Owner:** UX (proposed)
**Related audit:** `improvement-candidates-review` — behavioral-ux-audit-2026-07-06

---

## Problem Statement

The wod.wiki playground is structurally generous — no signup, no paywall, no friction to first run. That alone buys us a real reciprocity advantage. But three structural gaps erode that advantage the moment a user lands:

1. **No recommended default is shown.** A new visitor sees three equally-weighted tabs in the code-example widget and three equally-weighted CTAs in the hero. They have no signal that *WITH WEIGHT* is the most common first workout format, or that the *edit example* path is the canonical first interaction. Defaults matter because most users never override them.

2. **No sense of progress.** A first-time visitor has no notion of having "started." The hero credits no action, the editor has no first-run banner, the workout screen has no completion glow. By the time the user has done five meaningful things (land, edit, run, log, review) they should feel they have *finished something*, not that they have wandered into the middle of an app.

3. **Cold-start after page creation.** The moment a user clicks "New page" they are dropped into an empty editor with no personalization step, no scaffolding, and no sense of ownership. They have built nothing — so they feel they own nothing, and bounce.

Separately, the reciprocity advantage is *one careless PR away from disappearing*. The first time someone adds `useAuth()` to a non-essential page (e.g. "track which custom efforts this user favorites" in `EffortsCatalogPage`), the no-signup property is gone for that page — and once it's gone for one, it's gone in spirit for all. We need a code-level guardrail, not just a comment in the README.

The user is, in order: a coach or athlete who has never seen the playground; a coach or athlete on their second visit; a coach or athlete on their tenth visit. This PRD serves all three, but the first visit is where the leverage is.

---

## Solution

Four small, independent, surgical changes that move the playground from "3.5 of 6 behavioral principles" to "5 of 6":

1. **Anchor the recommended tab.** Mark `WITH WEIGHT` as the recommended code-example option with elevated brand styling and a "MOST POPULAR" badge. Make it the default selection on first render. The other two tabs stay available and stay one click away — they just no longer compete on visual weight.

2. **Credit first-time visitors immediately.** Add a "Step 1 of 5 · Start by editing the example below ↓" line under the hero headline on first visit. As the user completes each of five onboarding actions, a typed localStorage flag flips and the credit becomes a `<ProgressBar>` showing real movement. When all five are done, the bar auto-hides.

3. **Hard-guard reciprocity at the code level.** Introduce a `featureGate` module that is the *only* allowed import path for `useAuth()`. Every future feature that wants to know who the user is must check the gate first and have a documented non-auth fallback. The reciprocity advantage becomes an architectural invariant, not a polite suggestion.

4. **Close the post-creation cold-start gap.** After `createPlaygroundPage` writes a fresh page, render a 3-step `<FirstNoteWizard>` Dialog for 30 seconds. The wizard collects training goal, default unit system, and a pinned favorite effort; writes them to the user's local profile; and dismisses. It runs exactly once per browser. Returning users go straight to the editor.

---

## User Stories

### Smart Defaults (Contrast Effect)

1. As a first-time visitor, I want to see which code-example option the playground itself recommends, so that I don't have to guess.
2. As a first-time visitor, I want the recommended option to be pre-selected, so that running the example requires zero thought.
3. As a returning visitor who deliberately picks "REPS ONLY", I want my pick to be honored, so that the recommendation doesn't override my choice.
4. As a visitor on a touch device, I want the anchor styling to be obvious without being loud, so that I can tell the recommendation at a glance.
5. As a visitor in dark mode, I want the anchor styling to use the same brand tokens as the rest of the UI, so that the recommendation feels native to the theme.
6. As a coach who shows the playground to athletes, I want the anchor to stay consistent across the three code-example widgets, so that I don't have to explain "this one highlights WITH WEIGHT but this other one doesn't."
7. As a visitor, I want the "MOST POPULAR" badge to disappear once I've made my first selection, so that the UI isn't always nudging me.
8. As a visitor on a slow connection, I want the anchor styling to be CSS-only, so that there's no flash of unstyled content.

### Goal Gradient

9. As a first-time visitor, I want to see a "Step 1 of 5" credit under the hero, so that I feel I have already begun.
10. As a first-time visitor, I want the credit to point at the editor with an arrow, so that I don't have to figure out where to start.
11. As a first-time visitor, I want a visible progress bar to appear after my first action, so that I can see how far I've come.
12. As a first-time visitor, I want every meaningful action I take to advance the bar, so that I never feel I am wasting motion.
13. As a returning visitor, I want the progress bar to stay hidden once I've completed onboarding, so that the UI doesn't keep reminding me of something I've done.
14. As a visitor who clears their browser data, I want the wizard to be skipped on the next visit, so that I'm not punished for resetting.
15. As a visitor on a second device, I want the onboarding state to NOT sync, so that the second device shows me the "first time" treatment as well — onboarding is per-installation.
16. As a developer adding a new onboarding flag, I want the hook to be typed so that I cannot ship a typo, so that silent failures don't slip into production.
17. As a user, I want the progress bar to be dismissable once I'm done, so that the UI respects that I no longer need it.

### Reciprocity

18. As a visitor, I want to use every core feature of the playground without signing up, so that I can evaluate the product on its merits.
19. As a future user, if the playground ever offers cloud sync, I want the sync to be opt-in, so that I can use the playground offline if I prefer.
20. As a future user, if the playground ever offers sharing, I want the share link to work without an account, so that I can send a workout to a friend without friction.
21. As a developer adding a new feature that needs to know who I am, I want the `featureGate` module to tell me whether I need auth and what the fallback is, so that I can't accidentally gate a feature that doesn't need it.
22. As a code reviewer, I want to be able to grep for `useAuth()` and find exactly one import site (the gate), so that any other import is a review-blocker.
23. As a project maintainer, I want auth dependencies to be blocked from `package.json` until at least one gated feature ships, so that the reciprocity property is preserved by build failure.

### IKEA Effect

24. As a first-time page creator, I want a 30-second wizard to ask me three quick questions, so that the page I land in reflects my goals.
25. As a first-time page creator, I want the wizard to write its answers to my own storage, so that I feel ownership of the configuration.
26. As a first-time page creator, I want the wizard to be dismissable with one click, so that I don't feel trapped.
27. As a first-time page creator, I want the wizard to run only once per browser, so that it doesn't become a recurring interruption.
28. As a returning page creator, I want to go straight to the editor, so that the wizard doesn't waste my time.
29. As a visitor on mobile, I want the wizard to be a Dialog, not a full-screen flow, so that I can dismiss it without losing navigation history.
30. As a visitor, I want my pinned favorite effort to appear in the editor toolbar after the wizard, so that the personalization is visible — not just stored.
31. As a developer, I want the wizard trigger to live in `PlaygroundNotePage`, not in `createPlaygroundPage`, so that the page-creation API stays pure.

---

## Implementation Decisions

> Detailed architectural reasoning lives in [ADR-0010](./behavioral-ux-anchor-progress-wizard.md). This section is the implementation summary.

### Modules to be built

| Module | Type | Purpose |
|---|---|---|
| `playground/src/hooks/useOnboardingProgress.ts` | New | Typed localStorage-backed progress state + `mark(step)` setter |
| `playground/src/hooks/useIsFirstNoteEver.ts` | New | One-shot flag for wizard trigger |
| `playground/src/services/featureGate.ts` | New | Static config + `useOptionalAuth()` |
| `playground/src/components/onboarding/FirstNoteWizard.tsx` | New | 3-step Dialog wizard |
| `playground/src/components/molecules/ExampleTabs.tsx` | Modify | Add `anchor` + `badge` props (or modify inline tabs in CodeExampleWidget if no shared molecule) |
| `playground/src/components/molecules/CodeExampleWidget.tsx` | Modify | Default selection logic for anchor tab |
| `playground/src/pages/PlaygroundLandingPage.tsx` | Modify | Render credit/progress under hero; wire `mark('visitedLanding')` on mount |
| `playground/src/pages/PlaygroundNotePage.tsx` | Modify | Trigger wizard when `useIsFirstNoteEver()` returns true |
| `playground/src/components/atoms/ProgressBar.tsx` | New (if missing) | Reusable progress bar; 0/1 prop API |
| 5 onboarding-flag call sites | Modify | Wire `mark(step)` to existing actions (edit, run, log, review) |

### Data model

```ts
// Onboarding state — localStorage, not IndexedDB
export type OnboardingStep =
  | 'visitedLanding' | 'editedNote' | 'ranWorkout' | 'loggedEffort' | 'openedReview'

export interface OnboardingProgress {
  visitedLanding: boolean
  editedNote: boolean
  ranWorkout: boolean
  loggedEffort: boolean
  openedReview: boolean
}
```

Five flags is the right cardinality. Three is too thin to feel like progress; seven dilutes the gradient.

```ts
// Feature gate — module-level const, not React context
export const featureGate = {
  cloudSync:  { requiresAuth: true,  fallback: 'export-zip' },
  sharing:    { requiresAuth: true,  fallback: 'export-zip' },
  reviewGrid: { requiresAuth: false },
} as const
```

The gate is a static config. Changing it requires a deploy, not a state update.

### Wizard contract

The wizard writes to the user's local IndexedDB profile (NOT the playground content store) — three keys:

```ts
profile.set('trainingGoal', 'general' | 'sport' | 'hybrid' | 'rehab')
profile.set('defaultUnits', 'lb' | 'kg')
profile.set('pinnedEffort', string)  // effort id
```

The pinned effort then renders in the `NoteEditor` toolbar as a quick-insert button. This is the visible payoff that turns "I answered questions" into "I built something."

### Design tokens

All visual changes use existing tokens. The anchor-tab treatment reuses `border-brand`, `bg-brand/5`, `text-brand-deep` from the design system. The "MOST POPULAR" badge reuses the label-pill pattern (`rounded-pill bg-brand text-[8px] text-background`). The progress bar (if built) reuses the existing `<ProgressBar>` atom or a minimal new one — no third-party deps.

### Routing / API surface

No API surface change. No new routes. The wizard is a Dialog rendered in-place, not a route. The progress bar is rendered in-place, not a route. The anchor tab is rendered in-place. None of these touch the URL bar, the back button, or deep-linkable state.

---

## Testing Decisions

### What makes a good test for this PRD

Each piece is testable through **external behavior** (what the user sees and does), not implementation details (which storage engine is used, which React hook is consumed). Tests assert:

- The anchor tab renders the badge and uses the elevated style class.
- Clicking a non-anchor tab changes the active state to that tab.
- The default selected tab on first render is the anchor tab.
- `useOnboardingProgress` reads from localStorage on mount.
- `mark(step)` updates localStorage and triggers a re-render.
- `PlaygroundLandingPage` shows the "Step 1 of 5" copy when zero flags are set.
- `PlaygroundLandingPage` shows the progress bar when ≥1 flag is set.
- `useIsFirstNoteEver()` returns `true` once and `false` thereafter.
- The wizard's three answers land in the user's local profile storage.
- The wizard renders dismissable buttons and `Esc` handler.
- `featureGate` is a static `as const` object — verify shape in a snapshot test.

### Which modules get tests

| Module | Test type | Location |
|---|---|---|
| `useOnboardingProgress` | Unit (bun:test) | co-located `.test.ts` |
| `useIsFirstNoteEver` | Unit | co-located `.test.ts` |
| `featureGate` | Snapshot test | co-located `.test.ts` |
| `ExampleTabs` (anchor rendering) | Storybook play test | `stories/catalog/molecules/` |
| `FirstNoteWizard` | Storybook play test | `stories/catalog/organisms/` (or wherever Dialogs land) |
| Landing credit/progress | Storybook play test | `stories/catalog/pages/` |
| Playground landing → first note flow | E2E | `e2e/onboarding/` (new directory) |

### Prior art in the codebase

- **Hook tests:** `usePlaygroundContent.test.ts` (bun:test) is the established pattern for hook tests with localStorage / IndexedDB mocking.
- **Storybook play tests:** The existing molecule/organism stories use `play` functions from `@storybook/test`. The `CodeExampleWidget.test.tsx` file already exists in `playground/src/components/molecules/` — extend it, don't fork it.
- **E2E onboarding flows:** The `e2e/runtime-execution/` directory shows the pattern for full-flow Playwright tests. New directory `e2e/onboarding/` follows the same convention.

### Tests we are explicitly NOT writing

- Tests that mock localStorage at the implementation level (we test the hook through real localStorage + a `beforeEach` clear).
- Snapshot tests of the wizard's exact copy (the copy will iterate; the shape won't).
- Tests that verify "no auth dep is added to package.json" — that's a PR-review concern, not a unit-test concern. The ADR documents it.

---

## Out of Scope

- **Loss Aversion improvements.** The backdate-confirm modal doesn't yet cite the entry count that would be deleted; the export action is buried in a sub-menu. These are real gaps but live in a separate audit and a separate PRD.
- **The underlying auth provider.** `featureGate` and `useOptionalAuth` are forward-looking module names. We do NOT add an auth library, an OAuth flow, or a `User` schema in this PRD. The gate stays empty until a gated feature actually ships.
- **Cross-device onboarding sync.** State is per-installation. A user who logs in on a second device sees the first-time treatment again — by design.
- **Telemetry / analytics.** We are not adding event tracking in this PRD. The `mark()` calls are the natural instrumentation points if a future PRD adds telemetry.
- **A/B testing the anchor choice.** The recommendation is `WITH WEIGHT` because it is the highest-fidelity workout format that still runs on the example. If a future PRD adds telemetry, the anchor can be tuned. For now: ship the recommendation, gather qualitative feedback.
- **Refactoring `EffortsCatalogPage` or any other surface.** The reciprocity guardrail is preventive, not a refactor. We are NOT touching pages that don't need touching.
- **A `SettingsPage` for changing the wizard's answers.** The wizard is one-shot. Changing preferences later requires a different surface (out of scope).
- **The `EffortsCatalogPage` "favorites" feature.** Called out explicitly in the audit as the kind of feature that would destroy reciprocity if implemented with auth. **Do not implement this feature.** If "favorites" is needed, store it in the local IndexedDB profile (like the wizard's pinned effort) and skip the gate entirely.

---

## Further Notes

### Sequencing

The four changes are independent surfaces. Recommended ship order (smallest first, biggest-blast-radius last):

1. **`featureGate` module** — zero user-visible change, but it must exist before any future gated feature lands. Land first as a pure refactor PR.
2. **Anchor tab** — single-molecule change, lowest blast radius. Land second to validate the `anchor`/`badge` prop pattern.
3. **`useOnboardingProgress` + landing credit** — landing-page change + a new hook. Land third once the hook pattern is proven.
4. **Five `mark()` call-site wirings** — small wiring PRs across 5 surfaces. Land as a single PR or split per surface.
5. **First-Note Wizard** — biggest single change (new component + page trigger). Land last; needs the most visual QA.

### Why the audit calls these "worthwhile"

The behavioral-UX audit skill ranks improvements by *principle leverage*, not by implementation cost. These four hit three principles (Contrast Effect, Goal Gradient, IKEA Effect) plus one anti-drift guardrail (Reciprocity). The audit's remaining gap (Loss Aversion) has narrower scope and a separate workstream.

### Anti-patterns to avoid (called out in the audit)

- **Adding `useAuth()` to `EffortsCatalogPage`** "just to track which custom efforts you favor" — destroys reciprocity overnight. Use the local profile storage pattern instead.
- **Storing onboarding flags in IndexedDB** — conflates session state with user content. Use localStorage.
- **Making the wizard a full-page flow** — interrupts navigation. Use a Dialog.
- **Forcing wizard completion** — kills the IKEA effect (the user must *choose* to build). Make it dismissable.
- **Hardcoding the anchor styling in `CodeExampleWidget`** — non-reusable. Make `anchor`/`badge` props on the tab config.
- **Implementing the "favorites" feature in `EffortsCatalogPage`** with auth. Don't.

### Migration / rollback

Each piece is independently reversible:
- Remove `anchor`/`badge` from the tab config → tabs revert to flat.
- Remove the `<ProgressBar>` and the credit from `PlaygroundLandingPage` → page reverts to v1 hero.
- Remove the wizard trigger from `PlaygroundNotePage` → empty editor returns.
- Remove `featureGate` → no surface depends on it yet, so the module is a no-op delete.

No data migrations. localStorage flags degrade gracefully (unknown keys coerce to `false`).