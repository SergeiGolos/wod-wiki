import { describe, it, expect, beforeEach, mock } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { ParsedCodeStatement, ICodeStatement } from "@/core/models/CodeStatement";
import { FragmentType } from "@/core/models/CodeFragment";
import { IRuntimeBlockStrategy } from "../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../BlockBuilder";
import { TimerFragment } from "@/runtime/compiler/fragments/TimerFragment";
import { MemoryLocation } from "../../memory/MemoryLocation";

class MockStrategy implements IRuntimeBlockStrategy {
    priority = 100;
    capturedNodes: ICodeStatement[] = [];

    match(nodes: ICodeStatement[], runtime: IScriptRuntime): boolean {
        return true;
    }
    apply(builder: BlockBuilder, nodes: ICodeStatement[], runtime: IScriptRuntime): void {
        this.capturedNodes = nodes;
        builder.setBlockType("MockBlock");
        // Must provide context and key to build successfully
        builder.setContext({} as any).setKey({} as any);
    }
}

describe("JIT Compiler Injection", () => {
    let runtime: IScriptRuntime;
    let compiler: JitCompiler;
    let parentBlock: IRuntimeBlock;

    beforeEach(() => {
        parentBlock = {
            getFragmentMemoryByVisibility: mock((visibility) => {
                if (visibility === 'promote') {
                    // Return a memory location with a promoted timer fragment
                    const timerFragment = new TimerFragment("60", { line: 0 } as any);
                    const loc = new MemoryLocation('fragment:promote', [timerFragment]);
                    return [loc];
                }
                return [];
            }),
            // Mock other required props slightly to satisfy TS if needed (though 'as any' covers it)
        } as any;

        runtime = {
            stack: {
                current: null
            },
            memory: { search: () => undefined },
        } as any;
        compiler = new JitCompiler();
    });

    it("should inject promoted fragments from parent block into child statements", () => {
        // Setup parent on stack
        (runtime.stack as any).current = parentBlock;

        // Register a mock strategy to capture the nodes passed to apply
        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node
        const childNode = new ParsedCodeStatement();
        childNode.fragments = [];

        // Compile
        compiler.compile([childNode], runtime);

        // Verify injection
        expect(strategy.capturedNodes.length).toBe(1);
        const injectedFragments = strategy.capturedNodes[0].fragments;
        expect(injectedFragments.length).toBeGreaterThan(0);

        const fragment = injectedFragments[0]; // Injected should be first (appended to empty)
        expect(fragment).toBeDefined();
        expect(fragment.fragmentType).toBe(FragmentType.Timer);
        expect((fragment as TimerFragment).image).toBe("60");
    });

    it("should append promoted fragments to existing fragments", () => {
        // Setup parent on stack
        (runtime.stack as any).current = parentBlock;

        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node with existing fragment
        const childNode = new ParsedCodeStatement();
        const existingFragment = new TimerFragment("30", { line: 0 } as any);
        childNode.fragments = [existingFragment];

        compiler.compile([childNode], runtime);

        expect(strategy.capturedNodes.length).toBe(1);
        const fragments = strategy.capturedNodes[0].fragments;
        expect(fragments.length).toBe(2);

        // According to our logic: [...node.fragments, ...promotedFragments]
        // So existing first, promoted second
        expect(fragments[0]).toBe(existingFragment);
        expect((fragments[1] as TimerFragment).image).toBe("60");
    });

    it("should respect origin precedence when sorting fragments", () => {
        // Setup parent with higher precedence fragment (compiler)
        parentBlock = {
            getFragmentMemoryByVisibility: mock((visibility) => {
                if (visibility === 'promote') {
                    const timerFragment = new TimerFragment("60", { line: 0 } as any);
                    (timerFragment as any).origin = 'compiler'; // Higher precedence (rank 2)
                    const loc = new MemoryLocation('fragment:promote', [timerFragment]);
                    return [loc];
                }
                return [];
            }),
        } as any;
        (runtime.stack as any).current = parentBlock;

        const strategy = new MockStrategy();
        compiler.registerStrategy(strategy);

        // Child node with lower precedence fragment (parser, rank 3)
        const childNode = new ParsedCodeStatement();
        const existingFragment = new TimerFragment("30", { line: 0 } as any);
        (existingFragment as any).origin = 'parser';
        childNode.fragments = [existingFragment];

        compiler.compile([childNode], runtime);

        expect(strategy.capturedNodes.length).toBe(1);
        const compiledNode = strategy.capturedNodes[0] as ParsedCodeStatement;

        // Check getFragment behavior directly on the node (simulating behavior consumption)
        // Since clone preserves prototype, getFragment() should work
        // However, ParsedCodeStatement inherits CodeStatement methods.
        // Let's manually trigger the sort logic or just inspect order.

        // Default sort logic:
        // Rank(Compiler) = 2
        // Rank(Parser) = 3
        // Sort Ascending (smallest rank first) -> Compiler first.

        // BUT wait, CodeStatement.getAllFragmentsByType sorts by rank.
        // If clone is created via Object.create(Object.getPrototypeOf(node)),
        // it should have getFragment method.

        // Let's verify getFragment works.
        const effectiveFragment = compiledNode.getFragment(FragmentType.Timer);
        expect(effectiveFragment).toBeDefined();
        // Should be the one with higher precedence (compiler i.e. "60")
        expect((effectiveFragment as TimerFragment).image).toBe("60");
    });
});
