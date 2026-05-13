# WOD Wiki — UX Assessment

**Date:** 2026-05-13
**Author:** UXDesigner (Paperclip agent — WOD-249)
**Scope:** Desktop Web UI · Mobile Web UI · Chromecast Receiver UI
**Method:** Code-archaeology review against design-system docs (`docs/design-system/`), component source, and layout specifications. Assessed with standard UX design lenses (see Role instructions). Screenshots deferred — dev server not running; visual-truth gate applies only to interactive sessions.

---

## Executive Summary

WOD Wiki has a **coherent design system skeleton**: a shared token set, a well-documented layout model, and three clearly separated surface targets (desktop web, mobile web, Chromecast). The Chromecast receiver is the most polished surface relative to its constraints. The desktop web app has strong information architecture but carries real usability debt at the mobile breakpoint and in modal/overlay management. The TV (React Native) app is pre-MVP — it should not be shipped as a user-facing product without significant investment.

**Headline findings by severity:**

| # | Finding | Severity | Surface |
|---|---------|----------|---------|
| 1 | Tablet viewport is untreated — 768–1023 px is functionally mobile | High | Desktop/Mobile |
| 2 | Chromecast waiting screen text at 20% opacity fails readability at TV distance | High | Chromecast |
| 3 | Review screen on Chromecast has no user-facing dismiss — creates "stuck screen" confusion | High | Chromecast |
| 4 | TV (React Native) `SettingsScreen` is an empty stub shipped to users | High | TV/RN |
| 5 | D-Pad activation flash (`bg-primary/10`, 10% opacity) is too subtle for TV-distance feedback | Medium | Chromecast |
| 6 | Magic number `top-[60px]` for mobile sticky offset leaks from the layout, not a token | Medium | Mobile |
| 7 | JournalNote uses in-page overlay for timer; all other notes use route navigation — silent inconsistency | Medium | Desktop/Mobile |
| 8 | AppTemplate (3-panel, design draft) diverges from SidebarLayout (2-panel, shipped) — spec/reality gap | Medium | Desktop |
| 9 | Connection-status debug badge (`opacity-10`) appears on all Chromecast screens with no user-facing value | Low | Chromecast |
| 10 | No documented focus management for `z-50` modal overlays | Low | Desktop/Mobile |

---

## Surface 1 — Desktop Web UI

### 1.1 Layout Architecture

**Shipped implementation:** `SidebarLayout` — a two-panel shell (left sidebar `w-64` + main content) with a single breakpoint at `lg` (1024 px). No tablet-specific layout exists.

**Design-spec intent:** `AppTemplate` — a three-panel shell (left `w-64`, content `flex-1`, right `w-72`) with three breakpoints (mobile / mid / desktop) including a right-panel drawer at mid size.

**Gap (Jakob's Law + Mental Models):** The spec describes a significantly more capable system than what is built. This gap creates confusion during implementation handoffs — engineers may build to the spec and find the component doesn't exist yet, or ship to the existing component and lose the right panel entirely. Until `AppTemplate` is promoted to "Implemented" status, all new pages should be explicitly tagged against `SidebarLayout`, not `AppTemplate`.

**Recommendation:**
- Promote `AppTemplate` to `in_progress` and assign it a completion milestone, or
- Downgrade references in page-route docs to reflect that right panel is not yet rendered
- Do not let page docs reference "planned" templates as if they are live

### 1.2 Single Breakpoint at 1024 px

**Hick's Law / Platform & Context lens:** The jump from mobile (< 1024 px) to desktop (≥ 1024 px) is the only layout transition. A 768 px viewport — a standard iPad in portrait, a Surface in split-screen, or a tall laptop window — receives the *mobile* layout: full-width content, hamburger menu, no persistent navigation.

**Real-world consequences:**
- iPad users get the hamburger/drawer experience, not the persistent sidebar they'd expect (Jakob's Law — iPad convention is split-view nav)
- Split-screen browser windows (common for athletes who want WOD Wiki beside a video) degrade to mobile layout even on desktop screens
- The `design-description.md` explicitly mentions tablet as a distinct breakpoint (`768–1024px: stacked panels with bottom sheets`) — this was never built

