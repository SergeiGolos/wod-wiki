# Plan: wod.wiki Homepage Redesign Prototype — Scroll-Driven Walkthrough

## Goal
Prototype a redesigned wod.wiki homepage featuring a scroll-driven walkthrough
section (pattern from humanlayer.com) that walks the visitor through the three
core layers of the product as they scroll:
1. The Editor (workout scripting / markdown editor)
2. The Timer (runtime workout clock / display)
3. The Analytics Layer (results, history, insights)

## Stage 1 — Research (parallel explore subagents)
- Agent A: Fetch and analyze https://wod.wiki — current homepage structure,
  branding, product description, editor/timer/analytics features, color/style cues.
- Agent B: Analyze https://humanlayer.com scroll-walkthrough pattern — layout
  mechanics (sticky mock window + scrolling annotations), annotation style,
  typography, copy tone. Extract the reusable interaction pattern.
- Output: two briefs feeding the build.

## Stage 2 — Design (load musepool skill)
- Load /app/.agents/plugins/musepool/skills/musepool/SKILL.md for design
  inspiration; define palette, typography, layout direction for the prototype.

## Stage 3 — Build prototype
- Single-file HTML/CSS/JS prototype page (no build tooling needed):
  - Hero section (redesigned wod.wiki positioning)
  - Scroll-driven walkthrough: sticky mock app window on one side; three
    step cards (Editor → Timer → Analytics) scroll by, each highlighting the
    corresponding region of the mock window with an outline/callout.
  - IntersectionObserver-based step activation, highlight ring on active
    region, smooth transitions.
- Output: /mnt/agents/output/wodwiki-walkthrough/index.html

## Stage 4 — Deliver
- Call mshtools-website_version_manager action=build_version, type=html.
- Return preview URL + summary of the design decisions.
