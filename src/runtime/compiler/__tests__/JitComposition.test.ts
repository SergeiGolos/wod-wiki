import { describe, it, expect, beforeEach } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { CodeStatement } from "@/core/models/CodeStatement";
import { TimerFragment } from "../fragments/TimerFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { RepFragment } from "../fragments/RepFragment";
import { CodeMetadata } from "@/core/models/CodeMetadata";
import { FragmentType } from "@/core/models/CodeFragment";

// Import typed blocks for assertions
import { AmrapBlock } from "../../typed-blocks/AmrapBlock";
import { EmomBlock } from "../../typed-blocks/EmomBlock";
import { TimerLeafBlock } from "../../typed-blocks/TimerLeafBlock";
import { RoundLoopBlock } from "../../typed-blocks/RoundLoopBlock";

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
             super("0:00", meta, forceUp);
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
        // AMRAP 10 min — TypedBlockFactory creates an AmrapBlock
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(600000, true), // 10 min
            new MockRoundsFragment(1)
        ];
        statement.hints = new Set(['behavior.timer', 'behavior.rounds']);
        statement.children = [new CodeStatement()]; // Children trigger AMRAP

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("AMRAP");
        expect(block).toBeInstanceOf(AmrapBlock);
    });

    it("should compile EMOM block using composition with aspect-based behaviors", () => {
        // EMOM 10 min (Every 1 min)
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(60000), // 1 min interval
            new MockRoundsFragment(10) // 10 rounds
        ];
        statement.hints = new Set(['behavior.repeating_interval']);

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("EMOM");
        expect(block).toBeInstanceOf(EmomBlock);
    });

    it("should compile generic Timer block with aspect-based behaviors", () => {
        // For Time: 5 min — TimerLeafBlock
        const statement = new CodeStatement();
        statement.fragments = [
            new MockTimerFragment(300000)
        ];

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        expect(block?.blockType).toBe("TimerLeaf");
        expect(block).toBeInstanceOf(TimerLeafBlock);

        // Verify the block has a duration fragment
        const timerBlock = block as TimerLeafBlock;
        expect(timerBlock.timer).toBeDefined();
    });

    it("should auto-detect rep scheme from RepFragments and add FragmentPromotionBehavior", () => {
        // (21-15-9) — parser creates RoundsFragment(3) + 3 RepFragments
        const meta = new CodeMetadata(0, 0, 0, 0);
        const statement = new CodeStatement();
        statement.fragments = [
            new RoundsFragment(3, meta),
            new RepFragment(21, meta),
            new RepFragment(15, meta),
            new RepFragment(9, meta),
        ];

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        // Should create a RoundLoopBlock (Rounds fragment, no children)
        expect(block.blockType).toBe("Rounds");
        expect(block).toBeInstanceOf(RoundLoopBlock);

        // Rep fragments should be in the block's plan fragments
        const roundBlock = block as RoundLoopBlock;
        const repFragments = roundBlock.fragments.byType(FragmentType.Rep);
        expect(repFragments.length).toBe(3);
    });

    it("should not add FragmentPromotionBehavior rep scheme when no RepFragments present", () => {
        // (3 rounds) — only RoundsFragment, no RepFragments
        const meta = new CodeMetadata(0, 0, 0, 0);
        const statement = new CodeStatement();
        statement.fragments = [
            new RoundsFragment(3, meta),
        ];

        const block = compiler.compile([statement], runtime);

        expect(block).toBeDefined();
        if (!block) return;

        expect(block.blockType).toBe("Rounds");
        expect(block).toBeInstanceOf(RoundLoopBlock);

        // No rep fragments
        const roundBlock = block as RoundLoopBlock;
        const repFragments = roundBlock.fragments.byType(FragmentType.Rep);
        expect(repFragments.length).toBe(0);
    });
});
