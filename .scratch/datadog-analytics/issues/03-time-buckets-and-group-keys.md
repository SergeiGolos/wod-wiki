# Time buckets, group keys, and alignment boundaries

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none

## Question

What precise keys and time boundaries make two analytics observations belong to the same bucket and group?

Resolve:
- Civil versus fixed-duration buckets, timezone source, daylight-saving transitions, week boundaries, timestamp basis, and inclusive/exclusive range endpoints. Reuse existing WQL civil-time decisions unless an explicit conflict requires reconsideration.
- Explicit query range over host defaults, including dashboard parameters and standalone embedded queries; define the evaluation clock for relative ranges shared across a document.
- Collision-free group identity, multiple grouping dimensions, and ordering. Treat field identities as opaque stable keys here; field discovery owns their provenance.
- The output bucket domain for empty periods and differing input ranges: which buckets and groups exist before missing-value filling. Do not invent every possible combination of tags.
- Rules for aligning different bucket sizes or grouping shapes: reject, require an explicit transformation, or another agreed rule. Shared time/grouping alignment is in scope; arbitrary joins are not.

Resolution must supply a bucket/group/range contract with boundary examples. It must leave arithmetic treatment of absent observations to Missing values, units, and numerical correctness rather than deciding it twice.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