**Recommendation:** Add a `md` (768 px) breakpoint that shows the left sidebar persistently but collapses the right panel. This requires updating `SidebarLayout`, not just adding new docs.

### 1.3 CanvasPage Complexity

**Cognitive Load / Mental Models lens:** `CanvasPage` supports two distinct modes (`title-bar` vs `sections/StickyNavPanel`) selected by which props are passed. This is `Tesler's Law` applied incorrectly — complexity is hidden from the consumer but creates surprising behavior when the wrong combination of props is used.

Specific risk: passing both `title` and `sections` is undocumented in the component API — what wins? The docs say "title-bar mode when `title` is present" but `sections` interaction is unspecified.

**Recommendation:** Add explicit guards or separate named exports (`CanvasTitlePage`, `CanvasSectionsPage`) with TypeScript-enforced prop contracts to make the two modes explicit. Progressive Disclosure applies: default callers should not need to know about the other mode.

### 1.4 TOC Sidebar Only at `3xl+`

**Serial Position / Information Scent lens:** The TOC index sidebar is hidden until 1800 px viewport width. At 1440 px (the most common desktop resolution) the page has no persistent section navigation. Users must scroll to orient, which increases cognitive load on content-heavy canvas pages.

**Recommendation:** Lower the TOC threshold to `xl` (1280 px) or `2xl` (1536 px). At widths where the content column is already wide enough, the TOC provides orientation without displacing content.

### 1.5 Sticky Layer Management

**Positive finding:** The z-index ladder is well-documented and follows a coherent precedence order (`z-50` modals > `z-30` title headers > `z-20` mobile nav > `z-20` sticky nav > `z-10` sub-headers). This is an area where the design system is stronger than most comparable codebases.

**One risk:** `StickyNavPanel` and `SidebarLayout` mobile header both use `z-20`. Overlapping sticky elements at the same z-index will depend on DOM order for resolution. If a future page renders both simultaneously on mobile (e.g. a page using sections-mode inside the mobile app shell), they will collide visually.

**Recommendation:** Reserve `z-25` (or rename existing slots) to create a strict ordering between the mobile navbar and page-level sticky chrome.

### 1.6 Modal Accessibility Gap

**WCAG POUR / Inclusive Design lens:** The fullscreen timer and review overlays use `fixed inset-0 z-50`. There is no documented policy for:
- Focus trapping on modal open
- Return focus on modal close
- `aria-modal` and `role="dialog"` attributes
- Keyboard dismissal (`Escape` key)

`Headless UI`'s `Dialog` component (used in `MobileSidebar`) handles these automatically. If the fullscreen timer/review overlays are **not** using `Headless.Dialog`, they likely have accessibility holes.

**Recommendation:** Audit `FullscreenTimer` and `FullscreenReview` overlays for focus trapping. If they use custom `fixed inset-0` divs without Headless UI, migrate to `Headless.Dialog` or an equivalent ARIA-managed overlay.

---

## Surface 2 — Mobile Web UI

### 2.1 Mobile Header Height Magic Number

**Token Integrity lens:** Subheader positioning uses `top-[60px]` and `top-14` as raw pixel values:

```css
sticky top-[60px] sm:top-14 z-10   /* mobile subheader offset */
```

The mobile header's height (`~60 px`) is not expressed as a design token. If the header ever changes height (e.g. to accommodate a notification banner), every page with a sticky subheader silently misaligns.

**Recommendation:**
- Define a CSS custom property `--mobile-header-height: 60px` (or a Tailwind extend token like `header-height`)
- Express all mobile sticky offsets as `top-[var(--mobile-header-height)]`
- This is a design system change — worth calling out as such

### 2.2 Touch Target Sizing

