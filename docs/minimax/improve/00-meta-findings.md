# Finding 00 — Meta-findings: stale docs, missing ADR directory, four concept gaps

> **Status:** Meta. Surfaced during the same architecture review walk that
> produced Findings 01-06 on 2026-06-19. **Confidence:** High (each item is
> independently verifiable). **Priority:** Low effort, high value for any
> future architecture review.

This document is not a deepening opportunity in the same sense as the other
six. It collects the housekeeping items that the walk surfaced alongside the
friction findings.

## M1. The cast refactor plan is stale; the code shipped, the doc didn't

`docs/cast-architecture-plan.md` describes four phases:

1. Create `CastSessionManager` and `needsClockSync` on `IRpcTransport`.
2. Create `ReceiverSessionManager`.
3. Remove `castTransport` from the store.
4. Cleanup of dead exports and `SubscriptionManagerContext`.

Every phase has been executed:

- `src/services/cast/rpc/CastSessionManager.ts` exists (160 lines) with
  `connect()`, `dispose()`, `registerRuntime()`, `unregisterRuntime()`.
- `src/services/cast/rpc/ReceiverSessionManager.ts` exists (160 lines) with
  `createReceiverSession()` factory and `ReceiverSessionHandle`.
- `src/services/cast/rpc/ViewSession.ts` does **not** exist. `ViewSession`,
  `ChromecastSenderViewSession`, `ChromecastReceiverViewSession`, and
  `LocalViewSession` have zero references in `src/`, `playground/`, or
  `tests/`.
- `src/contexts/CastTransportContext.tsx` is the new owner of
  `castTransport`; `workbenchSyncStore.ts` no longer has the field.
- `IRpcTransport` exposes `needsClockSync`; both
  `BroadcastChannelRpcTransport` and `WebRtcRpcTransport` implement it.

Two minor remnants from the plan:

- `workbenchSyncStore.ts:135` still has
  `subscriptionManager: SubscriptionManager | null`. The plan said "keep the
  field, read via `getState()` one-shot"; the code follows that exactly. If
  the project adopts a `SubscriptionManagerContext` (per the plan's Phase 4),
  the field could leave the store entirely.
- `src/contexts/SubscriptionManagerContext.ts` still exists. The plan's
  Phase 4 flagged it for deletion but didn't execute that step.

**Recommendation:** mark `docs/cast-architecture-plan.md` as superseded
(header banner: *"Executed 2026-06-XX; see Finding 03 for the follow-on store
split."*), or move it to `docs/history/`. Future architecture reviews will
otherwise keep re-suggesting the same work.

## M2. No `docs/adr/` directory exists

The project has no `docs/adr/` and no ADR format. Architecture decisions live
in `docs/*.md` (overviews, plans, gap analyses). The cast refactor is the most
recent example: a long, well-considered plan in `docs/cast-architecture-plan.md`
is now stale because the code shipped and the doc wasn't updated. Findings 01
and 05 are the strongest candidates for the first two ADRs if a `docs/adr/`
directory is adopted:

- **ADR-0001 candidate (Finding 01):** *"Parse stage and compile stage are
  distinct Dialect Stages; no dialect runs in both."*
- **ADR-0002 candidate (Finding 05):** *"Stack snapshots expose only Mounted
  Blocks; the bus's contract excludes pre-mount state."*

Neither decision has a record today. If either is revisited, the absence of
an ADR will make it expensive to reconstruct the reasoning.

## M3. Concept gaps in `CONTEXT.md`

The current `CONTEXT.md` glossary is well-developed for the parser/runtime
seams but has four terms that the friction findings need to name what they
found. Recommended additions, in the same shape as the existing entries:

### Dialect Stage

A named assembly point in the Dialect Stack. Each stage owns its own ordered
dialect list. The parser has a one-dialect "parse stage" (currently
`UnitsDialect`); the compiler has a "compile stage" with N dialects
(registered in `DialectRegistry`). Later Dialects observe earlier Dialects
*within the same stage*; a Stage boundary is a value boundary — statements
crossing it are immutable.

_Found in: Finding 01._

### Mounted Block

A Block whose `onMount` has completed and whose memory is readable. Stack
snapshots should expose only Mounted Blocks. The current code mixes
"pushed but not mounted" with "mounted" snapshots, forcing the
`_notifyStackSettled` workaround.

_Found in: Finding 05._

### Block Lifecycle

The four boundaries (compiled, mounted, completed, disposed) at which
observers can be notified. Currently implicit in the `IRuntimeBehavior` hook
ordering; should be explicit in `CONTEXT.md` to name the contract and to
make the post-mount snapshot contract testable.

_Found in: Finding 05._

### Workbench Effects

Renderless components whose only job is to subscribe to runtime sources and
write to a coordination store. `useWorkbenchEffects`, `WorkbenchCastBridge`,
`EditorCastBridge` are all Workbench Effects. The cast refactor named one
pattern (Bridges); this generalizes it. Provides vocabulary for the god-store
split in Finding 03 and the canvas-page sub-jobs in Finding 06.

_Found in: Findings 03 and 06._

## M4. The six deepening opportunities, ranked

| # | Finding | Confidence | Seam test | Risk | Notes |
|---|---------|-----------|-----------|------|-------|
| 01 | Parser/compiler are both Dialect homes | High | Creates a real seam; collapses a fake one | Touches many callers | Highest leverage; `CONTEXT.md` contradiction |
| 02 | `src/timeline/analytics/` is a misnomered home | High | Collapses a fake seam | Low | Mechanical, immediately testable |
| 03 | `workbenchSyncStore` is 5 stores in a trench coat | Medium | Collapses a fake seam | Many mocks to update | Applies the cast-refactor pattern to the remaining 4 domains |
| 04 | `ReceiverApp` has 3 init paths | High | Collapses a fake seam | Low | Follow-on to the executed cast plan |
| 05 | `ScriptRuntime` is 5 jobs in a class | Medium | Collapses a fake seam | High — touches the most churn-prone file | The architectural fix for the open `mixed-timers.md` bug |
| 06 | `MarkdownCanvasPage` is 5 sub-jobs in a page | Medium | Collapses a fake seam | UX call on mobile/desktop | Locality win, still-settling boundaries |

## M5. Reading order for the next architecture review

If a future review picks up this set of findings, the natural reading order
is:

1. **M1-M3 first** — the meta findings explain *why* the project's decision
   records have rotted and propose vocabulary for the new findings.
2. **Finding 02 next** — lowest risk, highest mechanical return. Wins trust
   for the harder refactors.
3. **Finding 04 next** — direct follow-on to an executed plan; demonstrates
   the "apply the cast-refactor pattern elsewhere" theme.
4. **Finding 01** — highest leverage but biggest blast radius. Has a real
   `CONTEXT.md` contradiction to resolve.
5. **Finding 03** — applies the cast-refactor pattern to the remaining
   god-store domains.
6. **Finding 05** — biggest architectural impact; the precondition for
   closing the `mixed-timers.md` bug.
7. **Finding 06 last** — most local change, but the boundaries are still
   settling.
