/**
 * Session Test Utilities
 *
 * Shared helpers for Phase 4 output statement integration tests.
 * Creates a full ScriptRuntime + JitCompiler pipeline,
 * then starts a session via SessionRootStrategy.
 * 
 * Note: The TypedBlockFactory (built into JitCompiler) handles all block
 * creation directly from statement fragments. No strategy registration needed.
 */
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock, type MockClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WodScript } from '@/parser/WodScript';
import { StartSessionAction, StartSessionOptions } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';
import { OutputTracingHarness, TracedOutput } from '../../harness/OutputTracingHarness';

/**
 * Creates a JitCompiler. The TypedBlockFactory handles all JIT compilation
 * directly — no strategy registration needed.
 */
export function createFullCompiler(): JitCompiler {
    return new JitCompiler();
}

/**
 * Full session test harness combining ScriptRuntime + OutputTracing.
 */
export interface SessionTestContext {
    runtime: ScriptRuntime;
    script: WodScript;
    clock: MockClock;
    tracer: OutputTracingHarness;
}

/**
 * Creates a full session test context:
 * 1. Parses the workout script
 * 2. Creates ScriptRuntime with all strategies
 * 3. Attaches OutputTracingHarness
 *
 * Does NOT start the session — call `startSession()` after creation.
 */
export function createSessionContext(
    scriptText: string,
    clockTime: Date = new Date('2024-01-01T12:00:00Z')
): SessionTestContext {
    const script = sharedParser.read(scriptText) as WodScript;
    const compiler = createFullCompiler();
    const clock = createMockClock(clockTime);
    const stack = new RuntimeStack();
    const eventBus = new EventBus();

    const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });
    const tracer = new OutputTracingHarness(runtime);

    return { runtime, script, clock, tracer };
}

/**
 * Starts a session by dispatching StartSessionAction.
 * This builds a SessionRootBlock and pushes it, which mounts
 * the root (emitting segment output) and pushes WaitingToStart.
 */
export function startSession(ctx: SessionTestContext, options?: StartSessionOptions): void {
    ctx.runtime.do(new StartSessionAction(options));
}

/**
 * Simulates user clicking "Next" / "Start" button.
 * Dispatches a NextAction which calls next() on the current block.
 */
export function userNext(ctx: SessionTestContext): void {
    ctx.runtime.do(new NextAction());
}

/**
 * Advances the mock clock and dispatches a tick event.
 * Use this to trigger timer-based behaviors (countdown completion, sound cues).
 */
export function advanceClock(ctx: SessionTestContext, ms: number): void {
    ctx.clock.advance(ms);
    ctx.runtime.handle({
        name: 'tick',
        timestamp: ctx.clock.now,
        data: { source: 'test-harness' }
    });
}

/**
 * Returns current stack info for debugging.
 */
export function stackInfo(ctx: SessionTestContext): {
    depth: number;
    current: string | undefined;
    blocks: string[];
} {
    return {
        depth: ctx.runtime.stack.count,
        current: ctx.runtime.stack.current?.label,
        blocks: ctx.runtime.stack.blocks.map(b => b.label),
    };
}

/**
 * Cleans up the session context. Call in afterEach().
 */
export function disposeSession(ctx: SessionTestContext): void {
    ctx.tracer.dispose();
    ctx.runtime.dispose();
}
