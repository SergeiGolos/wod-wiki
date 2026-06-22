# ADR-0010: Behavioral UX Anchors — Smart Defaults, Goal Gradient, Reciprocity Guardrail, IKEA First-Note Wizard

**Date:** 2026-07-06
**Status:** Proposed — paired with PRD-0010
**Related:** `PRD-0010-behavioral-ux-anchor-progress-wizard`, `WOD-682-behavioral-ux-audit-2026-07-06`, `behavioral-ux-audit-skill`, `0009-inline-custom-metrics-and-calculated-fields`

---

## Context

A 2026-07-06 behavioral UX audit of `wod.wiki` against six principles (Smart Defaults, Goal Gradient, Reciprocity, IKEA Effect, Loss Aversion, Contrast Effect) found the playground at roughly **3.5 of 6 principles** fully active. Two structural gaps and one guardrail carry the most leverage:

1. **Contrast Effect** — The code-example widget renders `REPS ONLY · WITH WEIGHT · WITH DISTANCE` as three flat, equal-weight pills. There is no visual anchor telling the user which option the playground itself considers the highest-fidelity workout. Users default to "REPS ONLY" because it requires the least thought, not because it's the best fit for their training goal. The audit code is in `playground/src/components/molecules/CodeExampleWidget.tsx` (and the shared `playground/src/components/molecules/ExampleTabs.tsx` if the tabs were promoted into a molecule — see Decision 1).

2. **Goal Gradient** — The landing page hero (`playground/src/pages/PlaygroundLandingPage.tsx`) presents three equally-weighted CTAs to a first-time visitor who has zero notion of having "started." Without an early credit for showing up, the user's first interaction feels like it costs effort for no gain. There's also no persistent progress signal once the user does start, so the gradient is invisible across the next 4–5 meaningful actions (edit a note, run a workout, log an effort, open review).

3. **Reciprocity** — The site has no auth, no signup wall, and no `useAuth` hook anywhere in `playground/src/` (verified: `package.json` has zero auth dependencies). This is an asymmetric competitive advantage — the user gets the entire playground in exchange for nothing. **The risk is not absence but drift**: the first time someone adds a `useAuth()` call to a non-essential page (e.g. "track which custom efforts you favor" in `EffortsCatalogPage`), the reciprocity advantage evaporates overnight. The codebase needs a *defensive* ADR — not a feature.

4. **IKEA Effect** — After `createPlaygroundPage.ts:17` writes a fresh page, the user lands in `PlaygroundNotePage.tsx` staring at an empty `NoteEditor`. They have built nothing; they have nothing to feel ownership of. This is the classic post-onboarding cold-start gap. A 30-second "First Note Wizard" closes it.

This ADR is paired with **PRD-0010** which describes the four changes from the user's perspective; this document records the **architectural decisions** behind them.

---

## Decision

### 1. Promote the recommended code-example tab via a typed `anchor` flag (Contrast Effect)

**Decision:** The molecule that renders code-example tabs (`CodeExampleWidget` if it owns its own tab strip, otherwise the shared `ExampleTabs` molecule) gains an `anchor` flag and an optional `badge` on the tab config. The tab marked as `anchor: true` renders with elevated brand styling and an inline badge; non-anchor tabs render in the existing muted style. **The active-vs-anchor visual hierarchy is preserved** — if the user actively selects a non-anchor tab, it still wins on the `active === t.id` branch; the anchor styling only differentiates **inactive** tabs to nudge selection.

The `ExampleTabs` molecule (currently `playground/src/components/molecules/ExampleTabs.tsx`) is the simpler surface and is the right place to put the `anchor` + `badge` props because both are tab-strip concerns, not CodeMirror concerns. Code-example-specific labels are configured by the caller — the molecule stays generic. If `CodeExampleWidget` already owns its tabs inline (no shared `ExampleTabs` instance), the same `anchor` + `badge` props go on the inline render and no new molecule is introduced.

