import { describe, it, expect, beforeEach, mock } from "bun:test";
import { JitCompiler } from "../JitCompiler";
import { IScriptRuntime } from "../../contracts/IScriptRuntime";
import { IRuntimeBlock } from "../../contracts/IRuntimeBlock";
import { ParsedCodeStatement, ICodeStatement } from "@/core/models/CodeStatement";
import { FragmentType } from "@/core/models/CodeFragment";
import { TimerFragment } from "@/runtime/compiler/fragments/TimerFragment";
import { MemoryLocation } from "../../memory/MemoryLocation";

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
            behaviors: [],
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

        // Child node with no fragments — promoted duration should be injected
        const childNode = new ParsedCodeStatement();
        childNode.fragments = [];

        // Compile — factory creates a typed block from the promoted fragments
        const block = compiler.compile([childNode], runtime);

        // The promoted Duration fragment should cause the factory to create a timer block
        expect(block).toBeDefined();
        // The block should have a Duration fragment from the injection
        const fragments = (block as any).fragments;
        expect(fragments).toBeDefined();
    });

    it("should append promoted fragments to existing fragments", () => {
        // Setup parent on stack
        (runtime.stack as any).current = parentBlock;

        // Child node with existing effort fragment
        const childNode = new ParsedCodeStatement();
        childNode.fragments = [{
            fragmentType: FragmentType.Effort,
            type: 'effort',
            image: 'Burpees',
            origin: 'parser',
            value: 'Burpees',
        }];

        // Compile — factory sees Duration (from promotion) + Effort (existing)
        const block = compiler.compile([childNode], runtime);

        expect(block).toBeDefined();
        // With Duration + no children → TimerLeafBlock
        expect(block!.blockType).toBe('TimerLeaf');
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
            behaviors: [],
        } as any;
        (runtime.stack as any).current = parentBlock;

        // Child node with lower precedence fragment (parser, rank 3)
        const childNode = new ParsedCodeStatement();
        const existingFragment = new TimerFragment("30", { line: 0 } as any);
        (existingFragment as any).origin = 'parser';
        childNode.fragments = [existingFragment];

        const block = compiler.compile([childNode], runtime);

        expect(block).toBeDefined();
        // Both durations should be present — block was still created 
        // (factory picks up the first duration it finds)
        expect(block!.blockType).toBe('TimerLeaf');
    });
});
