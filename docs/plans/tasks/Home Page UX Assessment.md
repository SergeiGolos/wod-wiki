# Home Page — UX Assessment

_Current vs. proposed home page, evaluated from the user's perspective._

---

## Scope

This assessment compares the **existing home page** (implemented in `playground/src/components/HomeHero.tsx` + `markdown/canvas/home/README.md`) against the **proposed redesign** outlined in `docs/tasks/Home Page Sections.md`.

The target audience is defined consistently in both documents: coaches, trainers, and serious home-gym athletes who plan sessions mentally or on whiteboards and need a tool that keeps up.

---

## Current State — What Exists Today

### Component: `HomeHero.tsx`

The React hero component renders a branded banner with:

- **Label pill:** "Workout Studio"
- **Headline:** "The workout studio built for fitness enthusiasts."
- **Subtitle:** "Plan with Markdown, execute with a precision timer, and evolve with performance insights — all in one place."
- **Three cards** (Plan / Execute / Evolve) — each scroll-links to a corresponding section below.
- **Two CTAs:** "Start Planning" → `/journal`, "See Examples" → `/collections`
- **Scroll cue** at the bottom.

### Canvas: `markdown/canvas/home/README.md`

Below the hero, a markdown-driven canvas renders the rest of the home page:

1. **Pillars section** — three short descriptions (Write / Timer / Analytics) with emoji headers.
2. **Live Demo** — scroll-interactive walkthrough showing a sample workout ("Morning Strength") through three acts: Write → Track → Review. Uses inline `view` and `command` blocks to drive state changes in an embedded editor.
3. **Features** — four capability cards (Smart Timer, Pre & Post Analytics, Chromecast, Collections & Library) rendered as bullet lists.
4. **Browse the Library** — embedded collection browser.
5. **CTA sections** — "Ready to write your own?" (→ getting-started) and "Start your training journal" (→ journal).
6. **Data note** — "No cloud required. Your data stays on your device."

---

## Proposed State — From `Home Page Sections.md`

The proposed redesign restructures the page into four clear sections:

1. **Hero** — rewritten headline/sub-headline with three CTAs (Start Planning / See Examples / How it Works).
2. **The Cycle — Plan · Execute · Evolve** — three side-by-side cards with richer narrative copy per phase.
3. **First Example — 3 × 10 Pushups** — a step-by-step walkthrough of a single ultra-simple workout through all three phases, with "key insights" surfaced at each step.
4. **Features** — five capability cards (Data Privacy, Chromecast, Automatic Journaling, Data Analysis & Trends, Link Sharing) with conversational copy aimed at specific user concerns.

### Key Differences from Current

| Aspect | Current | Proposed |
|--------|---------|----------|
| Hero headline | "The workout studio built for fitness enthusiasts." | "Your workout, written once — run, tracked, and remembered forever." |
| Hero CTA count | 2 (Start Planning, See Examples) | 3 (+ How it Works smooth-scroll) |
| Cycle section | Three cards with short copy, same labels (Plan/Execute/Evolve) | Three cards with much richer copy and italic taglines |
| Demo walkthrough | Uses "Morning Strength" (3 rounds KB swings + rest) with 3 acts | Uses "3 × 10 Pushups" — intentionally simpler, with explicit "key insights" per step |
| Feature cards | 4 cards, bullet-list format | 5 cards, paragraph format, each targeting a specific user concern |
| Privacy messaging | Single line at the very bottom | First feature card, prominent placement |
| Link Sharing | Not mentioned | Dedicated feature card |
| Automatic Journaling | Not mentioned | Dedicated feature card |
| Collections & Library | Feature card + embedded browser | Not a feature card (browser section is removed) |
| Browse the Library section | Embedded collection browser | Not in the proposal |

---

## UX Assessment

### Strengths of the Current Page

1. **The live demo is the star.** The scroll-interactive walkthrough with an embedded editor/runtime is the most compelling element on the page. It lets a visitor *experience* the product without signing up or navigating away. This is a high-value pattern — showing, not telling.

2. **The embedded collection browser** gives immediate proof that the product has content. Visitors can click a real workout and see it load. It answers "is this vaporware?" before the user even asks.

3. **Three-act narrative (Write → Track → Review)** is intuitive and mirrors how athletes actually think about training. The labels "Plan · Execute · Evolve" reinforce this cycle effectively.

4. **Two clear CTAs** reduce decision paralysis. "Start Planning" and "See Examples" map to the two most likely visitor intents.

### Weaknesses of the Current Page

