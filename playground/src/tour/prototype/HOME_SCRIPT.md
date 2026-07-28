# Home Page Script — PROTOTYPE (wayfinder #765)

> Throwaway design artifact. The "script" of the redesigned home page: sections in
> order, their grouping, and the **type of tutorial element** each carries — the
> contract every wireframe variant in this directory enacts differently.
> Locked inputs: #756 (job), #757 (structure), #758 (verdicts), #759 (drop-offs/events),
> #760 (Learn target), #761 (behaviors pages + demo model), #762 (sample data),
> #763 (Library landing), #764 (three-tier responsive).

## Element types (legend)

| Type | Meaning |
|---|---|
| `live-demo` | Real interactive component the visitor can touch (editor, WallClock) |
| `pitch` | One-beat marketing line in visitor vocabulary (from #756: marketing lives here) |
| `exit` | Commitment-free navigation link (strip doors) |
| `drop-off` | Primary instrumented route into a surface (fires `home:*` event) |
| `secondary` | ≤2 secondary links beside a drop-off |
| `progress` | Persistent quest/progress surface |
| `reference` | Lookup block (cheat sheet, command palette) |
| `visual` | Demonstration graphic (analytics scorecard, clock window) |

## Act structure

The page is a single scroll in two forms (from #764):
**desktop ≥1024px** = tour form (staged sticky window where a stage exists);
**mobile <1024px** = card stack (same sections, same order, static cards).

## Scene list (order locked by #757)

| # | Section | Grouping | Elements | Drop-off / event |
|---|---|---|---|---|
| 1 | **Hero** | headline + `live-demo` (welcome-1.md editor) in one viewport | `pitch` ("Write it / Run it / Own the Analytics"), `live-demo`, Run-in-place, Share | "Open in editor" → `/journal/<today>` clone · `home:demo_opened`; interactions: `home:demo_edited` / `home:demo_run` (fullscreen + stored playground entry, #761) / `home:demo_shared` |
| 2 | **Short-circuit strip** | one line, no pitch | `exit` ×2 + scroll offer | Library → `/collections` · `home:library_opened`; New note → fresh empty note · `home:note_created` |
| 3 | **Learn the Language** | start-line + `progress` + chapter links | `pitch` ("From first wod line to fluency — Lesson 1 is 3 minutes, runnable in place"), `progress` (7 tour quests + chapter quests), links | Lesson 1 → `/guide/syntax/basics` · `home:lesson_started`; `secondary` cheat sheet · `home:cheatsheet_opened`. Chapter links mirror sidebar order (#760) |
| 4 | **What Happens When It Runs** | tour stage (desktop) / card (mobile) | `pitch` ("The script becomes the clock"), `visual`/`live-demo` (WallClock in sticky window; mobile: static card) | Behaviors explainer → `/guide/behaviors` · `home:behaviors_opened` |
| 5 | **Explore Your Data** | tour stage / card | `pitch` ("Query what you just did"), `visual` (desktop: ReviewGrid + scorecard fake data; mobile: single scorecard stat, #764) | Explorer pre-filled → `/analytics/explorer?query=…` · `home:explorer_opened`; `secondary` Dashboard · `home:dashboard_viewed`. Empty store → explain + "Load sample data" (#762) |
| 6 | **The Movement Registry** | static area (no tour ancestor, #758) | `pitch` ("Every movement your metrics speak in"), discipline/MET teaser rows | Registry → `/efforts` · `home:efforts_opened` |
| 7 | **Quick Reference** | static area | `pitch` ("Look it up in seconds"), `reference` (docked cheat-sheet table, ~15 constructs, each opens a runnable example; ⌘/ palette) | Cheat sheet · `home:reference_opened` |
| ✕ | Proof section | — | — | **cut** (#758: no fabricatable proof pre-launch) |
| ✕ | Outro CTAs / Library rows / Run area | — | — | **cut/collapsed** (#757, #758) |

## Mobile card notes (#764)

- Same order, static cards; nothing off-screen at any of the 3 breakpoints.
- Section 4's sticky-window WallClock does not exist on mobile — runs originate from
  the hero demo and go fullscreen.
- Section 5's grid visual degrades to a single scorecard stat / sparkline.

## Consent

All `home:*` events record locally always; external forwarding is consent-gated (#759).