**Fitts's Law / Motor Accessibility lens:** The close button inside `MobileSidebar` is rendered as a `NavbarItem`:

```tsx
<Headless.CloseButton as={NavbarItem} aria-label="Close navigation">
  <CloseMenuIcon />
</Headless.CloseButton>
```

`NavbarItem` base classes include `p-2` padding, which gives a 40×40 px effective target at `text-sm` icon size. WCAG 2.5.5 (Level AA target size is 44×44 px; Level AAA is the full target). The hamburger button and close button are the most important targets in the mobile nav flow.

**Recommendation:** Ensure close and open icons have at minimum 44×44 px touch target via `TouchTarget` wrapper or by increasing padding to `p-2.5`.

### 2.3 Timer on Mobile — No Compact Mode

**Platform & Context lens:** The `TimerDisplayProps` interface includes a `compact?: boolean` prop, but its usage in `timer-panel.tsx` and whether it activates a genuinely mobile-optimized layout is not confirmed from source inspection. The documented `design-description.md` specifies a "full-screen slides" model for mobile with a large central clock and bottom controls — if the compact mode is not implementing this, the mobile timer UX is sub-optimal.

**Recommendation:** Verify that `compact={true}` is passed when `TimerPanel` is rendered at mobile viewport. If it's not, create a child issue to ensure the mobile timer layout meets the design spec's "full-screen" intent.

### 2.4 Journal Timer as In-Page Overlay (Inconsistency)

**Norman's Principles / Conceptual Models lens:** `JournalNote` is the only note page where the timer launches as an in-page overlay (`FullscreenTimer` inside `fixed inset-0`). All other note types navigate to `/tracker/:runtimeId` and then to `/review/:runtimeId`.

This creates a **conceptual model inconsistency**: users who encounter the timer from a Journal note can press the browser back button to return to the note; users coming from any other note are navigated away and cannot do the same.

The inconsistency also means the Journal-specific `?autoStart=<runtimeId>` URL parameter is a leaky implementation detail exposed to the browser URL bar.

**Recommendation:** Document this inconsistency explicitly as a deliberate product decision (with rationale) in `docs/design-system/02.page-routes/Journal-Note.md`. If it is not intentional, standardize on one model — the overlay approach is better for mobile (less navigation disruption) and should be the default.

---

## Surface 3 — Chromecast Receiver UI

### 3.1 Waiting Screen — Critical Readability Failure

**WCAG POUR / Aesthetic-Usability / TV Distance lens:**

```css
text-white/20 font-mono uppercase tracking-[0.5em]
```

`text-white/20` is white at **20% opacity on a black background**, producing approximately `#333` equivalent luminance. The WCAG contrast ratio for this value on `bg-black` is approximately **1.5:1** — far below the 3:1 minimum for large text (Level AA) and below the 4.5:1 for normal text.

At typical TV viewing distance (2–3 meters), text that is already borderline on a monitor becomes effectively invisible. The "WAITING FOR CAST" message is the **primary user-facing communication on this screen** — if users cannot read it, they cannot understand the device state.

**Lens applied:** Loss Aversion — a user who cannot confirm the Chromecast is ready will assume it is broken and abandon the setup flow.

**Recommendation:**
- Change waiting screen text to `text-white/60` or higher (minimum contrast ratio 3:1 against black)
- Consider `text-white/80` for better legibility at TV distance
- Keep the minimalist aesthetic but do not sacrifice legibility for style; `text-white/40` with `text-2xl` or larger is the minimum viable contrast at TV distance

### 3.2 Review Screen — No User Agency

**Norman's Principles (Feedback, Affordances) / Zeigarnik Effect lens:**

The Chromecast Review screen has **no dismiss mechanism on the receiver side**. The sender must navigate away (close the note on the phone/browser) to clear the TV screen. The docs state:

> "No close button — the sender must navigate away."