1. **Headline is generic.** "The workout studio built for fitness enthusiasts" could describe any fitness app — Strava, Nike Training Club, a spreadsheet template. It doesn't communicate what makes WOD Wiki different (plain-text notation, no-account local-first, write-once-run-forever).

2. **Hero subtitle leans on the word "Markdown."** While technically accurate, "Markdown" is a developer term. Coaches and trainers — the stated audience — may not identify with it. The proposed sub-headline avoids this by describing the *outcome* rather than the *format*.

3. **Feature cards use bullet lists.** This reads like a spec sheet, not a value proposition. "Counts up / down / interval based on your script" is a feature description, not a benefit. Users scan benefit-first; bullets get skimmed.

4. **Privacy messaging is buried.** "No cloud required" appears as a single line at the very bottom of the page. For a product that stores data locally with no account, this is a differentiator that deserves prominence — especially for users burned by platform shutdowns.

5. **Missing features in the narrative.** Automatic journaling and link sharing are real capabilities that don't appear anywhere on the home page. A coach who shares programming with clients has no idea the product can do this.

6. **The hero cards duplicate the Pillars section.** Both the hero's three cards (Plan/Execute/Evolve) and the Pillars section below (Write/Timer/Analytics) describe the same three-phase cycle with slightly different wording. A visitor scrolling down gets a sense of repetition rather than progression.

7. **"Morning Strength" demo script is slightly complex for a first impression.** Kettlebell Swings at 24kg with rest intervals introduces load notation and rest syntax simultaneously. The proposed "3 × 10 Pushups" is a better pedagogical choice — zero friction to understand.

8. **No "How it Works" CTA.** The current page offers "Start Planning" (action) and "See Examples" (exploration) but no gentle entry for the methodical reader who wants to understand the cycle before committing. The proposed third CTA fills this gap.

### Strengths of the Proposed Design

1. **Headline leads with outcome, not category.** "Your workout, written once — run, tracked, and remembered forever" immediately communicates the core value loop. It's specific enough to differentiate and simple enough to parse in under 2 seconds.

2. **Sub-headline names the pain.** "Coaches think in reps, rounds, and loads — not dropdowns and forms" (from the Plan card copy) directly addresses the frustration the target audience feels with existing tools. This is strong positioning copy.

3. **"Key insights" in the demo walkthrough.** Each step of the proposed walkthrough explicitly calls out what the user should understand ("The plan is not just text; it is the schema for your session's data"). This prevents the "I saw a demo but I'm not sure what I learned" problem.

4. **Privacy as a first-class feature.** Elevating data ownership to a feature card with conversational copy ("There is no account, no server, no cloud sync unless you choose to export") builds trust immediately.

5. **Five feature cards with concern-targeted copy.** Each card names a specific user concern and answers it. "Can I trust it?" → privacy card. "I need this on my TV" → Chromecast card. This is more persuasive than a generic feature list.

6. **Simpler demo script.** "3 rounds / 10 Pushups" is the right complexity for a first encounter. Nothing distracts from understanding the cycle.

### Weaknesses of the Proposed Design

1. **Removes the live interactive demo.** The current page's embedded editor/runtime is the most effective persuasion tool on the page. The proposal describes the walkthrough in prose and visual cues ("the editor with syntax highlighting") but doesn't specify retaining the actual interactive component. If the live demo is replaced with static screenshots or animations, the page loses its highest-converting element.

   **Recommendation:** Keep the interactive `view`/`command` blocks from the current canvas implementation, but re-skin them with the proposed "3 × 10 Pushups" script and the new copy structure. The "key insights" can be rendered as callout blocks beside the interactive panel.

2. **Removes the embedded collection browser.** The "Browse the Library" section currently gives visitors immediate access to real content. Removing it means a visitor must click "See Examples" and navigate to `/collections` to discover that the product has a library at all.

   **Recommendation:** Either retain a lightweight version of the browser (e.g., 3-4 featured collection cards with "Browse all →" link) or ensure the "See Examples" CTA lands on a page that immediately showcases content volume.

3. **"Collections & Library" is dropped from features but not replaced.** The current feature set includes a library of workouts organized by category. The proposal doesn't mention this as a feature card. For a visitor evaluating whether the product has enough content to be useful, this omission could be a gap.

   **Recommendation:** Either add a "Workout Library" feature card or fold library content into the "See Examples" journey so visitors encounter it naturally.

4. **Five feature cards may feel like a lot after the demo.** The page structure is: Hero → Cycle → Demo (3 steps) → Features (5 cards). By the time a visitor reaches the features section, they've already consumed a fair amount of content. Five cards risk scan-and-skip behavior.

   **Recommendation:** Consider grouping the five features into two rows (privacy + Chromecast on top, journaling + analytics + sharing below) or presenting them as an expandable "What else?" section that doesn't demand equal attention to the demo.

