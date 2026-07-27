# Onboarding Banner — Design Spec

> **Source map:** [#673 Sticky-header OnboardingBanner](https://github.com/SergeiGolos/wod-wiki/issues/673)
> **Tickets that reference this:** #675, #676, #677, #678, #679
> **Status:** Approved (Supersedes previous card-based design)

The reference document for the sticky OnboardingBanner redesign. Following HITL feedback on wayfinder #675, **Concept 1: Header Actions (Ultra-compact)** was selected as the canonical visual direction. 

The onboarding progress is no longer rendered as a standalone card in the scrollable prose. Instead, it is integrated directly into the `CanvasEditorPanel`'s `headerActions` slot (inside the `MacOSChrome` title bar), which is persistently sticky on both desktop and mobile viewports.

---

## 1. Placement & Layout Integration

* **Host Component**: `CanvasEditorPanel` (`playground/src/components/organisms/canvas/CanvasEditorPanel.tsx`).
* **Header Slot**: The progress badge and details are passed as the `headerActions` prop, placing them at the top right of the editor panel chrome next to the title.
* **Prose Column Carve-Out**: The old `OnboardingBanner` card has been completely removed from `MarkdownCanvasPage.tsx`'s prose column. The example cards (if any) scroll in normal flow below the sticky panel.

---

## 2. Color Tokens

The onboarding progress uses the panel's standard brand and neutral tokens to stay unified with the rest of the application:

* **Progress Pill Badge**:
  * Light mode: `bg-brand` (Mineral slate blue) with `text-background` (white).
  * Dark mode: `bg-brand` with `dark:text-brand-light` / `text-background`.
  * Completed state: `text-emerald-600` (light) and `dark:text-emerald-400` (dark).
* **Overlay Popover**:
  * Background: `bg-popover` (semantic variable for popovers).
  * Text: `text-popover-foreground`.
  * Border: `border-border/60` (light) / `dark:border-border/40`.
  * Item Hover: `hover:bg-muted/80`.

---

## 3. Typography

All typography is scaled down to fit in the single-line header bar without layout breakage:

* **Progress Pill**: `text-[8px] font-black uppercase tracking-wider`
* **Header Subtitle (Desktop)**: `text-[9px] text-muted-foreground select-none`
* **Popover Heading**: `text-[10px] font-black uppercase tracking-widest text-foreground`
* **Popover Subheading**: `text-[9px] text-muted-foreground leading-tight`
* **Popover Step Title**: `text-[10px] font-bold leading-none` (disabled/future steps get `text-muted-foreground/70`)
* **Popover Step Description**: `text-[8px] text-muted-foreground leading-normal mt-0.5`

---

## 4. Density & Sizing

* **Popover Container**: `w-64 rounded-xl shadow-2xl p-3.5 border border-border bg-popover`.
* **Popover Items**: `p-1.5 rounded-lg flex items-start gap-2.5 text-left`.
* **Mobile Responsiveness**:
  * To prevent header overflow on small viewports, the desktop subtitle text (e.g. `Hover to navigate` or `Next: Run timer`) uses `hidden lg:inline`.
  * On mobile screens, only the compact pill badge (`Step X/5` or `Done`) is rendered in the header actions.
* **Vertical Footprint**: Takes **0px** of editor panel height because it is nested inside the existing header chrome.

---

## 5. Iconography

Uses the standard `lucide-react` set:
* `Check` — Used for completed states (size-3 in the header badge, size-2.5 inside popover step bullets).
* `Dumbbell`, `Play`, `Timer`, `Trophy` — Used to represent steps 2 through 5 inside the popover step links.

---

## 6. Motion & Interaction

* **Hover Popover Animation**:
  The popover dropdown uses standard Tailwind transition properties to trigger on mouse hover of the progress container:
  ```tsx
  className="... opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto scale-95 group-hover:scale-100 transition-all duration-150 origin-top-right"
  ```
  This creates a smooth fade-in and scale-up transition without requiring framer-motion.
* **Step Navigation**:
  In the production codebase, the popover checklist is read-only (static list) to preserve the monotonic invariant of the onboarding hooks (`useOnboardingProgress` only allows marking steps complete, never unmarking). Interactive toggling (jumping ahead/back) is preserved in the Storybook prototype (`panel-onboarding.stories.tsx`) for design evaluation.

---

## 7. Lifecycle & States

The 4 lifecycle states defined by ADR-0010 are mapped to Concept 1:

| State | Driver | Visual Layout (Concept 1) |
| :--- | :--- | :--- |
| **Pre-progress** | `stepsComplete <= 1` | `Step 1/5` badge + `Landed ✅ · Edit note to start` text (hidden on mobile). |
| **Mid-progress** | `1 < stepsComplete < totalSteps` | `Step X/5` badge + dynamic next step subtitle (e.g. `Next: Run timer`) + mini inline progress line. |
| **Celebration** | `isComplete && !completionCelebrated` | Runs for 2 seconds. Renders a loud `Done 🎉` green badge in the header. |
| **Quiet Persistent** | `isComplete && completionCelebrated` | Stays in quiet `✓ Done` green badge. Popover remains available to inspect roadmap. |

---

The initial Concept 1 prototype contains minor spacing and alignment issues to be resolved during final validation:
* **Border and Padding Alignment**: The right edge alignment of the absolute popover (`right-0` / `mt-1.5`) needs minor adjustments in relation to `MacOSChrome` padding to ensure it fits perfectly inside the editor panel's rounded border context.
* **Shadow and Backdrop Blur**: Double-check contrast layering of the popover shadow against dark editor themes.
* **Hover Gap Bridge**: Resolved using a transparent pseudo-element (`before:-top-1.5 before:h-1.5`) bridging the 6px margin gap. This prevents mouse-leave events from prematurely dismissing the popover as the mouse moves from the badge down into the list.
* **Scroll-Alignment Integration**: The synchronization between active tutorial steps in the scrollable prose and the active onboarding accomplishments has been deferred to a future wayfinder map ticket. As the user scrolls through the page, accomplishments should highlight dynamically.
