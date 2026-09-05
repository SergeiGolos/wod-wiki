# Cross-workout tables and aggregate drill-down

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02, 03
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md); [Time buckets, group keys, and alignment boundaries](03-time-buckets-and-group-keys.md)

## Question

How do cross-workout analytical tables and drill-down expose trustworthy records without breaking existing session rows queries?

Resolve:
- Row identity and grain for cross-workout segments versus current per-run output statements; exact relationships to aggregate contributions and grouped results.
- Filtering on discovered fields and linked metadata, column selection, units, deterministic ordering, limits, and pagination semantics. Treat the proposal's pipe suffixes as candidates.
- Deduplicate overlapping row scopes by record identity without dropping legitimate repeated measurements (source section 3.6).
- Preserve existing single-session row behavior where intended; define any deliberate contract changes and how aggregate drill-down carries filters, range, group, and selected source grain.
- Shared versus distinct result shapes for rows, aggregates, and chart views; compatible widget switching must not silently reaggregate data.

Resolution must include concrete cross-workout and overlapping-scope examples, a table/drill-down contract, and affected grammar, query-service, and presentation seams. Any arithmetic requirements must reference the arithmetic ticket instead of inventing a competing policy.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
