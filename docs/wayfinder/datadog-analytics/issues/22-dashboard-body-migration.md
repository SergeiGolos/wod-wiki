# Legacy dashboard bodies and authoring operations migration to Query Documents

Labels: wayfinder:grilling
Type: grilling
Mode: HITL
Status: resolved; implemented (see Answer notes)
Assignee: serge
Parent: [WQL analytics — from collected metrics to trustworthy answers](../map.md)
Blocked by: none
Prerequisites: [Query documents and shared-key formulas](05-query-documents-and-formulas.md); [Query documents and formulas contract](../assets/query-documents-contract.md); [Dashboard Note ownership](../deepening/04-dashboard-note.md)

## Question

How do legacy single-line widget bodies (first-` / ` positional parameter split) and the noteOps authoring operations migrate to block-local Query Documents without silently truncating or reinterpreting saved dashboards?

Resolve:

- **Slash ambiguity.** A one-line document body `pace = time / dist / $goal` is genuinely ambiguous between division and the legacy positional split. Multi-line bodies are documents (no positional split); whether single-line bodies keep the legacy split as a permanent degenerate form, or are rewritten on migration, must be decided — the legacy-split default is safe but is not yet a settled answer.
- **Positional parameters versus host bindings.** The contract says tokens enter as explicit `$token` bindings. Decide whether positional parameters survive at all inside document bodies, and how existing saved dashboards carrying them keep working (lazy degenerate parse versus eager rewrite — saved dashboards are live IndexedDB notes, so this is a data-migration decision, not only a grammar one).
- **Full fenced body extraction.** `model.ts`'s section parser and the noteOps identity guards both keep only the first non-comment line today; multi-line documents require both to compare/replace the full body. Confirm this semantic change to the shared extraction seam and its guard behavior (stale body → null, never a partial write).
- **noteOps home and result shape.** Beside the parser in wql's Dashboard Note Module versus a shared module; and whether the null-on-guard-mismatch contract becomes a structured result instead of `string | null`.
- **Out of scope:** playground-only frontmatter link-widget helpers stay app-only; no compatibility re-export layer for the deleted fork.

Follow the map's standing choices. Claim before investigating. Work with the human; do not answer their design decisions on their behalf. Record the resolution only when agreed, under an appended Answer heading, with links to any assets. Tickets 17 (grammar/documents) and 19 (fork deletion and cutover) consume this resolution; the document grammar must not ship before the slash disposition exists.

## Answer

Agreed 2026-09-06, grilling session with serge (four questions, one at a time):

1. **Body framing — documents everywhere, eager rewrite.** Every widget body is a Query Document; single-line bodies parse as degenerate documents. The legacy first-` / ` positional split is retired. Saved dashboards are rewritten in an IndexedDB data migration executed by ticket 19's cutover (batched on ticket 14's lifecycle patterns); a body that cannot parse as a document after rewrite is preserved verbatim and badged — never dropped, never silently reinterpreted. **Ordering constraint:** the rewrite lands before or atomically with the grammar flip — the document parser must never encounter an un-rewritten legacy ` / ` body, whose division/params reading would silently change meaning mid-transition. Until both land together, the current parser stays bug-for-bug; the migration and the cutover are one deployable unit.
2. **Presentation params — fence-tag attributes.** Verified: positional params are presentation configuration only (consumed by `GoalRings`/`ZoneDistribution`, never by query execution). They persist as attributes on the widget's fence tag beside the existing type/span suffix; `splitWidgetBody` is deleted; attribute parsing belongs to the dashboard model (ticket 19), not the WQL grammar (ticket 17).
3. **Guards — strict full-body.** noteOps identity guards compare the widget's exact fenced body text; any concurrent change stale-marks the operation — re-read, never a blind or partial write. The section parser compares/replaces the full body likewise, so multi-line documents can no longer truncate to their first line.
4. **noteOps — wql home, structured result.** noteOps moves beside the parser in `packages/wql/src/dashboard`; operations return `{ ok; note } | { ok: false; reason: 'not-found' | 'stale-body' | … }` so callers distinguish a missing widget from a concurrent edit.

Glossary: the **Dashboard Note** entry now states that presentation parameters ride the fence-tag suffix as attributes and the widget body is a Query Document.

Consumers: [ticket 17](17-query-documents-and-formulas.md) (document grammar — unblocked from the slash disposition by this Answer), [ticket 19](19-shared-query-execution.md) (fork deletion, attribute parsing, rewrite migration, noteOps move).
