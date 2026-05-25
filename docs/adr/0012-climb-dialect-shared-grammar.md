# ADR-0012: Rock Climbing Dialect Uses Shared Whiteboard Grammar

**Date**: 2026-05-25  
**Status**: Proposed  
**Area**: Whiteboard Language / Dialects / Analytics  
**Related PRD**: [PRD: Rock Climbing Dialect](../prd-climb-dialect.md)

## Context

WOD Wiki currently documents three Markdown dialect fences: `wod`, `log`, and `plan`. They share the same Whiteboard core syntax and parser. The dialect primarily communicates intent and lets downstream tooling label or process the block appropriately.

The rock climbing research report identifies a strong product opportunity for a markdown-native climbing log. Climbers need to record route/problem name, grade, send type, attempt count, high point, location, conditions, partners, session RPE, and narrative beta. Existing climbing apps serve parts of this workflow, but they create trade-offs around social sharing, data export, automatic tracking, community route databases, and long-term ownership.

There are two plausible implementation paths:

1. Create a separate `climb` parser/grammar for climbing syntax.
2. Add `climb` as a semantic dialect over the existing Whiteboard grammar.

The current architecture already includes `IDialect`, `DialectRegistry`, semantic hints, dialect-emitted metrics, and analytics processor applicability by dialect. That makes a semantic dialect the lower-risk path.

## Decision

Introduce `climb` as a Whiteboard dialect fence that uses the shared core parser and a dedicated `ClimbDialect` analyzer.

The first implementation must not fork the Chevrotain grammar. Instead, it interprets existing fragments:

- `Action` for route/problem names, usually bracketed: `[The Shield]`
- `Effort`/text-like fragments for grades and send types: `V7 redpoint`
- `Quantity` with `@` for attempt count shorthand, pending final syntax decision
- `Text` comments for beta, conditions, and free-form notes
- properties for session-level context: `location`, `discipline`, `duration`, `rpe`, `energy`, `conditions`, `grade_system`

The dialect emits climbing-specific hints and metrics rather than changing the parser output shape.

Expected hints include:

```text
domain.climb
climb.bouldering
climb.sport
climb.trad
climb.top_rope
climb.hangboard
climb.project
behavior.attempt_based
behavior.grade_based
behavior.route_based
```

Expected metrics include grade, send type, attempt count, route/problem name, high point, climbing discipline, and session context.

## Rationale

### Preserve Existing Architecture

The current dialect model already supports semantic enrichment after parsing. `ClimbDialect` fits the same contract as existing WOD, cardio, yoga, CrossFit, and habits dialects.

### Reduce Parser Risk

Climbing notation has many local conventions: `V6`, `7A`, `5.11d`, `6c+`, `OS`, `RP`, `TR`, `@8`, `bolt 6`, `move 9`. A separate grammar would need to settle all of that upfront. A semantic analyzer can start with conservative recognition and leave ambiguous values as raw text.

### Preserve Markdown Portability

The goal is not to invent a proprietary climbing markup language. The goal is to make common climbing notes structured enough for WOD Wiki while remaining readable in Obsidian, GitHub, static sites, spreadsheets, and plain text.

### Enable Incremental Analytics

Analytics processors can activate on `dialects: ['climb']` and known metric types. We can add grade pyramid, V-sum, max grade, session load, and project tracking without destabilizing unrelated workout analytics.

## Consequences

### Positive

- Low implementation risk compared with a new grammar.
- Existing parser, editor, review grid, runtime, and analytics architecture remain usable.
- Climbing-specific recognition can improve over time through fixtures.
- Ambiguous syntax can be preserved instead of rejected.
- External Markdown workflows remain first-class.

### Negative

- Some climbing syntax will remain heuristic in the MVP.
- `@` attempt shorthand may collide conceptually with current quantity semantics.
- Grade recognition may require session context to avoid ambiguity, especially `7A` and `6c+`.
- A shared grammar limits how compact or app-like the syntax can become.

### Neutral / Deferred

- A dedicated climbing grammar can still be introduced later if the semantic approach reaches a clear ceiling.
- Grade conversion tables can remain outside the parser and live in analytics or bundled data.
- Route databases and app imports can be layered on after the core dialect exists.

## Alternatives Considered

### Alternative 1: Dedicated Climbing Grammar

Create a new parser for climbing-specific lines and session schemas.

**Rejected for now** because it increases parser surface area, duplicates core line-handling behavior, and requires too many domain decisions before user testing. It may become appropriate if climb syntax needs nested route attempts, pitch-level route modeling, or stricter validation that the shared grammar cannot express.

### Alternative 2: Use Existing `log` Dialect Only

Document climbing conventions inside `log` without a new fence.

**Rejected** because analytics and editor tooling would have to infer climbing intent from free text. That weakens processor selection and makes climbing logs less discoverable.

### Alternative 3: Store Climbing Data Only In Markdown Frontmatter

Use YAML frontmatter for all structured climbing data and leave the fence body as narrative.

**Rejected** because ascent-level records are naturally line-oriented. Frontmatter works well for session metadata but becomes unwieldy for route-by-route logging.

## Implementation Notes

1. Add `climb` to the documented Whiteboard dialect list when implementation begins.
2. Add a `ClimbDialect` class under `src/dialects/` using existing `IDialect` contracts.
3. Keep grade parsing conservative: preserve raw grade, detect likely system, and mark ambiguity rather than forcing conversion.
4. Add a send-type enum and alias table in a climbing-specific module.
5. Add fixture tests for bouldering, outdoor sport climbing, trad/top-rope examples, and hangboard sessions.
6. Update analytics processor descriptor types only if the current dialect union does not allow `climb`.
7. Ensure existing `wod`, `log`, and `plan` dialect behavior remains unchanged.

## Acceptance Criteria

1. `climb` can be recognized as a dialect fence without adding a new grammar.
2. Common climbing examples parse through the shared Whiteboard parser.
3. `ClimbDialect` emits `domain.climb` and discipline-specific hints from representative fixtures.
4. Grades preserve raw text and detected system.
5. Send type aliases normalize to a closed canonical set.
6. Attempt counts are extracted only when unambiguous or explicitly marked.
7. Climbing analytics can be implemented as processors scoped to `climb` without affecting existing dialects.
