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
}

export const SAMPLE_SCRIPT = `# Pushup Benchmark
3 rounds
  5 Pushups
  :10 Rest
`

// ACT 1 — Journal Your Workout
export const EDITOR_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Write your workout',
    body: 'WodScript uses plain text to define workout structure. Every line you type becomes a block the timer can execute.',
    examples: [
      { label: 'Simple', wodScript: SAMPLE_SCRIPT },
    ],
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Colors map to metrics',
    body: 'Syntax highlighting shows you what the timer sees. Green = movement, blue = duration, orange = reps, purple = effort or weight.',
    examples: [
      { label: 'Annotated', wodScript: SAMPLE_SCRIPT },
    ],
  },
  {
    eyebrow: 'Step 1 · Plan',
    title: 'Ready to run',
    body: 'Click the ▶ Run button in the wod block header — or the inline button — to hand off to the timer.',
    cta: { label: '▶ Run', target: 'tracker' },
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Or browse collections',
    body: 'Load a pre-built workout from the collection library. Each item loads directly into the editor in this panel.',
  },
]

// ACT 2 — Track: Pushups
export const TRACKER_STEPS: ParallaxStep[] = [
  {
    eyebrow: 'Step 2 · Track',
    title: 'Timer counts up',
    body: 'The `5 Pushups` block has no time set, so the timer counts up. Your actual rep time becomes the recorded metric.',
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Child of a round',
    body: 'This block is a child of the 3-round outer block. The header shows your current round context.',
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Click Next when done',
    body: 'Tap ▶▶ Next to signal you finished the set. The `:10 Rest` countdown starts immediately.',
    cta: { label: '▶▶ Next', target: 'rest' },
  },
  {
    eyebrow: 'Step 2 · Track',
    title: 'Next card preview',
    body: "The faded card below the timer shows what's coming next, so you never lose your place in the workout.",
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