5. **No explicit mention of "no account required" in the hero.** The proposed hero CTAs are "Start Planning," "See Examples," and "How it Works." None of these signal that the product is frictionless to try. A first-time visitor may assume sign-up is required.

   **Recommendation:** Consider adding a small reassurance line under the CTAs, e.g., "No sign-up required. Just write and go." or incorporating it into the sub-headline.

---

## Information Transfer Analysis

### What the user needs to understand (in order):

1. **What is this?** — A tool that turns plain-text workouts into a live timer and automatic log.
2. **Why should I care?** — It eliminates manual tracking, spreadsheets, and app friction.
3. **How does it work?** — Write a script → hit play → see results. The cycle.
4. **Can I trust it?** — Data stays local, no account, no cloud.
5. **What else can it do?** — Chromecast, journaling, sharing, analytics.

### Current page transfer map:

| Message | Where | Effectiveness |
|---------|-------|---------------|
| What is this? | Hero headline + subtitle | Moderate — says "workout studio" but doesn't differentiate |
| Why should I care? | Hero cards, Pillars | Low — describes features, not pain points |
| How does it work? | Live Demo (3 acts) | High — interactive, experiential |
| Can I trust it? | Bottom of page, single line | Low — buried, easy to miss |
| What else? | Features section (bullet lists) | Moderate — present but not compelling |

### Proposed page transfer map:

| Message | Where | Effectiveness |
|---------|-------|---------------|
| What is this? | Hero headline + sub-headline | High — outcome-led, specific |
| Why should I care? | Cycle cards (pain-point copy) | High — names real frustrations |
| How does it work? | Step-by-step walkthrough with key insights | High (if interactive) / Moderate (if static) |
| Can I trust it? | First feature card | High — prominent, conversational |
| What else? | 5 feature cards with concern-targeted copy | High — answers specific objections |

**Net assessment:** The proposed design significantly improves information transfer for messages 1, 2, and 4. Message 3 depends on whether the interactive demo is retained. Message 5 improves but may need layout attention to avoid fatigue.

---

## Summary of Recommendations

1. **Adopt the proposed hero copy.** The headline and sub-headline are materially stronger. Lead with outcome, not category.

2. **Keep the interactive demo, but use the proposed script and structure.** Replace "Morning Strength" with "3 × 10 Pushups." Add the "key insight" callouts beside the interactive panel.

3. **Retain a lightweight library/browser presence.** Don't remove the collection browser entirely — reduce it to a curated selection or ensure the "See Examples" CTA delivers immediate content.

4. **Elevate privacy to the hero or cycle section.** Don't relegate "no account required" to the features section alone. A micro-copy line under the CTAs removes a silent objection before it forms.

5. **Merge the hero cards with the Cycle section.** The current page has two near-duplicate sections (hero cards + Pillars). The proposed design consolidates this into a single "Cycle" section, which is the right call. Don't re-introduce the duplication.

6. **Add "Automatic Journaling" and "Link Sharing" to the feature set.** These are real capabilities that matter to the target audience. The proposed feature cards for these are well-written.

7. **Consider the feature section layout.** Five cards after a long demo walkthrough risks skim-and-skip. Test whether a 2+2+1 grid or an accordion pattern performs better than a flat five-card row.

---

*Assessment based on code review of the current implementation (`HomeHero.tsx`, `markdown/canvas/home/README.md`) and the proposed content plan (`docs/tasks/Home Page Sections.md`). No user testing data was available.*

---

## Update Log

**2026-04-20** — `Home Page Sections.md` has been revised to incorporate the sticky viewport annotations and address the gaps identified in this assessment. Specifically:

- **Sticky viewport retained.** Every scroll section now includes explicit `view`, `command`, and `button` block annotations using the canvas DSL. The viewport flow is documented in a state-transition table at the end of the document.
- **Live interactive demo preserved.** The Cycle section and Example section both use `set-state: track` with `open: view` to launch the inline timer. The scroll itself drives the demo — no clicks required.
- **Browse the Library section restored.** Section 5 brings back the embedded collection browser with a `browse` state view block.
- **Features use the viewport.** Each feature card is paired with a specific viewport state (journal editor, review panel, cast button) so the panel continues demonstrating capabilities rather than going idle.
- **Source file inventory added.** A table lists the six new markdown source files needed in `markdown/canvas/home/` to support the viewport flow.
- **Viewport Flow Summary table added.** Documents the complete state machine from hero to closing CTA — heading attributes, viewport state, source file, and what the visitor sees at each step.
