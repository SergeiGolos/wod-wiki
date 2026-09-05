# Automatic grain selection and contribution ownership

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
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
