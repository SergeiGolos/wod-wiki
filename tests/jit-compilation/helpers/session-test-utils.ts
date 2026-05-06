/**
 * Session Test Utilities
 *
 * Shared helpers for Phase 4 output statement integration tests.
 * Creates a full ScriptRuntime + JitCompiler pipeline with all strategies,
 * then starts a session via SessionRootStrategy.
 */
import { ScriptRuntime } from '@/runtime/ScriptRuntime';
import { JitCompiler } from '@/runtime/compiler/JitCompiler';
import { RuntimeStack } from '@/runtime/RuntimeStack';
import { EventBus } from '@/runtime/events';
import { createMockClock, type MockClock } from '@/runtime/RuntimeClock';
import { sharedParser } from '@/parser/parserInstance';
import { WhiteboardScript } from '@/parser/WhiteboardScript';
import { StartSessionAction, StartSessionOptions } from '@/runtime/actions/stack/StartSessionAction';
import { NextAction } from '@/runtime/actions/stack/NextAction';
import { OutputTracingHarness, TracedOutput } from '../../harness/OutputTracingHarness';

// All composable strategies for the JIT pipeline
import { AmrapLogicStrategy } from '@/runtime/compiler/strategies/logic/AmrapLogicStrategy';
import { IntervalLogicStrategy } from '@/runtime/compiler/strategies/logic/IntervalLogicStrategy';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { GenericLoopStrategy } from '@/runtime/compiler/strategies/components/GenericLoopStrategy';
import { GenericGroupStrategy } from '@/runtime/compiler/strategies/components/GenericGroupStrategy';
import { RestBlockStrategy } from '@/runtime/compiler/strategies/components/RestBlockStrategy';
import { SoundStrategy } from '@/runtime/compiler/strategies/enhancements/SoundStrategy';
import { ReportOutputStrategy } from '@/runtime/compiler/strategies/enhancements/ReportOutputStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';

/**
 * Creates a JitCompiler with all production strategies registered.
 */
export function createFullCompiler(): JitCompiler {
    const compiler = new JitCompiler();

    // Logic strategies (Priority 90)
    compiler.registerStrategy(new AmrapLogicStrategy());
    compiler.registerStrategy(new IntervalLogicStrategy());

    // Component strategies (Priority 50)
    compiler.registerStrategy(new GenericTimerStrategy());
    compiler.registerStrategy(new GenericLoopStrategy());
    compiler.registerStrategy(new GenericGroupStrategy());
    compiler.registerStrategy(new RestBlockStrategy());

    // Enhancement strategies (Priority 15-50)
    compiler.registerStrategy(new SoundStrategy());
    compiler.registerStrategy(new ReportOutputStrategy());
    compiler.registerStrategy(new ChildrenStrategy());

    // Fallback strategies (Priority 0)
    compiler.registerStrategy(new EffortFallbackStrategy());

    return compiler;
}

/**
 * Full session test harness combining ScriptRuntime + OutputTracing.
 */
export interface SessionTestContext {
    runtime: ScriptRuntime;
    script: WhiteboardScript;
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
    const script = sharedParser.read(scriptText) as WhiteboardScript;
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
 * Dispatches a named event to the runtime.
 * Use this to simulate user-driven or system events (e.g. 'timer:pause', 'timer:resume').
 */
export function simulateEvent(ctx: SessionTestContext, name: string, data: Record<string, unknown> = {}): void {
    ctx.runtime.handle({
        name: name as any,
        timestamp: ctx.clock.now,
        data,
    });
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

/**
 * Lightweight runtime context for performance tests.
 *
 * Identical to `SessionTestContext` except no `OutputTracingHarness` is
 * attached. Output callbacks add measurable overhead when millions of events
 * are emitted across many rounds, which would artificially inflate timing
 * numbers in performance-focused tests. Use this when the test only needs to
 * verify correctness (stack count, timing) rather than inspect output content.
 */
export interface PerfSessionContext {
    runtime: ScriptRuntime;
    clock: MockClock;
    /** Advance to the next step (equivalent to `userNext`). */
    next: () => void;
    /** Dispose the runtime. */
    dispose: () => void;
}

/**
 * Creates a minimal ScriptRuntime **without** an OutputTracingHarness and
 * immediately starts the session, ready for iteration.
 *
 * Use in performance tests where tracer overhead would skew timing results.
 */
export function createStartedPerfContext(
    scriptText: string,
    label = 'PerfTest',
    clockTime: Date = new Date('2024-01-01T12:00:00Z')
): PerfSessionContext {
    const script = sharedParser.read(scriptText) as WhiteboardScript;
    const compiler = createFullCompiler();
    const clock = createMockClock(clockTime);
    const stack = new RuntimeStack();
    const eventBus = new EventBus();

    const runtime = new ScriptRuntime(script, compiler, { stack, clock, eventBus });
    runtime.do(new StartSessionAction({ label }));

    return {
        runtime,
        clock,
        next: () => runtime.do(new NextAction()),
        dispose: () => runtime.dispose(),
    };
}
