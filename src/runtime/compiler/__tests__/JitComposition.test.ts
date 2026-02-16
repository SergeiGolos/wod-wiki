import { describe, it, expect, beforeEach } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { CodeStatement } from "@/core/models/CodeStatement";
import { TimerFragment } from "../fragments/TimerFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { RepFragment } from "../fragments/RepFragment";
import { AmrapLogicStrategy } from "../strategies/logic/AmrapLogicStrategy";
import { IntervalLogicStrategy } from "../strategies/logic/IntervalLogicStrategy";
import { GenericTimerStrategy } from "../strategies/components/GenericTimerStrategy";
import { GenericLoopStrategy } from "../strategies/components/GenericLoopStrategy";
import { SoundStrategy } from "../strategies/enhancements/SoundStrategy";
import { HistoryStrategy } from "../strategies/enhancements/HistoryStrategy";
import { ChildrenStrategy } from "../strategies/enhancements/ChildrenStrategy";
import { CodeMetadata } from "@/core/models/CodeMetadata";

// Import new aspect-based behaviors for tests
import { 
    TimerBehavior,
    RoundInitBehavior,
    SoundCueBehavior,
    HistoryRecordBehavior,
    RepSchemeBehavior
} from "../../behaviors";

describe("JIT Composition", () => {
    let runtime: IScriptRuntime;
    let compiler: JitCompiler;

    beforeEach(() => {
        runtime = {
            memory: { search: () => undefined }
        } as any;
        compiler = new JitCompiler();
    });

    // Mock Fragments for testing since we don't want to rely on parsing logic in unit test
    class MockTimerFragment extends TimerFragment {
        constructor(ms: number, forceUp: boolean = false) {
             const meta = new CodeMetadata(0, 0, 0, 0);
             // Create a dummy image
             super("0:00", meta, forceUp);
             // Override values
             (this as any).value = ms;
             (this as any).original = ms;
             (this as any).forceCountUp = forceUp;
        }
    }

    class MockRoundsFragment extends RoundsFragment {
         constructor(val: number) {
             super("0", new CodeMetadata(0, 0, 0, 0));
             (this as any).value = val;
         }
    }

    it("should compile AMRAP block using composition with aspect-based behaviors", () => {
        // AMRAP 10 min - uses new aspect-based behaviors
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(600000, true), // AMRAP implies 'up'
            new MockRoundsFragment(1) // Placeholder
        ];
        statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
        statement.children = [new CodeStatement()]; // Add children to trigger ChildrenStrategy

        compiler.registerStrategy(new AmrapLogicStrategy()); // Priority 90
        compiler.registerStrategy(new GenericTimerStrategy()); // Priority 50
        compiler.registerStrategy(new GenericLoopStrategy()); // Priority 50
        compiler.registerStrategy(new ChildrenStrategy()); // Priority 50
        compiler.registerStrategy(new SoundStrategy()); // Priority 20
        compiler.registerStrategy(new HistoryStrategy()); // Priority 20

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("AMRAP");
        expect(block.label).toContain("10 min");

        // Check Behaviors - now using aspect-based behaviors
        // AMRAP should have TimerBehavior (direction: 'up') and RoundInitBehavior (unbounded)
        const timer = block.getBehavior(TimerBehavior);
        expect(timer).toBeDefined();

        const round = block.getBehavior(RoundInitBehavior);
        expect(round).toBeDefined();

        // Should have HistoryRecordBehavior
        expect(block.getBehavior(HistoryRecordBehavior)).toBeDefined();
    });

    it("should compile EMOM block using composition with aspect-based behaviors", () => {
        // EMOM 10 min (Every 1 min) - uses new aspect-based behaviors
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(60000), // 1 min interval
            new MockTimerFragment(600000), // 10 min total (optional)
            new MockRoundsFragment(10) // 10 rounds
        ];
        statement.hints = new Set(['behavior.repeating_interval']);

        compiler.registerStrategy(new IntervalLogicStrategy());
        compiler.registerStrategy(new GenericTimerStrategy());
        compiler.registerStrategy(new SoundStrategy());

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("EMOM");

        // Timer should use TimerBehavior
        const timer = block.getBehavior(TimerBehavior);
        expect(timer).toBeDefined();

        // Should have SoundCueBehavior (added by SoundStrategy)
        expect(block.getBehavior(SoundCueBehavior)).toBeDefined();
    });

    it("should compile generic Timer block with aspect-based behaviors", () => {
        // For Time: 5 min - uses new aspect-based behaviors
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(300000)
        ];

        compiler.registerStrategy(new GenericTimerStrategy());
        compiler.registerStrategy(new SoundStrategy());

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        expect(block?.blockType).toBe("Timer");
        expect(block?.getBehavior(TimerBehavior)).toBeDefined();
        expect(block?.getBehavior(SoundCueBehavior)).toBeDefined();
    });

    it("should auto-detect rep scheme from RepFragments and add RepSchemeBehavior", () => {
        // (21-15-9) — parser creates RoundsFragment(3) + 3 RepFragments
        const meta = new CodeMetadata(0, 0, 0, 0);
        const statement = new CodeStatement();
        statement.fragments = [
            new RoundsFragment(3, meta),
            new RepFragment(21, meta),
            new RepFragment(15, meta),
            new RepFragment(9, meta),
        ];

        compiler.registerStrategy(new GenericLoopStrategy());

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("Rounds");
        expect(block.label).toBe("21-15-9");

        // RepSchemeBehavior should be attached with round-robin rep scheme
        const repBehavior = block.getBehavior(RepSchemeBehavior);
        expect(repBehavior).toBeDefined();
        expect(repBehavior!.repScheme).toEqual([21, 15, 9]);
        expect(repBehavior!.getRepsForRound(1)).toBe(21);
        expect(repBehavior!.getRepsForRound(2)).toBe(15);
        expect(repBehavior!.getRepsForRound(3)).toBe(9);
        // Round-robin wraps
        expect(repBehavior!.getRepsForRound(4)).toBe(21);
    });

    it("should not add RepSchemeBehavior when no RepFragments present", () => {
        // (3 rounds) — only RoundsFragment, no RepFragments
        const meta = new CodeMetadata(0, 0, 0, 0);
        const statement = new CodeStatement();
        statement.fragments = [
            new RoundsFragment(3, meta),
        ];

        compiler.registerStrategy(new GenericLoopStrategy());

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("Rounds");
        expect(block.label).toBe("3 Rounds");

        // No RepSchemeBehavior when no rep fragments
        const repBehavior = block.getBehavior(RepSchemeBehavior);
        expect(repBehavior).toBeUndefined();
    });
});
