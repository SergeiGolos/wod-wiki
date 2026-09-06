# Widget presentation semantics: scalar endpoints and absent scatter positions

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved; implemented (see Answer notes)
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none
Prerequisites: [Shared query execution across dashboards and notes](07-shared-query-execution-and-surfaces.md); [Missing values, units, and numerical correctness](04-missing-values-units-and-arithmetic.md); [Shared query execution contract](../assets/shared-execution-contract.md); [Query presentation](../deepening/05-query-presentation.md)

## Question

Which product rules govern the presentation choices the engine stops making once widgets consume structured results: per-widget-type scalar endpoint selection, and the display of positions where only one of a scatter's two series has an in-range value?

Resolve:

- **Scalar endpoint policy.** Today `QueryValue` shows the last point of a multi-point series as an indexing accident. Extracting the presentation planner makes the endpoint explicit per widget type (`first` | `last`). Decide which widget types get which endpoint — visible, reviewable configuration instead of a hidden accident. "Last" for value widgets is the incumbent default but is a semantic question, not a settled one.
- **Absent scatter positions.** The arithmetic contract assigns zero-fill display to charts, and the graph rule keeps correlation paired-only over present pairs. Decide whether scatter displays render a position where only one series has an in-range value (zero-filled/synthetic, flagged), or draw paired-only points. Choosing paired-only display amends the graph presentation contract and must say so explicitly — it is not a silent renderer default.
- **Provenance boundary.** Confirm in the same breath: synthetic points exist for display only and never re-enter statistics; `corr` remains paired-only regardless of the display decision.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets. Ticket 19's widget migration and scatter/multi-axis renderers consume this resolution.

## Answer

Agreed 2026-09-06, grilling session with serge (two questions):

1. **Scalar endpoints — uniform last.** Every scalar-reducing widget (value, bar, toplist, stacked-bar) takes the last point of its series; the planner accepts an explicit endpoint override, but no widget defaults to first. The bars/toplist numeric change in the rare multi-point case is a declared behavioral update owned by ticket 19. The `?? 0` conflation dies with the extraction: absent renders as absent, zero only when recorded zero.
2. **Absent scatter positions — paired-only display, explicit contract amendment.** Scatter draws only buckets where both series observed; one-sided buckets remain visible in the view model (flagged partial) but plot nothing. The graph-presentation contract is hereby amended: zero-fill display applies to time-axis charts; value-vs-value axes render pairs only. Multi-axis timeseries keeps per-series zero-fill on the shared real time axis.
3. **Provenance boundary — confirmed in the same breath.** Synthetic points exist for display only and never re-enter statistics; `corr` remains paired-only regardless of any display decision.

Consumer: [ticket 19](19-shared-query-execution.md) — the presentation planner and all scalar-reducing widgets apply rule 1; the scatter renderer applies rule 2; every renderer inherits rule 3.
