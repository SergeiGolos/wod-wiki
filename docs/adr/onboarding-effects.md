# Onboarding Effects — Goal Gradient & IKEA

**Status:** Accepted · **Date:** 2026-07-08

> **Referenced in code as ADR-0010.** This ADR is the resolution of wayfinder ticket [#656](https://github.com/SergeiGolos/wod-wiki/issues/656). The existing code-comment citations under the alias `ADR-0010` resolve to this document; the alias is preserved so the ~13 in-tree references do not require a rename.

## Context

The `better-onboarding` branch (commit `b0d5477a3a45f48a543b5275650c6c5e82e9c64d`)
introduces the first user-facing onboarding layer in the playground: a
home-page progress strip, a one-shot first-note wizard, and a few
forward-looking scaffolding files. The commit cites an "ADR-0010" in 13
locations across `playground/src/`, but no such ADR existed before this
document. The cited effects span four named behaviors — Goal Gradient, IKEA
Effect, Contrast Effect, and Reciprocity Guardrail — but they are not
siblings:

- **Goal Gradient** and **IKEA Effect** are *live behavioral effects* —
  they ship visible behavior to the user (banner credit, profile write,
  pinned-effort surface). Each has multiple production consumers.
- **Contrast Effect** is *component-local* — a single visual hierarchy on
  `ExampleTabs`. It has one production consumer and no shared state.
- **Reciprocity Guardrail** is *speculative scaffolding* — `featureGate.ts`
  and `useOptionalAuth()` exist as forward-looking contracts but have
  **zero production consumers** in `playground/src/` or `src/` (verified
  by grep at the time of writing). The "Reciprocity" framing itself is
  a misnomer (Reciprocity describes *giving*, not *gating*); what the
  module actually encodes is a free-tier guardrail.

Because the four cited effects are structurally heterogeneous, this ADR
scopes only the two live behavioral effects and explicitly defers the
other two (see **Non-goals**).

## Decision

### Decision 1 — Goal Gradient Effect

**Goal Gradient is one effect with three pieces, owned together.**

The three pieces:

1. **The step list** — five meaningful first-session steps:
   `visitedLanding`, `editedNote`, `ranWorkout`, `loggedEffort`,
   `openedReview`.
2. **The counter** — a localStorage-backed counter (`STORAGE_KEY =
   "wodwiki.onboarding.v1"`) that idempotently marks each step and
   exposes `{ progress, stepsComplete, totalSteps, isComplete, mark }`.
3. **The banner** — `OnboardingBanner` + `ProgressBar`, which render the
   counter to the user. The banner credits the visit on mount
   (`mark('visitedLanding')`), shows a "Step 1 of N" credit while
   `stepsComplete <= 1`, and switches to the progress bar once more is
   done. Hides itself when `isComplete`.

All three live and die together. The banner without the counter is
decoration; the counter without the banner is invisible; the step list
without both is abstract. If a future surface needs a banner-less
telemetry signal, that is a different effect.

**Boundary.** Goal Gradient lives on the canvas home page (`/`) **only**.
The banner mounts in `MarkdownCanvasPage` when `route === '/'`. The
legacy landing (`/legacy`) does **not** render the banner and does not
fire `mark('visitedLanding')`. The owning surface of the Goal Gradient
"land" credit is the canvas home; the legacy landing is not part of the
onboarding flow.

Note: this is a **boundary** decision, not a deduplication fix. The
`mark` function in `useOnboardingProgress` is idempotent — firing
`mark('visitedLanding')` twice does not inflate `stepsComplete` (see
`useOnboardingProgress.ts:106`: `if (prev[step]) return prev`). The
reason to give the credit a single owner is *clarity of contract*, not
correction of a count bug: a future contributor extending onboarding
should not have to guess which mount of `OnboardingBanner` is canonical.
The implementation ticket
[#659](https://github.com/SergeiGolos/wod-wiki/issues/659) carries the
code change that removes the legacy landing's banner mount and stops its
`visitedLanding` mark.

**Persistence shape.** Counter state is localStorage-backed, per
installation, disposable. It does not sync across devices (by design —
see also the persistence-vs-storage discussion in `playground/CONTEXT.md`
under "Persistence shape"). The shape may evolve without migration code
(unknown/removed keys coerce to `false`).

### Decision 2 — IKEA Effect

**IKEA Effect is the whole First-Note Wizard.**

The user *built a personalized configuration* by answering three quick
questions (training goal, units, pinned effort) and seeing the result
land in the editor as a pinned-effort quick-insert button. The artifact
is the *connection* — neither the questions answered in isolation nor
the button rendered in isolation is the IKEA artifact; the IKEA artifact
is that what the user answered *shows up* in the editor.

The four pieces:

1. **The one-shot gate** — `useIsFirstNoteEver` (localStorage flag
   `wodwiki.firstNoteDone.v1`). Once flipped, the wizard never shows
   again on this installation.
2. **The dialog** — `FirstNoteWizard`, a 3-step Dialog (goal → units →
   pinned effort). Dismissable via Esc, backdrop click, or Skip.
3. **The profile writer** — `playgroundProfile` (localStorage
   `wodwiki.profile.v1`), which merges the wizard's answers into a
   `PlaygroundProfile` (`trainingGoal`, `defaultUnits`, `pinnedEffort`).
4. **The payoff surface** — the pinned-effort quick-insert button in
   `PlaygroundNotePage`'s `actions` slot, which inserts the pinned
   effort at the editor cursor.

All four live and die together; dropping any one breaks the IKEA
contract. The wizard's docstring reflects this: "dismissable via Esc or
backdrop click — forcing completion would kill the IKEA effect (the user
must choose to build)." The implementation ticket
[#660](https://github.com/SergeiGolos/wod-wiki/issues/660) carries the
code-vs-comment reconciliation on the Skip path.

**Dismissal semantics.** The one-shot gate flips when the wizard
*completes*, **not** when it is dismissed. Dismissing (Skip, Esc,
backdrop) closes the dialog without writing to the profile and without
flipping the gate; the wizard may show again on the next note creation.
This matches the docstring's intent.

**Persistence shape.** Profile is localStorage-backed, per installation,
disposable. It joins the Goal Gradient counter in living outside the
IndexedDB content store because both are *cross-cutting metadata*, not
user *content* — they survive a content wipe and intentionally do not
sync across devices.

## Consequences

- **+** The two live effects have explicit scope. Future contributors
  extending onboarding know which pieces move together (Goal Gradient
  = step list + counter + banner; IKEA = gate + dialog + profile writer
  + payoff surface) and which pieces are independently swappable
  (e.g. the counter's storage layer can change without altering the
  banner's render).
- **+** The boundary of Goal Gradient is sharp: canvas home only.
  Future surfaces that want onboarding visibility opt in explicitly;
  the legacy landing cannot accidentally re-introduce the credit.
- **+** IKEA dismissal semantics are now consistent with the wizard's
  docstring. Dismissing is a real choice the user can make; the IKEA
  effect is preserved across dismissals.
- **+** ADR-0010 alias records the citation chain. Code comments do
  not need to be renamed.
- **−** Reciprocity Guardrail's removal (see Non-goals) means there is
  no longer a "sanctioned path" to auth state. When auth is added, the
  author must re-introduce a single seam (a successor to
  `featureGate.ts`) and re-decide its naming.
- **−** Contrast Effect remains under the `ADR-0010` alias in
  `ExampleTabs.tsx` even though it is no longer scoped by this ADR. The
  alias resolves to this document; the code-comment citation is
  honest-but-aspirational until Contrast's own ADR lands.

## Non-goals

- **Contrast Effect.** A visual hierarchy on `ExampleTabs` (anchor tab
  gets elevated styling when inactive, with a transient badge). Real,
  but component-local — one molecule, no shared state, no seam. The
  in-code citation "ADR-0010, Contrast Effect" remains valid (this ADR
  acknowledges it exists) but Contrast Effect is **not** a Decision of
  this ADR. Defer to a future ADR if a second anchor-styled surface
  appears or the rule grows beyond `ExampleTabs`.
- **Reciprocity Guardrail (rejected).** `featureGate.ts` and
  `featureGate.test.ts` are **removed** from this branch. The module
  encoded a free-tier guardrail (not a "Reciprocity" effect — that name
  describes *giving*, not *gating*). It had **zero production
  consumers** at the time of writing: `canUseFeature` and
  `useOptionalAuth` were referenced only inside `featureGate.test.ts`.
  The two review rules in the deleted docstring ("no feature component
  may import `useAuth` directly"; "any PR adding an auth dependency
  must add a featureGate entry") die with the file. They guarded a
  thing that did not exist (`useAuth` was referenced nowhere in the
  repo) and are aspirational scaffolding, not load-bearing policy.
  When real auth arrives, that work gets its own ADR; the auth seam
  should funnel through one place, but the place and its naming are
  out of scope for this onboarding-effects ADR.

## Cross-references

- Implementation ticket:
  [#656](https://github.com/SergeiGolos/wod-wiki/issues/656) — this ADR.
- Boundary fix (legacy landing drops banner + mark):
  [#659](https://github.com/SergeiGolos/wod-wiki/issues/659).
- Dismissal / Skip fix:
  [#660](https://github.com/SergeiGolos/wod-wiki/issues/660).
- Wayfinder map:
  [#655](https://github.com/SergeiGolos/wod-wiki/issues/655).
- Domain language: see `playground/CONTEXT.md` for **Storage** /
  **Persistence** / **Workbench Session** vocabulary used in
  "Persistence shape" subsections.