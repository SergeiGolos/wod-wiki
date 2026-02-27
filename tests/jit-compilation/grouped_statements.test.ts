import { describe, it, expect } from 'bun:test';
import { MdTimerRuntime } from '../../src/parser/md-timer';
import { JitCompiler } from '../../src/runtime/compiler/JitCompiler';
import { EffortFallbackStrategy } from '../../src/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { ChildrenStrategy } from '../../src/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { GenericGroupStrategy } from '../../src/runtime/compiler/strategies/components/GenericGroupStrategy';
import { IScriptRuntime } from '../../src/runtime/contracts/IScriptRuntime';
import { FragmentType } from '../../src/core/models/CodeFragment';
import { createMockClock } from '../../src/runtime/RuntimeClock';
import { ScriptRuntime } from '../../src/runtime/ScriptRuntime';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { EventBus } from '../../src/runtime/events/EventBus';

describe('Grouped Statements Compilation', () => {
    const parser = new MdTimerRuntime();
    const strategies = [
        new GenericGroupStrategy(),
        new EffortFallbackStrategy(),
        new ChildrenStrategy()
    ];
    const compiler = new JitCompiler(strategies);

    const createRuntime = (script: string) => {
        const wod = parser.read(script);
        return new ScriptRuntime(wod, compiler, {
            stack: new RuntimeStack(),
            clock: createMockClock(),
            eventBus: new EventBus()
        });
    };

    it('compiles grouped statements (+) into a single block with fragments from all statements', () => {
        const script = `
(3 rounds):
  - 10 Burpees
  + 10 Pushups
`.trim();
        const runtime = createRuntime(script);
        const result = runtime.script;
        
        // Find the parent block
        const parentStatement = result.statements.find(s => s.children.length > 0);
        expect(parentStatement).toBeDefined();
        
        // 3 Rounds should have one group of children if they are grouped by +
        expect(parentStatement!.children).toHaveLength(1);
        expect(parentStatement!.children[0]).toHaveLength(2);

        const childIds = parentStatement!.children[0];
        const childStatements = childIds.map(id => result.getId(id)!);

        // Compile the group
        const block = compiler.compile(childStatements as any, runtime);
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

    it('emits split proportional outputs for grouped statements', () => {
        const script = `
- 10 Burpees
+ 20 Pushups
`.trim();
        const runtime = createRuntime(script);
        
        // Advance through WaitingToStart if it exists, or just get the first block
        // In this simple script, JitCompiler will be called to compile the group
        const groupStatements = runtime.script.statements.filter(s => s.id > 0);
        const block = compiler.compile(groupStatements, runtime);
        expect(block).toBeDefined();

        // Simulate execution
        runtime.pushBlock(block!);
        runtime.clock.advance(60000); // 60 seconds elapsed
        runtime.popBlock();

        const outputs = runtime.getOutputStatements().filter(o => o.outputType === 'segment');
        
        // Should have 2 segment outputs (one for Burpees, one for Pushups)
        expect(outputs).toHaveLength(2);

        const burpees = outputs[0];
        const pushups = outputs[1];

        // Burpees: 10 reps, Pushups: 20 reps. Total 30 reps.
        // Burpees ratio: 1/3 (20s), Pushups ratio: 2/3 (40s)
        
        const burpeesElapsed = burpees.fragments.find(f => f.fragmentType === FragmentType.Elapsed)?.value;
        const pushupsElapsed = pushups.fragments.find(f => f.fragmentType === FragmentType.Elapsed)?.value;

        expect(burpeesElapsed).toBe(20000);
        expect(pushupsElapsed).toBe(40000);

        // Check virtual spans are sequential
        expect(burpees.spans[0].duration).toBe(20000);
        expect(pushups.spans[0].duration).toBe(40000);
        expect(pushups.spans[0].started).toBe(burpees.spans[0].ended);
    });
});