This creates two user experience problems:
1. If the sender closes the browser entirely (e.g. phone dies, browser crash), the TV is permanently stuck on the review screen until the physical device is rebooted or the Cast session times out
2. Users standing near the TV (post-workout, wanting to move on) have no obvious action they can take on the device in front of them

**Recommendation:**
- Add a D-Pad "dismiss" or "return to waiting" action to the Review screen (e.g. `Select` on a `btn-dismiss` with ID `review-dismiss`)
- This does not require RPC back to the sender — the receiver can simply clear `reviewData` and return to `waiting` mode locally
- Alternatively, add a 60-second auto-dismiss timeout with a countdown indicator (Goal-Gradient — the countdown gives users feedback about impending change)

### 3.3 D-Pad Flash Too Subtle

**Feedback / TV Platform lens:**

```css
fixed inset-0 z-50 bg-primary/10   /* ~200ms flash on D-Pad activation */
```

`bg-primary/10` is the brand primary color at 10% opacity overlaid on the full screen. At TV viewing distance and in a bright or variable lighting environment (garage gym, outdoor area), a 10% opacity full-screen tint will be imperceptible.

Compare to Apple TV and Android TV interface guidelines, which use focused element highlighting (ring, scale, brightness change) rather than a full-screen overlay for remote confirmation. A full-screen overlay approach can also create perceived input lag because the overlay covers the element the user acted on.

**Recommendation:**
- Increase to `bg-primary/20`–`bg-primary/30` or switch to a **ring/border highlight on the focused element** itself (more aligned with platform conventions, more visible without washing out the whole screen)
- Consider audio feedback alone (already implemented via `audioService.playSound`) as the primary confirmation, with a subtle element-level visual response

### 3.4 Connection Status Badge — No User Value

**Occam's Razor / Information Scent lens:**

```css
absolute bottom-2 right-2
opacity-10 text-[8px] font-mono tracking-tighter uppercase
```

This badge shows values like `waiting-for-cast`, `connecting`, `connected`, `disconnected` at 10% opacity in 8px monospace text. It is explicitly documented as "for developer debugging only."

**Problem:** It appears on **every screen, including the waiting screen** where the primary user message is also in reduced-opacity text. Two near-invisible text elements on the same screen creates a confusing visual priority hierarchy — both appear to have the same visual weight (near-zero).

**Recommendation:**
- In production builds, gate the badge behind a `debug mode` flag (environment variable or a specific URL param pattern like `?debug=1`)
- If it must remain visible, increase opacity to `opacity-100` and move it to a `text-[10px]` help-text slot so it reads as status, not debug noise

### 3.5 Preview Screen — Loading Gap

**Doherty Threshold / Feedback lens:**

The Preview screen shows selectable workout blocks when `previewData` arrives. However, there is no documented loading state between the user selecting a block (dispatching `sendEvent('next')`) and the transition to `active` mode. If the browser sender takes > 400ms to start the runtime and send back state, the user sees no feedback that their D-Pad press was registered.

**Recommendation:** On `sendEvent('next')`, immediately show a visual indicator on the focused block (e.g. opacity reduction, spinner overlay) to confirm the action was received. Return to normal state if the transition does not complete within 2 seconds (timeout guard).

### 3.6 Chromecast Review — Empty State Handling

**Peak-End Rule / Error States lens:**

The `ReceiverReviewPanel` stories document an `EmptyReview` state (reviewData present but zero rows / no projections). From the story fixtures, the empty state renders a panel with no content. If a workout completes abnormally (stopped early, no reps logged), the TV shows a blank panel with a status badge.

**Recommendation:** Design an explicit empty-state message for the review panel: "No results recorded" with an icon and a prompt to try again. This follows the Peak-End Rule — the final experience of a workout should always communicate closure, even when no data was captured.

---

## Surface 4 — TV App (React Native)

> **Note:** The TV app (`/tv/src/`) is a separate React Native project from the Chromecast receiver. Based on code inspection this app is pre-MVP. Findings below are systemic, not incremental.

### 4.1 Settings Screen Is an Empty Stub

