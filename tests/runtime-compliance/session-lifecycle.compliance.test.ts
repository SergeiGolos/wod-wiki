/**
 * Session Lifecycle Compliance Tests
 *
 * Based on: docs/finishline/compliance-scenarios/session-lifecycle.md
 *
 * Covers all session lifecycle scenarios, step-by-step, matching the spec tables.
 *
 * Legend:
 *   🟢 Expected to pass — behaviour is fully implemented
 *   🔴 Expected to FAIL (RED) — behaviour is not yet implemented
 *
 * Scenarios covered:
 *   🟢 Full Session — Start to Finish (Effort)
 *   🟢 Full Session — Timer Auto-Complete
 *   🟢 Full Session — Multi-Block
 *   🟢 Early Termination / Abort (.skip)
 */
import { TestScript, assertions } from '@/testing/script';
import { currentBlockType } from '../helpers/compliance-helpers';

// ===========================================================================
// 🟢 Full Session — Start to Finish (Effort)
// Spec: session-lifecycle.md#-full-session--start-to-finish-effort
//
// 10 Pullups
// Step 0: startSession → SessionRoot · WaitingToStart (depth = 2)
// Step 1: userNext       → SessionRoot · Effort (WaitingToStart completes)
// Step 2: userNext       → session ends (depth = 0)
// ===========================================================================
describe('🟢 Full Session — Start to Finish (Effort)', () => {
    const SCRIPT = '10 Pullups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2 (SessionRoot + WaitingToStart)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: first userNext → WaitingToStart pops, Effort block mounts (depth = 2)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect((await script.snapshot()).depth).toBe(2);
        expect(currentBlockType(await script.snapshot())).toMatch(/effort/i);
    });

    it('step 2: second userNext → session ends (depth = 0)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // dismiss WaitingToStart → Effort mounts
        await script.next(); // Effort completes → session ends
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired (segment + completion for every block)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.next();
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Full Session — Timer Auto-Complete
// Spec: session-lifecycle.md#-full-session--timer-auto-complete
//
// 1:00 Row
// Step 0: startSession          → SessionRoot · WaitingToStart (2 segments)
// Step 1: userNext              → SessionRoot · Timer (WaitingToStart completes)
// Step 2: advanceClock(60_000)  → Timer expires → session ends
// ===========================================================================
describe('🟢 Full Session — Timer Auto-Complete', () => {
    const SCRIPT = '1:00 Row';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 1: userNext → Timer starts (no userNext needed to end)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect(currentBlockType(await script.snapshot())).toMatch(/timer/i);
    });

    it('step 2: advanceClock(60_000) → timer expires, session auto-terminates (depth = 0)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('all outputs are paired (no userNext needed to end)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        await script.tick(60_000);
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Full Session — Multi-Block
// Spec: session-lifecycle.md#-full-session--multi-block
//
// (3)
//   10 Pullups
//   15 Pushups
// ===========================================================================
describe('🟢 Full Session — Multi-Block', () => {
    const SCRIPT = '(3)\n  10 Pullups\n  15 Pushups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 0: startSession → depth = 2', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('dismiss gate: first userNext → depth = 3 (Rounds + child 1 on stack)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(3);
    });

    it('output count grows with each userNext during rounds', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // dismiss gate → R1 child1
        const countAfterStart = assertions(await script.snapshot()).outputs().count();
        await script.next(); // R1 child1 → R1 child2
        expect(assertions(await script.snapshot()).outputs().count()).toBeGreaterThan(countAfterStart);
    });

    it('session ends cleanly after all 3 rounds complete', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // dismiss gate
        // 3 rounds × 2 children = 6 exercise completions
        for (let r = 0; r < 3; r++) {
            await script.next(); // child 1
            await script.next(); // child 2
        }
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('output count is at least 16 (rounds + children + session)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        for (let r = 0; r < 3; r++) {
            await script.next();
            await script.next();
        }
        expect(assertions(await script.snapshot()).outputs().count()).toBeGreaterThanOrEqual(16);
    });

    it('all outputs are paired', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        for (let r = 0; r < 3; r++) {
            await script.next();
            await script.next();
        }
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });
});

// ===========================================================================
// 🟢 Early Termination / Abort (.skip)
// Spec: session-lifecycle.md#-early-termination--abort-skip
//
// 20:00 AMRAP
//   5 Pullups
//   10 Pushups
//
// Steps 1-3: normal start, do 1 round → AMRAP running
// Step 4:    simulateEvent('abort')   → AMRAP force-pops
// Step 5:    —                        → stack empties, open segments closed
// Step 6:    —                        → assertPairedOutputs() passes
// ===========================================================================
describe('🟢 Early Termination / Abort (.skip)', () => {
    const SCRIPT = '20:00 AMRAP\n  5 Pullups\n  10 Pushups';
    let script: TestScript;

    afterEach(async () => { if (script) await script.dispose(); });

    it('step 1: startSession → AMRAP setup visible (depth = 2)', async () => {
        script = await TestScript.compile(SCRIPT);
        expect((await script.snapshot()).depth).toBe(2);
    });

    it('step 2: userNext starts AMRAP and pushes first exercise', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next();
        // WaitingToStart popped; AMRAP block + first exercise on stack
        expect((await script.snapshot()).depth).toBeGreaterThanOrEqual(3);
        const amrapBlock = (await script.snapshot()).blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
    });

    it('step 3: complete 1 round (Pullups + Pushups) → AMRAP still running', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start AMRAP
        await script.tick(60_000);
        await script.next(); // Pullups done
        await script.next(); // Pushups done → round 2 starts
        // AMRAP is still on the stack (timer has not expired)
        const amrapBlock = (await script.snapshot()).blocks.find(b => b.blockType === 'AMRAP');
        expect(amrapBlock).toBeDefined();
    });

    it('step 4: simulateEvent("abort") → AMRAP force-pops, stack empties', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start AMRAP
        await script.tick(60_000);
        await script.next(); // Pullups
        await script.next(); // Pushups → round 2
        await script.userEvent('abort');
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('step 5: abort on a fresh session (no rounds done) also empties stack', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start AMRAP
        await script.userEvent('abort');
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('step 6: assertPairedOutputs() passes after abort', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start AMRAP
        await script.tick(60_000);
        await script.next(); // Pullups
        await script.next(); // Pushups → round 2
        await script.userEvent('abort');
        const unpaired = assertions(await script.snapshot()).outputs().assertPairedOutputs();
        expect(unpaired).toEqual([]);
    });

    it('abort on an already-empty stack is a no-op (no crash)', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start AMRAP
        await script.userEvent('abort'); // first abort → drains stack
        await script.userEvent('abort'); // second abort → should be safe no-op
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('abort without ever starting session → no crash', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.userEvent('abort');
        expect((await script.snapshot()).depth).toBe(0);
    });

    it('outputs are emitted for all blocks present at time of abort', async () => {
        script = await TestScript.compile(SCRIPT);
        await script.next(); // start → WaitingToStart completes, AMRAP + Pullups pushed
        const countBeforeAbort = assertions(await script.snapshot()).outputs().count();
        await script.userEvent('abort');
        // Additional completion outputs should have been emitted during abort
        expect(assertions(await script.snapshot()).outputs().count()).toBeGreaterThan(countBeforeAbort);
    });
});
