# Onboarding Banner — Design Spec

> **Source map:** [#673 Sticky-header OnboardingBanner](https://github.com/SergeiGolos/wod-wiki/issues/673)
> **Tickets that reference this:** #675, #676, #677, #678
> **Status:** draft (closes #674)

The reference document for design variations on the new sticky-header OnboardingBanner. Every variation produced by #675/#676/#677 must conform to the constraints below. Validators (HITL) check variations against this spec.

## 1. Color tokens

### Brand surface palette (the only relevant tokens for the banner)

Defined in `tailwind.config.cjs:69-73`:

| Tailwind class | Hex | Use |
|---|---|---|
| `bg-brand` | `#5980a8` | Primary brand surface (Mineral slate blue) |
| `bg-brand/5`, `bg-brand/10`, etc. | with alpha | Tinted surfaces (current banner uses `bg-brand/5` for the container) |
| `text-brand-deep` | `#3d5c7a` | Brand text on light surfaces (current banner uses for copy text) |
| `dark:text-brand-light` | `#d6e4f0` | Brand text on dark surfaces |

The brand tokens are **hardcoded hex** in `tailwind.config.cjs` — NOT CSS variables (unlike the semantic-state tokens in `src/index.css:35-41`). Do not introduce new brand shades; use the existing palette with alpha modifiers.

### Other relevant tokens

| Token | Class | Value | Use |
|---|---|---|---|
| Card surface | `bg-card` | warm white focus surface | If the banner needs a contrasting surface in dark mode |
| Border | `border-border/60` or `border-border/50` | very faint | Borders on sticky surfaces |
| Foreground | `text-foreground`, `dark:text-foreground` | warm near-black | Body text |
| Muted | `text-muted-foreground` | warm grey | Secondary copy |

### Forbidden for this banner

- `--destructive`, `--warning`, `--accent` — semantic state colors, not brand surfaces.
- New color shades — no custom hex values; stick to the existing tokens.

## 2. Motion patterns

### What's already in the banner

- `ProgressBar`: `transition-[width] duration-500 ease-out` (the only motion). See `playground/src/components/atoms/ProgressBar.tsx:64`.
- The existing fill-pulse from #666: brand-deep → brand over ~200ms (visual flash on step advance).
- Static `ChevronDown` (no motion) — note: the redesign removes the chevron per the map's decision, so this is reference only.

### Patterns elsewhere in the codebase

- `transition-colors` (Tailwind default 150ms) — most common. Used in `FirstNoteWizard.tsx:108,128,154,179`.
- `transition-all duration-200 ease-out` — WidgetEditButton, EditableMarkdown. The "snappy" default.
- `transition-all duration-300 ease-out` enter / `duration-200 ease-in` leave — `Dialog.tsx:34-48`. Modal pattern.
- `transition-[width] duration-500 ease-out` — ProgressBar only. Slow + specific.

### Motion budget for the new banner

- **Default transition for state changes** (e.g. progress fill, hover, completion): `transition-colors duration-200 ease-out`. This is the codebase's snappy default.
- **Fill animation** (if the redesign includes one): `transition-[width] duration-500 ease-out`, matching ProgressBar.
- **No entrance animation** on mount. The banner just appears. The codebase has no precedent for entrance animations on persistent surfaces (the `Dialog` motion is reserved for modals).
- **No continuous / decorative motion.** The chevron's bounce was removed in #667 explicitly for being "the only motion in the onboarding flow and not earning its keep." The redesign carries that decision.

## 3. Density

### Border radius

From `tailwind.config.cjs:75-82`:

| Class | Value | Use |
|---|---|---|
| `rounded-pill` | `9999px` | "signature Mintlify shape" — full-pill for inline pills, progress fills |
| `rounded-2xl` | `1.5rem` (24px) | Featured cards (current banner uses this for the container) |
| `rounded-xl` | `1.25rem` (20px) | Standard cards |
| `rounded-lg` | `var(--radius)` (16px) | Default card radius |
| `rounded-md` | `calc(var(--radius) - 2px)` | Inline tags, smaller surfaces |

For the new sticky header: keep the existing `rounded-2xl` for the container. Inner elements stay `rounded-pill` for the credit / completion pills.

### Padding scale

The current banner uses `px-5 py-4`. For a sticky header that's persistently visible, slightly tighter is appropriate — but match the codebase's spacing rhythm. Available scale: `px-3 py-2`, `px-4 py-3`, `px-5 py-4`, `px-6 py-5`. The current `px-5 py-4` is mid-density; design variations may go down one notch (`px-4 py-3`) for the sticky variant.

### Vertical space

A sticky header occupies the top of every viewport. The current banner (rendered as a hero) takes ~80–100px of vertical space. The sticky variant should target a similar height: **between 56px (compact) and 96px (current)**. Anything taller eats editor real estate; anything shorter loses the affordance.

## 4. Typography

The current banner's typography pairings:

| Use | Classes |
|---|---|
| Pill label ("Step 1 of N", "All N steps done") | `text-[10px] font-black uppercase tracking-[0.12em] text-background` |
| Body copy (credit hint, completion message) | `text-sm font-semibold text-brand-deep dark:text-brand-light` |

Note: the pill uses `tracking-[0.12em]` (custom), while the codebase defines `tracking-label: 0.065em` in `tailwind.config.cjs:91` for "uppercase labels." The pill's tracking is roughly 2× the standard label tracking — bolder, more attention-grabbing. **Keep this deviation**; the pill is intentionally loud.

Variations should preserve these pairings unless the design has a strong reason to deviate. If a variation uses a quieter pill, the new tracking should land between `tracking-label` (0.065em) and the current `tracking-[0.12em]` — e.g. `tracking-[0.09em]`.

## 5. Iconography

The codebase uses **`lucide-react`** for all icons. Current banner uses:

- `ChevronDown className="size-4"` (paired with `text-sm` body)
- `Check className="size-3"` (paired with `text-[10px]` pill label)

The size rhythm: **inline icons should match the font-size of the surrounding text**. `size-3` with `text-[10px]`, `size-4` with `text-sm`. Variations should follow this rhythm.

Variations may introduce new icons (e.g. a Play button, a StepIndicator). Document the icon choice and its size pairing in the variation's `parameters.docs.description`.

## 6. Sticky / persistent patterns elsewhere in the codebase

The codebase has **many sticky surfaces**. The pattern that matters most for the new banner:

### Common recipe

```tsx
<div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 backdrop-blur-md">
```

This is the dominant pattern: `sticky top-0`, `z-10` (default z-index for sticky surfaces), `border-b border-border/60` for the "content scrolls under" affordance, `bg-background/95` (semi-transparent background), `backdrop-blur-md` for the frosted-glass look.

Sources: `CollectionListTemplate.tsx:257`, `EffortsCatalogPage.tsx:124`, `views/FeedFeed.tsx:90`, `JournalDateScroll.tsx:631`, `CanvasPage.tsx:265`, `CanvasPage.tsx:244`.

### Z-index layering

- `z-10` — most sticky surfaces (headers, list-toolbars)
- `z-20` — sub-sticky elements (mobile nav bar in CanvasPage)
- `z-30` — page-level sticky (the `CanvasPage` mobile chrome uses `lg:z-30`)

The new banner is a **page-level sticky** (it sits above the main content on the canvas home). Recommended z-index: **`z-30`** to match the page-level chrome pattern.

### "Content scrolls under" affordance

The dominant pattern is **`border-b border-border/60`** + `backdrop-blur-md`. Shadow (`shadow-sm`) is rare — only used in `DebugTraceViewer.tsx:59`. **Recommendation: use `border-b border-border/60` + `backdrop-blur-md`, not a shadow.** This matches the dominant codebase pattern.

### Safe-area-inset handling (mobile)

The codebase uses `pt-[env(safe-area-inset-top)]` patterns in mobile chrome. The new banner should respect the safe-area-inset on mobile (notch / dynamic island). If the page-level sticky pattern in `CanvasPage.tsx:265` uses safe-area-inset handling, mirror it.

## 7. Dark mode

The current banner uses `dark:text-brand-light` on text. The broader codebase pattern:

- Most cards / containers: `bg-card dark:bg-card` (the CSS variable handles the dark variant automatically).
- Brand surfaces (`bg-brand`): do NOT invert — the brand color stays the same in both modes. Only the *text* on the brand surface flips (`text-background` in light, `dark:text-brand-light` for copy on neutral surfaces).
- Borders: `border-border/60` in light, `dark:border-border/40` is the convention for reduced contrast in dark mode (search `dark:border-border/` in the codebase for examples).

For the new banner:

- Light mode: `bg-brand/5` container with `border-brand/30` border (current pattern).
- Dark mode: keep the brand-tinted container, but adjust border opacity. The existing `border-brand/30` likely reads fine in dark mode but should be validated.

## 8. States & lifecycle (behavioral conformance)

> Visual conformance (Sections 1–7) covers tokens, motion, density, typography, iconography, sticky patterns, dark mode. **Behavioral conformance** is what content each state shows and what drives the transitions between states. Designers and validators check both.

### Source of truth

- The five onboarding steps and their semantics are defined by ADR-0010 (Decision 1, Goal Gradient): `docs/adr/onboarding-effects.md` — `visitedLanding`, `editedNote`, `ranWorkout`, `loggedEffort`, `openedReview`. These are the five steps the banner tracks. The total count `totalSteps` is **always 5** in the current code; designs that change this require an ADR change.
- The component that owns state is `playground/src/hooks/useOnboardingProgress.ts`. `stepsComplete` is the count of `progress[step] === true` for the five steps; `isComplete = stepsComplete === totalSteps`.
- The one-shot celebration flag is `profile.completionCelebrated` in localStorage (`wodwiki.profile.v1`). See `playground/src/services/playgroundProfile.ts` and the closure of #668 in ADR-0010's history (commit `5cffe912`).

### The four lifecycle states

The banner has **four states**, driven by `stepsComplete` and `profile.completionCelebrated`. Every design variation must map correctly to these.

| State | Driver | What it shows | Ticket |
|---|---|---|---|
| **Pre-progress credit** | `stepsComplete <= 1` | Brand pill ("Step 1 of N") + hint copy ("Start by editing the example") | #675 |
| **Mid-progress** | `1 < stepsComplete < totalSteps` | Progress bar fill (`stepsComplete / totalSteps`); optionally a counter ("2/5") and a label ("Getting started") | #676 |
| **Completion celebration** | `stepsComplete === totalSteps && !profile.completionCelebrated` | Loud pill: "✓ All N steps done" or equivalent; persists for ~2 seconds | #677 |
| **Quiet persistent "done"** | `stepsComplete === totalSteps && profile.completionCelebrated` | Quiet state of the user's choosing: bar at 100%, or a checkmark, or "Done" label, or any combination that signals completion without celebrating again | #677 |

### Transitions

1. **Pre-progress → Mid-progress**: when the user takes the second onboarding action (e.g. runs the workout after landing). `stepsComplete` flips from 1 to 2.
2. **Mid-progress → Mid-progress** (no transition): subsequent actions increment `stepsComplete` and update the bar fill. The fill-pulse from #666 (200ms flash on step advance) is the existing motion. The new design can preserve, intensify, or replace the pulse.
3. **Mid-progress → Completion celebration**: when the user takes the fifth onboarding action (typically `openedReview`). `isComplete` flips to true. The celebration runs for ~2 seconds, then writes `profile.completionCelebrated = true` and transitions to the quiet persistent state.
4. **Completion celebration → Quiet persistent**: after ~2 seconds. The banner does NOT unmount (per the map's decision). It transitions to the quiet state, which persists for the lifetime of the installation.
5. **Quiet persistent → Quiet persistent**: subsequent home-page visits. The persisted flag prevents the celebration from re-firing; the quiet state stays.

### What's enforced by code (not by design)

Designers do **not** decide:
- The five steps. Locked by ADR-0010.
- The total step count (5). Locked.
- The persisted-flag semantics. `profile.completionCelebrated` writes once per installation.
- The 2-second celebration duration. Locked by `COMPLETION_DISPLAY_MS` in `playground/src/components/onboarding/OnboardingBanner.tsx:32`. If a design wants a different duration, file an ADR.
- Which step (visitedLanding / editedNote / etc.) triggers which state. Locked by the call sites in `PlaygroundNotePage`, `ReviewPage`, etc.

Designers do decide:
- The visual treatment of each state.
- The motion within a state (except the locked fill-pulse from #666, which the design can preserve or replace).
- The transition from celebration to quiet persistent — currently no transition; can be a snap, a fade, or a smooth morph.
- The quiet persistent visual — see the table row above for what's allowed.

## Validation checklist for variations

When a design variation is reviewed (HITL on #675/#676/#677), check:

- [ ] All color tokens come from Section 1 — no new hex values, no semantic-state colors.
- [ ] Motion uses `transition-colors duration-200 ease-out` (state changes), `transition-[width] duration-500 ease-out` (fills only), or static (no motion).
- [ ] Border radius uses only the documented scale (`rounded-pill`, `rounded-2xl`, `rounded-xl`, `rounded-lg`, `rounded-md`).
- [ ] Vertical height: between 56px and 96px.
- [ ] Typography pairings: `text-[10px] font-black uppercase` for pills, `text-sm font-semibold` for body copy. Tracking either `tracking-label` (quiet), `tracking-[0.09em]` (medium), or `tracking-[0.12em]` (loud).
- [ ] Icons from `lucide-react`, sized to match the surrounding font size.
- [ ] Sticky CSS uses `sticky top-0 z-30 border-b border-border/60 bg-background/95 backdrop-blur-md pt-[env(safe-area-inset-top)]`.
- [ ] No shadow (use border-b instead).
- [ ] Dark mode uses the documented text/border conventions.

**Behavioral conformance (Section 8):**

- [ ] The variation maps to the correct state: pre-progress credit when `stepsComplete <= 1`, mid-progress when `1 < stepsComplete < totalSteps`, completion celebration once, quiet persistent thereafter.
- [ ] The completion celebration runs once per installation (the persisted flag, not the design, enforces this — but the variation must not visually imply "celebrating every visit").
- [ ] The quiet persistent state is visibly different from the mid-progress state (otherwise the user can't tell they finished — the gradient must end visually).
- [ ] The five onboarding steps are not enumerated or referenced in the variation copy. The user shouldn't see "Step 2 of 5" with a list of steps; they see the credit / progress / completion affordances.

A variation that violates any of the above should be sent back for revision, not approved.