```ts
// ExampleTabs.tsx — final shape
interface ExampleTab {
  label: string
  anchor?: boolean
  badge?: string
}
interface ExampleTabsProps {
  examples: ExampleTab[]
  activeIndex: number
  onSelect: (index: number) => void
}
```

The `CodeExampleWidget` config that wires the three real tabs (`reps` / `weight` / `dist`) gets the anchor flag applied to `WITH WEIGHT`. The default selection also moves to the anchor tab on first render — this is the "smart default" half of the principle. Users who don't pick anything get the recommended option; users who deliberately pick another get their pick honored.

**Why not just hardcode the styling?** Because the anchor concept is reusable (syntax-group widget can anchor its "Run this example" card the same way), and because the default-selection logic must be data-driven — hardcoding the highlighted tab at the call site means three different code paths can drift.

### 2. Treat onboarding progress as first-class persistent state (Goal Gradient)

**Decision:** A single `useLocalStorage`-backed hook (`useOnboardingProgress`) owns a typed record of onboarding flags. The landing page reads the count of `true` flags and renders either a "Step 1 of N · Start by editing the example below ↓" credit (when zero) or a `<ProgressBar>` (when at least one). Every other surface that completes a meaningful action calls a typed `markOnboardingStep(step)` setter — typed so the call site can't typo a flag name.

```ts
// playground/src/hooks/useOnboardingProgress.ts
export type OnboardingStep =
  | 'visitedLanding'
  | 'editedNote'
  | 'ranWorkout'
  | 'loggedEffort'
  | 'openedReview'

export interface OnboardingProgress {
  visitedLanding: boolean
  editedNote: boolean
  ranWorkout: boolean
  loggedEffort: boolean
  openedReview: boolean
}

export function useOnboardingProgress(): {
  progress: OnboardingProgress
  stepsComplete: number
  totalSteps: number
  mark: (step: OnboardingStep) => void
}
```

**Onboarding flags live in localStorage, not IndexedDB.** The playground stores *content* in IndexedDB via `playgroundDB` (`playground/src/services/playgroundDB.ts`) — onboarding flags are tiny, cross-cutting metadata, not user content. They are intentionally disposable and survive logout (because there is no logout). When a flag's data outlives its purpose (e.g. the user clears all data, or we change the flag set in a future version), the next `useOnboardingProgress()` call coerces unknown keys to `false` — no migration code, no schema version.

**Five flags is the right number.** Three is too thin to feel like progress; seven dilutes the gradient. Five maps to the user's *first session*: land, edit, run, log, review. Anything beyond the first session is no longer onboarding — it's regular use, and the progress bar should auto-hide once `stepsComplete === totalSteps`.

**Why a hook and not a context?** Because the data crosses no component boundaries — landing reads it, every action site writes it, no one in between needs to react. localStorage event listeners handle cross-tab sync without React context.

**Why not a `useEffect`-driven auto-mark on landing mount?** Because the credit "Step 1 of 5" is itself the first step. We mark `visitedLanding` from a one-time `useEffect` on landing mount, but the *visual* still shows the pre-credit copy on the very first render. The credit appears on the *next* render after `mark('visitedLanding')` commits — same shape as a delayed gratification effect.

### 3. Reciprocity is preserved by a `featureGate` module, not by convention (Reciprocity Guardrail)

**Decision:** A `playground/src/services/featureGate.ts` module declares which (future) features require auth and which never will. Every feature component consumes `useOptionalAuth()` and consults the gate before doing anything. **The gate module is the single source of truth — no feature may import `useAuth()` directly.**

```ts
// playground/src/services/featureGate.ts
export const featureGate = {
  cloudSync:  { requiresAuth: true,  fallback: 'export-zip' },
  sharing:    { requiresAuth: true,  fallback: 'export-zip' },
  reviewGrid: { requiresAuth: false }, // stays free forever
} as const

export function useOptionalAuth(): { user: User | null }
```

This is **defensive architecture** — the ADR exists not because the feature exists, but because the first time someone adds a "wouldn't it be nice if we knew which custom efforts this user favorites" call, they will reach for `useAuth()`. The featureGate makes the alternative path one import closer. `EffortsCatalogPage` is the canonical example called out in the PRD: it must NEVER gain a `useAuth` import.

