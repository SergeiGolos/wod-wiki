# Query documents and shared-key formulas

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 04
Prerequisites: [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md)

## Question

How should one query document express named queries and derived relationships while retaining existing single-query WQL behavior?

Resolve:
- Syntax and parsed representation for named query inputs and formulas; the proposal's a/b/show syntax is a candidate, not an accepted grammar.
- Per-query versus document-level scope, dependency order and cycles, references, localized errors, serialization, and existing fence parameters/frontmatter tokens.
- Aggregate-first versus observation-level calculations; unit/dimension checks; shared bucket/group alignment using the settled contracts. Distinguish ratio-of-totals from average-of-ratios explicitly.
- Required ratio, moving-average, and correlation capabilities from source sections 4 and 5 Phase 5, including temporal lag if needed for the agreed questions. Exclude arbitrary joins.
- Reuse of the existing calc parser/evaluator without silently introducing an invalid package dependency. Confirm current package boundaries and extension seams before choosing reuse.
- A query-result contract that does not change its underlying meaning when a compatible widget type changes; data required for scatter and multi-axis views.

Resolution must define the document/formula contract and user-facing examples, identify grammar/evaluator/package changes, and distinguish rejected designs from the chosen one. No production parser or evaluator changes in this ticket.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
