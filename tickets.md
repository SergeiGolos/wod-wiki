# Ticket: Integrate Challenge Progress into Sticky Header and Inline Sections

Move the challenge status UI from the macOS-style editor chrome to the canvas page's sticky navigation header, and render each challenge inline inside the section that fulfills it.

## Parent

N/A — standalone ticket derived from conversation.

## What to build

### Current state

On canvas pages (`MarkdownCanvasPage`), the full set of syntax challenges is currently shown as a list at the bottom of the page using the `ChallengeBanner` component. The MacOS-style editor chrome (`MacOSChrome`) does not yet expose the challenge menu, but the intended move is: take that editor-chrome challenge menu concept and place it in the page's sticky header next to the page title (e.g. "WOD Wiki" on `/`, "Core Concepts" on `/guide/syntax/basics`).

### Target behaviour

1. **Header badge / menu**
   - The sticky canvas header shows a small challenge badge next to the page title.
   - The badge displays the number of completed challenges over the total (e.g. `2/4`).
   - The badge also shows a small check icon when all challenges are complete.
   - Clicking/interacting with the badge opens a dropdown menu listing all page challenges, each showing its label and completion state.
   - The existing subsection menu functionality that used to appear in the MacOS editor window should continue to work from this new header location.
   - The challenge badge/menu should be removed from the MacOS-style editor window if it is currently rendered there.

2. **Inline challenge widgets**
   - Instead of rendering all challenges at the end of the page, authors can place a challenge inside the section that fulfills it using a directive like `{{challenge:<id>}}` in the markdown prose.
   - When rendered, the directive becomes an inline challenge card in that section.
   - The card shows the same information as a single challenge row: icon, label, completion state, and the current validation hint.
   - Clicking an inline challenge scrolls the user to the editor section where the challenge can be completed.

3. **Validation updates**
   - As the user edits the active editor block and quests pass or fail, the header badge count and every inline challenge card update in real time.

## Acceptance criteria

- [ ] `parseCanvasMarkdown` recognises `{{challenge:<id>}}` in section prose and produces a chunk that can be rendered by the canvas prose renderer.
- [ ] `CanvasSection` renders an inline challenge widget for each `{{challenge:<id>}}` chunk, using the live quest state from `useSyntaxChallenge` / `usePageQuests`.
- [ ] The page-level sticky header (not the MacOS editor chrome) displays a challenge badge with `n/total` and a completed state, next to the page title.
- [ ] The sticky header badge opens a challenge dropdown menu that preserves the subsection navigation behaviour previously shown in the MacOS editor window.
- [ ] The challenge list is removed from the bottom of the page; the legacy bottom-of-page `ChallengeBanner` is no longer rendered for canvas pages.
- [ ] Any challenge UI is removed from the MacOS editor chrome window.
- [ ] Clicking an inline challenge widget scrolls the page/editor to the section/block where the challenge can be completed.
- [ ] The feature is covered by existing or new tests in `MarkdownCanvasPage.test.tsx` / `parseCanvasMarkdown.test.ts` / `useSyntaxChallenge.test.ts` (whichever is appropriate); the full test suite passes (`npm run test`).

## Blocked by

None — can start immediately.

## Relevant code seams

- `playground/src/canvas/parseCanvasMarkdown.ts` — add directive parsing to `splitProseForWidgets` (follow the existing `{{hero-carousel}}` / `{{workouts}}` pattern). The `Quest` interface and `extractPageQuests` already collect the page's quest definitions.
- `playground/src/canvas/CanvasProse.tsx` / `playground/src/components/molecules/CanvasSection.tsx` — render the new `{{challenge:<id>}}` chunk inside the prose body. `CanvasSection` already receives `challengeQuests`.
- `playground/src/components/molecules/ChallengeBanner.tsx` — reuse the icon, status, and hint rendering for inline cards; the header badge/menu may be a new component or a derived compact version of this.
- `playground/src/canvas/MarkdownCanvasPage.tsx` — wire the challenge state into the sticky header (via `panelHeaderActions` or a new header slot), remove the bottom-of-page challenge list, and remove the challenge element from the MacOS editor chrome.
- `playground/src/templates/SplitCanvasTemplate.tsx` / `playground/src/components/organisms/canvas/CanvasProsePanel.tsx` — own the page shell and header layout; the sticky header may be implemented here or exposed as a slot from `MarkdownCanvasPage`.

## Notes

- Prefer the existing widget-directive parser pattern; avoid inventing a new syntax.
- Keep the challenge dropdown menu fully accessible and keyboard-navigable, matching the current subsection menu behaviour.
- The MacOS editor chrome should remain focused on editor framing (traffic lights, title, reset) and not on challenge progress.
- If the existing `ChallengeBanner` component is too bulky for the inline card, extract a smaller `ChallengeCard` presentational component and use it in both `ChallengeBanner` (header dropdown) and the inline renderer.
