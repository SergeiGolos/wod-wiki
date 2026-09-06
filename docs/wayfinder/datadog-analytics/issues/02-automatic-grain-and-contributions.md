# Automatic grain selection and contribution ownership

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md)

## Question

How does an ordinary query select exactly the intended contributions without requiring users to understand event and summary storage grains?

Resolve:
- Metric-aware selection for summary totals, segment-only custom metrics, and metrics available at both levels; explicit grain override behavior; no blanket summary-only rule.
- Distinguish duplicate representations from separate observations, repeated legitimate measurements, and repeated summary finalization. Scope identity and ownership by workout/result as appropriate.
- Automatic selection when queries group by a dimension unavailable on summaries, or span sessions with different available grains. Specify when automatic selection must reject rather than guess.
- Explainability: what source contributions a user can inspect for an aggregate.
- Repair requirements for event/summary double counting, global effort-scope collapse, and content joins discarding event-grain facts (source sections 3.2, 3.7, 3.8). A content relationship must not silently change the chosen grain.

Resolution must give selection/ownership rules and examples covering mixed sessions, attributed and unattributed efforts, and explicit overrides, plus implementation entry points. Reuse field identity established by the blocking ticket.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.

## Comments

### Equal observation weighting — agreed during grilling

Each recorded observation counts equally by default, not each workout. For ten bar-velocity observations of 1 m/s in one workout and two of 2 m/s in another, the pooled average is 14/12 m/s, not the unweighted average of the two workout averages. Equal-workout weighting must be explicit. Automatic summary substitution must preserve this weighting rather than silently changing the population.

### Result-preserving summary substitution — agreed during grilling

A summary may replace the observations it represents only when it preserves the requested calculation, filters, grouping, and observation weighting. A sum plus count can support a pooled average; an average alone cannot. A summary lacking a requested grouping dimension cannot replace detailed observations for that grouping. Use detailed observations when the summary is insufficient, and never count both a summary and its represented observations. Behavior when neither sufficient detail nor a sufficient summary exists remains to be settled.

### Insufficient retained evidence — agreed during grilling

If a relevant workout has neither sufficient detailed observations nor a summary sufficient for the requested calculation, reject the affected calculation and identify that workout. Do not silently omit it, count its average as one observation, or treat missing aggregation evidence as a zero-valued observation. This is distinct from ordinary missing measurements governed by the map's missing-value rules.

### Explicit summary coverage — agreed during grilling

Automatic summary selection requires provenance identifying what a derived summary represents: its workout and covered observations/segments or equivalent precise coverage, aggregation, and supporting statistics such as count where needed. Same metric name, workout, or numeric value alone does not prove coverage or duplication. For older summaries without sufficient provenance, use detailed observations when available; otherwise apply the insufficient-evidence rule. Coverage must distinguish whole-workout, per-effort, and partial summaries.

### Unassigned effort groups — agreed during grilling

Grouping by effort preserves observations without an assigned effort in an unassigned group. Attributed records in another workout or elsewhere in the same result set must not globally suppress unattributed contributions. Explicit effort filters still exclude nonmatching observations normally. A whole-workout summary is not an unassigned observation merely because it lacks an effort tag; coverage provenance distinguishes an overall aggregate from genuinely unattributed detail.

### Explicit grain overrides are strict — agreed during grilling

An explicit detailed-observations-only or summaries-only query must use the requested source selection. If that selection cannot answer correctly, report the limitation rather than silently switching grains. The override does not waive overlap protection, evidence requirements, or observation weighting. Automatic fallback remains available only when no explicit grain override forbids it.

### Direct measurements in summary storage — agreed during grilling

A directly recorded metric, such as one user-entered HRV value, is one observation even if its storage row has summary grain. It is not an aggregate of hypothetical segment readings. Provenance distinguishes direct measurements from derived summaries; only derived summaries used as substitutes must identify the observations they replace. Do not reject a direct measurement merely because no underlying detail exists.

### Newly calculated metrics at their own scope — agreed during grilling

A newly calculated metric is an observation at the scope that produces it, rather than inheriting the observation count of its input metrics. One `sessionLoad` value of 200 from one workout and one of 400 from another average to 300, regardless of input segment counts. This differs from a summary that compresses existing observations of the same metric, which must preserve their count and weighting. Provenance must distinguish a new calculated observation from a substitute summary and from duplicate storage representations.

## Answer

Resolved through live grilling with Serge. The authoritative [Automatic grain selection and contribution ownership contract](../assets/automatic-grain-contract.md) distinguishes observations, newly calculated observations, substitute summaries, and duplicate representations. It specifies coverage-based selection, weighting, strict overrides, limitations, effort ownership, and inspection requirements, with source entry points and acceptance examples.

The comments above record the human decisions chronologically. The linked contract consolidates them; no production query or storage implementation was performed. Known downstream work was added to the existing time, arithmetic, lifecycle, drill-down, shared-execution, and performance tickets rather than creating duplicate decisions.
