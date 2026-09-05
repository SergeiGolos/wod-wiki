# Field discovery, identity, and metadata provenance

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none

## Question

What makes an automatically discovered field the same field across records, and how do linked metadata fields become safe query dimensions?

Resolve:
- Canonical custom keys versus labels and raw metric types, including the PropertyMetric key-loss defect in source sections 3.1 and 5 Phase 2.
- Supported JSON shapes: scalar values, nested paths, arrays, nulls, and absent properties; distinguish discoverable dimensions from numeric measures without redefining every numeric metadata property as a measurement.
- Discovery scope and catalog lifetime; inferred types and unit metadata; conflicts within a field and collisions between built-in fields, metric properties, and linked metadata.
- Metadata lookup and precedence across segment, workout, note, and effort; missing or multi-valued relationships; namespace/provenance visible to query authors. Do not duplicate contributions when metadata has multiple values.
- Query behavior for unknown fields versus fields known to the catalog but absent on some records. Address unsupported grouping dimensions from source section 3.5.

Resolution must name the field contract, lookup/precedence rules, and consumer-observable examples, with verified source entry points for the eventual changes. It must not implement the catalog or select a new abstraction solely because the proposal names one.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