**The reciprocity principle is a product decision, not a code one — but product decisions without code rails drift.** The `featureGate` module is the rail. The PRD calls this out as an anti-pattern to avoid; the ADR turns it into a lint-style architectural rule.

**No auth dependencies enter `package.json` until the first gated feature is actually built.** This is enforceable: a PR that adds an auth dependency must also add at least one feature entry to `featureGate` with `requiresAuth: true`, and that entry must have a non-empty `fallback`.

### 4. First-Note Wizard is conditional and one-shot (IKEA Effect)

**Decision:** A `<FirstNoteWizard>` component runs **only** when `useIsFirstNoteEver()` returns `true` — a flag set in localStorage on the first call to `createPlaygroundPage()`. After it runs once (or is dismissed), the flag flips permanently and the wizard never reappears.

The wizard writes its three answers (training goal, default unit system, pinned effort) into the user's local IndexedDB profile — *not* into the playground's content store. This is the IKEA hinge: the user builds a personalized config in 30 seconds, writes it to their own storage, and immediately feels ownership before they ever run a workout. The wizard is also dismissable via `Esc` or backdrop click, because forcing completion would be the IKEA anti-pattern (the user must *choose* to build).

**Wizard trigger lives in `PlaygroundNotePage.tsx`, not in `createPlaygroundPage.ts`.** The trigger is a render-time decision; `createPlaygroundPage` is a pure data-write function. Mixing them would make the page-creation API impure and harder to test. The hook is colocated with the page that uses it; if a second surface ever needs it (e.g. `EffortsCatalogPage` could offer "Pin your default effort" later), the hook is already extracted.

```ts
// playground/src/hooks/useIsFirstNoteEver.ts
export function useIsFirstNoteEver(): {
  isFirstNote: boolean
  markFirstNoteDone: () => void
}
```

**The wizard itself is a 3-step Dialog, not a full-page flow.** A full-page flow would interrupt navigation and feel like an app the user didn't sign up for. A Dialog runs in-context, dismisses cleanly, and doesn't break the back button.

### 5. Design tokens stay aligned with the existing palette

The anchor-tab styling uses `border-brand`, `bg-brand/5`, `text-brand-deep` — tokens that already exist in the design system (`tailwind.config.cjs` + `src/index.css`). No new colors, no new spacing scale. The "RECOMMENDED" badge reuses the `rounded-pill bg-brand text-[8px] text-background` pattern that the design system already uses for label pills (see `wod-wiki-project-navigation` skill, "Component Patterns" section). The progress bar reuses the existing `<ProgressBar>` atom (or its equivalent) — if no such atom exists, build a minimal one rather than reach for a third-party dep.

The wizard uses the existing `<Dialog>`, `<DialogHeader>`, `<DialogBody>` primitives already in use elsewhere in the playground. No new component primitives.

---

## Consequences

### Positive

- **Per-tenant cognitive lift.** The four changes are independent surfaces (one molecule, one page, one architectural rule, one wizard) — they can ship in any order, in any number of PRs, without coupling.
- **Anti-drift architecture.** `featureGate` is a one-line defense against the most common reciprocity-killing mistake. `useOnboardingProgress` is typed so flag-name typos can't ship.
- **Zero new dependencies.** No auth library, no progress-bar library, no wizard library. localStorage + existing Dialog primitive.
- **5-of-6 principle coverage.** After this PRD lands, the only weak principle is Loss Aversion — which has its own scope (backdate confirm modal, export action visibility) and is tracked separately.
- **Reversible.** Each piece can be reverted in one PR. The wizard's `markFirstNoteDone` flag can be cleared from localStorage to re-trigger; the `anchor` flag on a tab can be flipped off; the progress bar can be removed without touching the hook.

### Negative / Trade-offs