```tsx
export function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings</Text>
    </View>
  );
}
```

A screen with only the word "Settings" on it is not a settings screen. If users navigate to it expecting functionality (server URL configuration, connection preferences, display options), they will be confused.

**Recommendation:** Either remove `SettingsScreen` from the navigation stack entirely until it is implemented, or implement the minimum viable content (at minimum: the relay server URL configuration from `config.ts`).

### 4.2 No Error Handling in HomeScreen

```tsx
webSocketService.connect(SERVER_URL).then(() => {
    setIsConnected(true);
}).catch(err => {
    console.error('Failed to connect', err);
});
```

Failed connections are caught and logged to console only. The user sees the `ActivityIndicator` spinning indefinitely with "Connecting to relay..." text. On a TV device with no keyboard for debugging, a failed connection with no error state is a dead end.

**Recommendation:**
- Add a `connectionError` state that shows a user-readable message ("Could not reach server at {SERVER_URL}. Check your Wi-Fi connection.")
- Include a "Retry" button that re-attempts `webSocketService.connect()`
- Consider a timeout (30 seconds) after which the spinner stops and an error is shown

### 4.3 No Token Alignment with Design System

```tsx
// tv/src/screens/HomeScreen.tsx
backgroundColor: '#121212',   // hard-coded
color: '#ffffff',              // hard-coded
color: '#4ade80',              // hard-coded green (matches Tailwind green-400 but not referenced from token)
color: '#aaaaaa',              // hard-coded
color: '#666666',              // hard-coded
```

The TV app uses seven raw hex values across three screens. None reference the shared design-system token set. If the design system's primary color or background changes, the TV app will diverge silently.

**Recommendation:** Define a `theme.ts` in `tv/src/` that maps to the same semantic tokens as the web app (`background`, `foreground`, `primary`, `muted-foreground`, etc.) with React Native equivalents. Even if the values are initially duplicated, the names create a reference point for future alignment.

### 4.4 WorkoutScreen — Timer Display is a Static Number

```tsx
<Text style={styles.timerText}>{formatTime(timer.durationMs || 0)}</Text>
```

The timer shows `timer.durationMs` — the **total block duration**, not the elapsed time. Since `displayState` is set by `stateUpdate` WebSocket messages from the relay, the countdown only advances when the relay sends a new `stateUpdate`. There is no local interpolation between updates. This means if the relay sends updates every second, the display ticks by 1 second at a time rather than smoothly counting down.

For a workout timer, smooth countdown is a **must-have** (Kano Model). A stuttering timer feels broken.

**Recommendation:** Implement local time interpolation using `setInterval` (or `requestAnimationFrame` on RN). On each `stateUpdate`, store the received `durationMs` and the `Date.now()` timestamp. The display renders `receivedDurationMs - (Date.now() - receivedAt)` for a smooth countdown without waiting for the next server message. This mirrors the `localNow + getSenderClockTimeMs()` pattern from the Chromecast receiver.

---

## Cross-Surface Observations

### 5.1 Design–Spec Gap is the Primary Risk

The most consistent finding across all surfaces is that **documented intent and shipped implementation are not synchronized**. Examples:
- `AppTemplate` (3-panel, documented, "Design Draft") vs `SidebarLayout` (2-panel, shipped)
- Tablet breakpoint (described in `design-description.md`) vs no md/tablet breakpoint in code
- `compact` timer prop (present in interface) vs uncertain actual implementation

This is not a criticism of the development team — it reflects a design system that is being actively evolved. But the risk is real: future agents and engineers reading the docs will build against the spec, not the reality.

**Recommendation:** Add a clearly visible status badge to every design-system doc (`Status: Implemented | Design Draft | Deprecated`) and audit each page route doc to confirm its template status is accurate. Where the spec ahead of implementation, explicitly mark what is planned vs. live.

### 5.2 Audio Feedback as an Accessibility Bridge

