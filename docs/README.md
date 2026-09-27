# WOD Wiki Documentation Index

Welcome to the living documentation for WOD Wiki. Documentation is organized into clear domains:

---

## 1. System Architecture
* [`architecture/overview.md`](./architecture/overview.md) — System pipeline, package topology, and storage architecture.
* [`architecture/metric-lifecycle.md`](./architecture/metric-lifecycle.md) — How metrics are born, rewritten, compiler-bound, and tracked.
* [`architecture/interfaces.md`](./architecture/interfaces.md) — Public extension seams (`IDialect`, `IRuntimeBehavior`, `IRuntimeBlockStrategy`).

---

## 2. Language & Query References
* [`language/syntax-reference.md`](./language/syntax-reference.md) — Complete Whiteboard Language syntax: timers, rounds, ladders, reps, choice groups.
* [`language/dialects.md`](./language/dialects.md) — Built-in dialects: `time`, `climb`, `cardio`, `yoga`, `habits`.
* [`language/wql-reference.md`](./language/wql-reference.md) — Declarative query language: `find:`, `rows:`, `<agg>:`, and cross-store joins.

---

## 3. Application & User Workflows
* [`app/screens-and-workflow.md`](./app/screens-and-workflow.md) — The Plan → Track → Analyze lifecycle and application views.
* [`app/on-this-page.md`](./app/on-this-page.md) — Dynamic scroll sync, workout headers, and section tracking.

---

## 4. Domain Model Specifications (`docs/domain-model/`)
The canonical specifications for storage entities and data relationships in IndexedDB (`wodwiki-db v23`):
* [`domain-model/Note-Page-WQL-Alignment.md`](Note-Page-WQL-Alignment.md) — Note vs Page ownership and WQL alignment.
* [`domain-model/WQL-Domain-Query-Composition.md`](WQL-Domain-Query-Composition.md) — Detailed guide to compositional queries under the new domain model.
* [`domain-model/Note.md`](./domain-model/Note.md) — Authored content container.
* [`domain-model/Page.md`](./domain-model/Page.md) — Placement and routing anchor.
* [`domain-model/PageNote.md`](./domain-model/PageNote.md) — Many-to-many junction joining Page ↔ Note.
* [`domain-model/Tag.md`](./domain-model/Tag.md) & [`domain-model/TagType.md`](./domain-model/TagType.md) — Dynamic typed tags.
* [`domain-model/EventRecord.md`](./domain-model/EventRecord.md) & [`domain-model/Session.md`](./domain-model/Session.md) — Execution telemetry and session metadata.

---

## 5. Visual Wireframes & Architecture Diagrams
* [`abstract-views/`](./abstract-views/) — Excalidraw diagrams illustrating wall clock, split-pane canvas, and stream views.

