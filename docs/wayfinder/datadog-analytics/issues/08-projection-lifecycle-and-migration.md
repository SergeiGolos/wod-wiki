# Projection lifecycle and existing-data migration

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: open
Assignee: unassigned
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: 01, 02
Prerequisites: [Field discovery, identity, and metadata provenance](01-field-discovery-and-identity.md); [Automatic grain selection and contribution ownership](02-automatic-grain-and-contributions.md)

## Question

How do existing and newly collected records acquire the agreed field and contribution semantics without losing archival information or producing stale analytics?

Resolve:
- What can be recovered from existing authoritative logs, including custom property keys and linked metadata, and what genuinely absent historical information cannot be reconstructed.
- Projection/schema versioning, re-derivation or backfill, idempotent finalization, and atomicity boundaries; distinguish raw source data from disposable projections.
- How edits and deletions to results, notes, efforts, and metadata affect queries. Decide live metadata versus historical snapshots where needed, building on the provenance contract.
- Existing-session compatibility and treatment of in-progress workouts; avoid unapproved dual-write stores or compatibility shims.
- Ownership and clean-cutover prerequisites across core, lang, wql, persistence, and consumers. This is a migration plan, not migration execution.

Resolution must state lifecycle transitions, recovery limits, and migration acceptance examples with verified source seams. It must provide the change signals needed by the performance and invalidation ticket.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets.
