# Shared query execution across dashboards and notes

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 05, 06
Prerequisites: [Query documents and shared-key formulas](05-query-documents-and-formulas.md); [Cross-workout tables and aggregate drill-down](06-analytical-tables-and-drilldown.md)

## Question

Which execution and rendering boundaries make the same query document mean the same thing in the Explorer, dashboard route, embedded note view, and editor preview?

Resolve:
- One ownership path for parsing, tokens, query/host range precedence, unit preferences, rollup prerequisites, query-family dispatch, and diagnostic propagation.
- Remove duplicate dashboard-model ownership and string-based calc detection through a source-grounded clean cutover; choose whether an existing module can own the work rather than automatically introducing QueryDocumentRunner.
- Rows must execute as rows rather than synthetic empty aggregates. Editor previews must receive applicable frontmatter tokens and execution context.
- Widget-independent query results and the rendering requirements for supported charts, analytical tables, scatter, multi-axis views, zero-filled gaps, and explained invalid calculations.
- Public package contracts, injected storage dependencies, and which host responsibilities remain app-side.

Resolution must give a responsibility diagram or concise contract table, affected callers, and parity scenarios covering every surface gap in source section 3.9 and Phase 3. It specifies the cutover and visual acceptance criteria; it does not implement it.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
