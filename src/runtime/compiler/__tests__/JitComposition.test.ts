import { describe, it, expect, mock, beforeEach } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { CodeStatement } from "@/core/models/CodeStatement";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { AmrapLogicStrategy } from "../strategies/logic/AmrapLogicStrategy";
import { IntervalLogicStrategy } from "../strategies/logic/IntervalLogicStrategy";
import { GenericTimerStrategy } from "../strategies/components/GenericTimerStrategy";
import { GenericLoopStrategy } from "../strategies/components/GenericLoopStrategy";
import { SoundStrategy } from "../strategies/enhancements/SoundStrategy";
import { HistoryStrategy } from "../strategies/enhancements/HistoryStrategy";
import { ChildrenStrategy } from "../strategies/enhancements/ChildrenStrategy"; // Added
import { BoundTimerBehavior } from "../../behaviors/BoundTimerBehavior";
import { BoundLoopBehavior } from "../../behaviors/BoundLoopBehavior";
import { UnboundLoopBehavior } from "../../behaviors/UnboundLoopBehavior";
import { SinglePassBehavior } from "../../behaviors/SinglePassBehavior"; // Added
import { IntervalWaitingBehavior } from "../../behaviors/IntervalWaitingBehavior";
import { SoundBehavior } from "../../behaviors/SoundBehavior";
import { HistoryBehavior } from "../../behaviors/HistoryBehavior";
import { CodeMetadata } from "@/core/models/CodeMetadata";

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

    it("should compile AMRAP block using composition and avoid SinglePass", () => {
        // AMRAP 10 min
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

        // Check Behaviors
        // AMRAP should have BoundTimer (Up) and UnboundLoop
        const timer = block.getBehavior(BoundTimerBehavior);
        expect(timer).toBeDefined();
        expect(timer?.direction).toBe('up');
        expect(timer?.durationMs).toBe(600000);

        const loop = block.getBehavior(UnboundLoopBehavior);
        expect(loop).toBeDefined();

        // Should NOT have BoundLoopBehavior (overridden by Amrap logic + GenericLoop check)
        const boundLoop = block.getBehavior(BoundLoopBehavior);
        expect(boundLoop).toBeUndefined();

        // Should NOT have SinglePassBehavior (ChildrenStrategy should see UnboundLoop)
        const singlePass = block.getBehavior(SinglePassBehavior);
        expect(singlePass).toBeUndefined();
    });

    it("should compile EMOM block using composition", () => {
        // EMOM 10 min (Every 1 min)
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

        expect(block.blockType).toBe("Interval");

        // Timer should be Interval Duration (1 min)
        const timer = block.getBehavior(BoundTimerBehavior);
        expect(timer?.durationMs).toBe(60000);
        expect(timer?.direction).toBe('down');

        // Should have IntervalWaiting
        expect(block.getBehavior(IntervalWaitingBehavior)).toBeDefined();

        // Should have Sound (added by SoundStrategy)
        expect(block.getBehavior(SoundBehavior)).toBeDefined();
    });

    it("should compile generic Timer block", () => {
        // For Time: 5 min
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(300000)
        ];

        compiler.registerStrategy(new GenericTimerStrategy());
        compiler.registerStrategy(new SoundStrategy());

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        expect(block?.blockType).toBe("Timer");
        expect(block?.getBehavior(BoundTimerBehavior)).toBeDefined();
        expect(block?.getBehavior(SoundBehavior)).toBeDefined();
    });
});
