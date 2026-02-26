import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { JitCompiler } from '../../src/runtime/compiler/JitCompiler';
import { EffortFallbackStrategy } from '../../src/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { ChildrenStrategy } from '../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { GenericGroupStrategy } from '../../src/runtime/compiler/strategies/components/GenericGroupStrategy';
import { IScriptRuntime } from '../../src/runtime/contracts/IScriptRuntime';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { createMockClock } from '../../src/runtime/RuntimeClock';

describe('Grouped Statements Compilation', () => {
    const parser = new MdTimerRuntime();
    const compiler = new JitCompiler([
        new GenericGroupStrategy(),
        new EffortFallbackStrategy(),
        new ChildrenStrategy()
    ]);

    const mockRuntime: IScriptRuntime = {
        jit: compiler,
        clock: createMockClock(),
        stack: {
            current: undefined,
            push: () => {},
            pop: () => undefined,
            depth: 0,
        },
        getOutputStatements: () => [],
        addOutput: () => {},
    } as any;

    it('compiles grouped statements (+) into a single block with fragments from all statements', () => {
        const script = `
(3 rounds):
  - 10 Burpees
  + 10 Pushups
`.trim();
        const result = parser.read(script);
        
        // Find the parent block
        const parentStatement = result.statements.find(s => s.children.length > 0);
        expect(parentStatement).toBeDefined();
        
        // 3 Rounds should have one group of children if they are grouped by +
        expect(parentStatement!.children).toHaveLength(1);
        expect(parentStatement!.children[0]).toHaveLength(2);

        const childIds = parentStatement!.children[0];
        const childStatements = childIds.map(id => result.getId(id)!);

        // Compile the group
        const block = compiler.compile(childStatements as any, mockRuntime);
        expect(block).toBeDefined();

        // Check source IDs in block
        expect(block!.sourceIds).toHaveLength(2);
        expect(block!.sourceIds).toContain(childStatements[0].id);
        expect(block!.sourceIds).toContain(childStatements[1].id);

        // Check fragments in block memory
        const displayFragments = block!.getMemoryByTag('fragment:display').flatMap(loc => loc.fragments);
        
        const reps = displayFragments.filter(f => f.fragmentType === FragmentType.Rep);
        const efforts = displayFragments.filter(f => f.fragmentType === FragmentType.Effort);

        // Should contain fragments from BOTH statements
        expect(reps).toHaveLength(2);
        expect(efforts).toHaveLength(2);
    });
});