- **localStorage is not a database.** Onboarding flags are 5 booleans (~40 bytes serialized) — well under any quota — but if the project ever migrates to SSR or a cross-device auth model, the hook is the thing to rewrite, not the call sites.
- **The wizard adds a 30-second tax on first run.** Acceptable because it's dismissable and runs exactly once. If telemetry ever shows high skip rates, the wizard's value drops — at that point the right answer is to shorten it to 1–2 questions, not to remove the trigger logic.
- **`featureGate` adds a layer of indirection** for the (currently nonexistent) features it protects. This is intentional — the cost is paid *before* the wrong pattern ships, not after.
- **No telemetry yet.** We can't measure whether the anchor tab is actually selected more often without analytics. Acceptable for v1 — visual inspection of the playground is enough. If a future PRD adds telemetry, the `useOnboardingProgress.mark()` calls are the natural instrumentation points.

### Out of Scope

- **Loss Aversion improvements** (backdate modal entry count, export action visibility) — separate audit, separate PRD.
- **Auth itself.** The `featureGate` and `useOptionalAuth` module names are forward-looking; the underlying auth provider does not exist yet and will not be added by this PRD.
- **Per-user cross-device sync of onboarding state.** A user who clears their browser data resets to step 0 — intentional, not a bug.
- **A/B testing infrastructure.** The audit recommends changes by principle; we ship them, then judge by qualitative use. Building a measurement layer before we know what to measure would be premature.
- **Migration of `EffortsCatalogPage` or any other surface.** The reciprocity guardrail is *preventive*, not a refactor.

---

## Alternatives Considered

### Reject: Highlight the anchor tab with `font-weight` alone

Bold the anchor tab and call it a day. **Why rejected:** font-weight alone doesn't survive dark mode, doesn't scale to mobile, and the "MOST POPULAR" badge is the load-bearing signal — without it, the bold variant just looks like a hover state. The proposed badge pattern (`rounded-pill bg-brand ... text-[8px]`) is the minimum that reads as "recommended" at a glance.

### Reject: Store onboarding flags in IndexedDB alongside content

Use `playgroundDB` for everything. **Why rejected:** onboarding flags are tiny metadata, not user content. Mixing them into IndexedDB conflates "user's workout data" with "user's session state," forces every flag read through an async hook, and makes accidental wipes (clearing the playground) reset onboarding — which is wrong (a returning user who wiped their content should not see the wizard again, but should not see "Step 1 of 5" either).

### Reject: Build the wizard as a 4th step in the landing flow

Inline the wizard into `PlaygroundLandingPage` and gate the CTA on completion. **Why rejected:** this makes the landing page heavier, conflates "discover the playground" with "configure the playground," and turns a dismissable one-shot into a forced flow. The post-creation trigger (in `PlaygroundNotePage`) is the right place because it fires *after* the user has expressed intent by clicking "create a page."

### Reject: Use `useContext` for `featureGate`

A React context provider at the app root. **Why rejected:** `featureGate` is a static config, not state. A module-level `const` is simpler, tree-shakeable, and testable without a provider wrapper. Context is for things that change at runtime; `featureGate` changes at deploy time.

### Reject: Make the wizard skippable but always re-showable

"Don't permanently mark the wizard done — let users re-enter it." **Why rejected:** the IKEA effect requires *one* act of personalization, not a recurring one. A re-showable wizard becomes a settings panel. If users want to change their preferences later, the right answer is a `SettingsPage` (out of scope).

---

## References

- **PRD-0010** — `PRD-0010-behavioral-ux-anchor-progress-wizard.md` (companion document)
- **Behavioral UX Audit** — `wiki/wod-wiki/improvement-candidates-review.md` + `behavioral-ux-audit` skill baseline
- **Design system tokens** — `tailwind.config.cjs`, `src/index.css`, `wiki/wod-wiki/design-system/`
- **Page pattern reference** — `wod-wiki-project-navigation` skill, "Standard Note Page" section
- **Existing hook patterns** — `playground/src/hooks/usePlaygroundContent.ts` (IndexedDB), `useLocalStorage` (if/when introduced)