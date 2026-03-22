import { getHomeExample } from '@/repositories/page-examples'

export interface WodExample {
  label: string
  wodScript: string
}

export interface ParallaxStep {
  eyebrow: string
  title: string
  body: string
  examples?: WodExample[]
  cta?: { label: string; target: string }
  /**
   * Makes this step a sticky group header in the text column.
   * Its eyebrow + title stays pinned while `subsection` steps scroll beneath it.
   */
  sticky?: boolean
  /**
   * Renders as a compact step that scrolls under the nearest preceding `sticky` header.
   * If no preceding sticky header exists it behaves as a normal step.
   */
  subsection?: boolean
  /**
   * Ends the current sticky group and renders a visual section-break step
   * (centered, shorter, with a horizontal rule above).
   */
  clear?: boolean
  /**
   * Bullet points rendered below body text in the step card.
   * Each item has a label (metric name), a short detail sentence, and an optional code example.
   */
  bullets?: { label: string; detail: string; example?: string }[]
  /**
   * Hint text shown below the sticky header (e.g. "Scroll to explore") with a
   * bouncing chevron. Also reduces the header spacer height to avoid wasted scroll space.
   */
  subsectionHint?: string
  /**
   * When true, the section auto-starts the tracker when this step first becomes active
   * and no workout is already running.
   */
  autoStartTimer?: boolean
}

// Loaded from wod/examples/home/sample-script.md — edit that file to tweak
export const SAMPLE_SCRIPT = getHomeExample('sample-script') ||
`# Pushup Benchmark
3 rounds
  5 Pushups
  :10 Rest
`

// Step index boundaries — used by Act1EditorSection to pick the sticky panel
export const TRACK_STEP_START = 3    // sticky "Session Started"
export const REVIEW_STEP_START = 10  // sticky "Metrics Collected"
export const RECORDS_STEP_START = 14 // sticky "In your Notebook"

// All phases combined — one ParallaxSection scrolls through the full lifecycle
export const EDITOR_STEPS: ParallaxStep[] = [
  // ── Phase 1: Plan (steps 0–2) ───────────────────────────────────────────
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Your Workouts as Markdown',
    body: 'WodWiki uses plain text **markdown**, but sprinkles some parsing magic on the special `\`\`\`wod` sections to understand workout structure and create smart **lap timers** to extract and collect the workout **metrics**.',
    examples: [
      { label: 'Simple', wodScript: SAMPLE_SCRIPT },
    ],
    sticky: true,
    subsectionHint: 'Scroll to explore',
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Colors map to metrics',
    body: 'The editor hints at **metrics** being collected with some syntax highlighting.',
    examples: [
      { label: 'Annotated', wodScript: SAMPLE_SCRIPT },
    ],
    subsection: true,
    bullets: [
      { label: 'Green · Movement', detail: 'Exercise names like Pushups — identified as bare words or known exercise tokens.', example: 'Pushups' },
      { label: 'Blue · Duration', detail: 'Timer expressions in :SS or MM:SS format — counted down or up automatically.', example: ':10' },
      { label: 'Orange · Reps', detail: 'Quantities before a movement — the rep count becomes the target metric.', example: '5 Pushups' },
      { label: 'Purple · Rounds', detail: 'Group quantifiers that define repetitions of nested blocks.', example: '(3) Rounds' },
    ],
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Ready to run',
    body: 'Click the **Run** button in the wod block header — or the inline button — to hand off to the timer.',
    subsection: true,
  },
  // ── Phase 2: Track (steps 3–9) ──────────────────────────────────────────
  {
    eyebrow: 'Step 2 · Track',
    title: 'Session Started',
    body: 'The primary button controlling your workout is the **lap / next** button — step through the specialized timer built from the **metrics** in your script.',
    sticky: true,
    autoStartTimer: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Timer counts up',
    body: 'The `5 Pushups` block has no time set, so the timer counts up. Your actual rep time becomes the recorded metric.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Child of a round',
    body: 'This block is a child of the 3-round outer block. The header shows your current **round context**.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Click Next when done',
    body: 'Tap **Next** to signal you finished the set. The `:10 Rest` countdown starts immediately.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Next card preview',
    body: "The faded card below the timer shows what's coming next, so you never lose your place in the workout.",
    subsection: true,
  },
  // Rest still belongs to Track — same timer view, same sticky header
  {
    eyebrow: 'Step 2 · Track',
    title: 'Countdown from :10',
    body: 'The Rest block counts down automatically. When it hits zero the runtime advances to the next set.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Auto-advance',
    body: 'No button needed — the timer auto-advances when the countdown finishes.',
    subsection: true,
  },
  // ── Phase 3: Review (steps 10–13) ───────────────────────────────────────
  {
    eyebrow: 'Step 3 · Review',
    title: 'Metrics Collected',
    body: 'Every completed block writes a segment: duration, reps, and effort — your raw workout receipts.',
    sticky: true,
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Micro-metrics collected',
    body: 'Every completed block writes a segment: duration, reps, and effort. These are your raw workout receipts.',
    subsection: true,
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Projection engines',
    body: 'The analytics transformer aggregates segments through projection engines: Volume, Rep, Distance, SessionLoad, MetMinute.',
    subsection: true,
  },
  {
    eyebrow: 'Step 3 · Review',
    title: 'Calculated projections',
    body: 'Total reps, session load, and estimated MET-minutes are calculated from your actual timing and rep data.',
    subsection: true,
  },
  // ── Phase 4: Records (steps 14–16) ──────────────────────────────────────
  {
    eyebrow: 'Step 4 · Records',
    title: 'In your Notebook',
    body: 'Back in the editor, the completed runtime writes records below the wod block — your times and reps inline with the script.',
    sticky: true,
  },
  {
    eyebrow: 'Step 4 · Records',
    title: 'Runtime records visible',
    body: 'After a session, records appear inline with each block — lap times, rep counts, and effort scores side by side.',
    subsection: true,
  },
  {
    eyebrow: 'Step 4 · Records',
    title: 'Reports coming soon',
    body: 'Historical tracking and trend reports are coming. Keep scrolling to explore collections and additional resources.',
    cta: { label: 'Explore Collections', target: 'collections' },
    subsection: true,
  },
]

