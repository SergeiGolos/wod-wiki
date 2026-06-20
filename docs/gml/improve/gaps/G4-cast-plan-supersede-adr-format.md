# G4 — Mark cast plan superseded + establish ADR format ✅ DONE (2026-06-20)

> Source: minimax [#00 meta](../../../minimax/improve/00-meta-findings.md).
> Partially noted in global-plan #8 cleanup and README; not turned into
> actionable stories. **Severity:** Low (governance). **No dependencies.**

### Result

**G4a:** `docs/cast-architecture-plan.md` has a SUPERSEDED banner pointing at the shipped CastSessionManager / ReceiverSessionManager modules + remaining-friction location.

**G4b:** `docs/adr/` directory created with `0000-template.md` (standard ADR format) + `README.md` (index + when-to-write guidance). Two ADRs deferred until decisions crystallize (parser/compile dialect-stage split from S5a/S5b; post-mount snapshot invariant from S3a + G3).

## Problem

Two governance items neither survey turned into a story:

1. **`docs/cast-architecture-plan.md` is stale.** All four phases shipped
   (`CastSessionManager`, `ReceiverSessionManager`, `needsClockSync`,
   `ViewSession.ts` deleted, `castTransport` in `CastTransportContext`). The
   global plan's #4 opening line notes *"the prior plan; sender side largely
   achieved"* — softer than reality. A future reader of the cast plan will
   believe the work is pending.

2. **No `docs/adr/` directory exists.** The global-plan README notes *"No
   `docs/adr/` exists in this repo"* — but doesn't create one. The cast plan
   is the cautionary tale: a well-considered plan rotted because the code
   shipped and the doc didn't follow. If any of the global-plan findings are
   rejected with a load-bearing reason, there's nowhere to record it.

## Solution

Two independent stories. Both are safe to execute in wave 0.

---

## G4a — Mark `cast-architecture-plan.md` superseded

### Steps

1. Add a banner at the top of `docs/cast-architecture-plan.md`:

   ```markdown
   > **Status: SUPERSEDED (2026-Q2).** All four phases shipped.
   > Sender session management: `src/services/cast/rpc/CastSessionManager.ts`.
   > Receiver session management: `src/services/cast/rpc/ReceiverSessionManager.ts`.
   > `ViewSession.ts` deleted; `castTransport` in `CastTransportContext.tsx`.
   > Remaining friction (ReceiverApp init paths, CastButtonRpc orchestration)
   > is tracked in [global plan Track 4](gml/improve/04-cast-session-wiring-layer.md).
   ```

2. Optionally move the file to `docs/history/` if the team prefers a clean
   `docs/` root. Either is fine — the banner is the load-bearing part.

### Acceptance

- `docs/cast-architecture-plan.md` has the superseded banner.
- No other doc references it as "pending" or "to-do."

### Risks

None.

---

## G4b — Create `docs/adr/` + format template

### Steps

1. Create `docs/adr/` directory.
2. Create `docs/adr/0000-template.md` with the standard ADR format:

   ```markdown
   # ADR-NNNN — Title

   > **Status:** proposed | accepted | superseded | deprecated
   > **Date:** YYYY-MM-DD

   ## Context

   What is the issue we're facing? What facts constrain the decision?

   ## Decision

   What we decided and why.

   ## Consequences

   What follows from this decision — positive, negative, neutral.

   ## Related

   Links to findings, code, other ADRs.
   ```

3. Create `docs/adr/README.md` with a one-paragraph intro and a numbered
   index table (ADR number → title → status).

4. The first two candidate ADRs (if the global plan executes):
   - **ADR-0001:** *"Parse stage and compile stage are distinct Dialect
     Stages; no dialect runs in both."* (from S5a/S5b — the decision to make
     the Dialect Stack a real module and remove the empty compile-time
     registry)
   - **ADR-0002:** *"Stack snapshots reflect post-mount state; pre-mount
     blocks never appear in a snapshot."* (from S3a + G3 — the invariant
     that closed the `_notifyStackSettled` workaround)

   These are not written by G4b — they're written when/if their stories ship
   and the decision crystallizes. G4b only creates the format and the
   directory.

### Acceptance

- `docs/adr/` exists.
- `docs/adr/0000-template.md` exists with the format above.
- `docs/adr/README.md` exists with the index table.

### Risks

None.

## Stories

- **G4a** — mark cast plan superseded. No dependencies. Wave 0.
- **G4b** — create ADR directory + template. No dependencies. Wave 0.