**Inclusive Design (curb-cut effect) lens:** The Chromecast receiver's use of `audioService.playSound('click', 0.5)` on every D-Pad interaction is an excellent example of the curb-cut effect: a feature designed for TV-remote feedback also benefits users with visual impairments who cannot see the screen clearly from across the room. Extending this pattern to the mobile web app (e.g., audio feedback on timer start/stop/next) would improve the experience for mobile users in eyes-busy workout situations.

### 5.3 Dark Mode Consistency

**Aesthetic-Usability Effect lens:** The web app uses full dark-mode support via Tailwind's `dark:` prefix. The TV React Native app hardcodes a dark theme. The Chromecast receiver uses `bg-background` which follows the token (and dark mode). There is no documented mechanism for the TV app to follow the user's or device's dark/light preference.

**Recommendation:** For the TV app, use the React Native `Appearance` API to respect the system color scheme. This is a low-effort, high-polish improvement.

---

## Priority Recommendations Summary

| Priority | Action                                                                                                      | Surface        | Effort |
| -------- | ----------------------------------------------------------------------------------------------------------- | -------------- | ------ |
| P0       | Raise Chromecast waiting screen text opacity to minimum `text-white/60`                                     | Chromecast     | 1 line |
| P0       | Add D-Pad dismiss to Chromecast Review screen                                                               | Chromecast     | Small  |
| P0       | Add error state + retry to TV HomeScreen (no stuck-spinner on connection failure)                           | TV/RN          | Small  |
| P0       | Remove or fill `SettingsScreen` in TV app                                                                   | TV/RN          | Small  |
| P1       | Increase D-Pad flash from `bg-primary/10` to `bg-primary/25` or switch to element-level highlight           | Chromecast     | 1 line |
| P1       | Add `md` breakpoint (768 px) to `SidebarLayout` for persistent left panel on tablet                         | Desktop/Mobile | Medium |
| P1       | Define `--mobile-header-height` token; remove `top-[60px]` magic number                                     | Mobile         | Small  |
| P1       | Audit `FullscreenTimer` / `FullscreenReview` overlays for focus trapping and ARIA                           | Desktop/Mobile | Small  |
| P2       | Gate Chromecast connection badge behind debug flag                                                          | Chromecast     | Small  |
| P2       | Implement local timer interpolation in TV WorkoutScreen                                                     | TV/RN          | Medium |
| P2       | Add design-system `theme.ts` to TV app to reference semantic tokens                                         | TV/RN          | Small  |
| P2       | Lower TOC sidebar from `3xl+` to `xl+` (1280 px)                                                            | Desktop        | 1 line |
| P2       | Document JournalNote overlay vs. route timer inconsistency as deliberate or create issue to standardize     | Desktop/Mobile | Doc    |
| P3       | Sync AppTemplate spec status with SidebarLayout reality; tag all page-route docs with implementation status | Desktop        | Doc    |

---

## Acceptance Criteria for Follow-Up Issues

Each P0/P1 item above should generate a separate implementation issue. Acceptance criteria template:

- **Chromecast waiting text:** Render `ReceiverApp` waiting state in Storybook at 1920×1080, verify text contrast ratio ≥ 3:1 against black background using browser accessibility inspector.
- **Chromecast review dismiss:** D-Pad `Select` on `btn-dismiss` returns receiver to `waiting` mode. Storybook story for `Review-Chromecast` shows dismiss button in focusable state.
- **TV error state:** HomeScreen with a mocked failed WebSocket shows error message text + Retry button. Retry triggers re-connect attempt.
- **Tablet breakpoint:** At 768–1023 px viewport, left sidebar is persistent (`lg:flex` changed to `md:flex`). Existing mobile layout preserved at < 768 px.
- **Mobile header token:** `grep -r 'top-\[60px\]' src/` returns zero results after token introduction.
- **Focus trapping:** Open FullscreenTimer overlay; confirm focus is trapped inside the overlay; `Tab` cycles through interactive elements only; `Escape` dismisses and returns focus to the trigger element.