// ACT 1b — Browse Collections
export const BROWSE_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Or browse collections',
    body: 'Not sure what to write? Load a pre-built workout from the collection library. Each item loads directly into the editor — then hit Run when you\'re ready.',
    sticky: true,
    subsectionHint: 'More ways to use it',
  },
  {
    eyebrow: 'Chromecast',
    title: 'Cast to your TV',
    body: 'Use Chromecast to send your workout to a TV screen. The remote becomes a lap timer. Built for the home gym.',
    subsection: true,
  },
]

// ACT 2 — Track: Pushups
export const TRACKER_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 2 · Track',
    title: 'Session Started',
    body: 'The primary button controlling your workout is the **lap / next** button — step through the specialized timer built from the **metrics** in your script.',
    sticky: true,
    autoStartTimer: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Timer counts up',
    body: 'The `5 Pushups` block has no time set, so the timer counts up. Your actual rep time becomes the recorded metric.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Child of a round',
    body: 'This block is a child of the 3-round outer block. The header shows your current **round context**.',
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Click Next when done',
    body: 'Tap **Next** to signal you finished the set. The `:10 Rest` countdown starts immediately.',
    cta: { label: '▶▶ Next', target: 'rest' },
    subsection: true,
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Next card preview',
    body: "The faded card below the timer shows what's coming next, so you never lose your place in the workout.",
    subsection: true,
  },
]

// ACT 3 — Track: Rest
export const REST_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 3 · Rest',
    title: 'Countdown from :10',
    body: 'The Rest block counts down automatically. When it hits zero the runtime advances to the next set.',
  },
  {
    eyebrow: 'Step 3 · Rest',
    title: 'Auto-advance',
    body: 'No button needed — the timer auto-advances when the countdown finishes. Click ▶▶ Next to skip ahead.',
    cta: { label: '▶▶ Next', target: 'review' },
  },
]

// ACT 4 — Review Metrics
export const REVIEW_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 4 · Review',
    title: 'Micro-metrics collected',
    body: 'Every completed block writes a segment: duration, reps, and effort. These are your raw workout receipts.',
  },
  {
    eyebrow: 'Step 4 · Review',
    title: 'Projection engines',
    body: 'The analytics transformer aggregates segments through projection engines: Volume, Rep, Distance, SessionLoad, MetMinute.',
  },
  {
    eyebrow: 'Step 4 · Review',
    title: 'Calculated projections',
    body: 'Total reps, session load, and estimated MET-minutes are calculated from your actual timing and rep data.',
  },
]

// ACT 5 — Back to Editor (Records)
export const RECORDS_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 5 · Records',
    title: 'Runtime records visible',
    body: 'Back in the editor the completed runtime writes records below the wod block — your times and reps inline with the script.',
  },
  {
    eyebrow: 'Step 5 · Records',
    title: 'Reports coming soon',
    body: 'Historical tracking and trend reports are coming. Keep scrolling to explore collections and additional resources.',
    cta: { label: 'Explore Collections', target: 'collections' },
  },
]

// COLLECTIONS — Browse and Load
export const COLLECTIONS_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Collections',
    title: 'Search any collection',
    body: 'Type in the command palette to filter within the active collection. Results update the list immediately.',
  },
  {
    eyebrow: 'Collections',
    title: 'Click to load',
    body: 'Selecting an item loads the workout script into the sticky editor. The editor updates on the right with a smooth fade.',
  },
  {
    eyebrow: 'Collections',
    title: 'Inline run',
    body: 'Hit ▶ Run from the editor panel to start the tracker immediately from the loaded workout — no page navigation.',
  },
  {
    eyebrow: 'Collections',
    title: 'In-memory only',
    body: 'Data does not persist across reloads. Use the notebook to save permanently.',
  },
]
