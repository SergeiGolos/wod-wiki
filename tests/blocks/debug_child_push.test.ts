import { describe, it, expect } from 'bun:test';
import { RuntimeTestBuilder } from '@/testing/harness/RuntimeTestBuilder';
import { GenericTimerStrategy } from '@/runtime/compiler/strategies/components/GenericTimerStrategy';
import { ChildrenStrategy } from '@/runtime/compiler/strategies/enhancements/ChildrenStrategy';
import { EffortFallbackStrategy } from '@/runtime/compiler/strategies/fallback/EffortFallbackStrategy';
import { ChildRunnerBehavior } from '@/runtime/behaviors';
import { ICodeStatement } from '@/core/models/CodeStatement';

describe('Debug: Child Push on Mount', () => {
    it('should trace mount action chain', () => {
        const script = `20:00
  5 pullups
  10 push ups
  15 squats`;

        const builder = new RuntimeTestBuilder()
            .withScript(script)
            .withStrategy(new GenericTimerStrategy())
            .withStrategy(new ChildrenStrategy())
            .withStrategy(new EffortFallbackStrategy());

        const harness = builder.build();

        // Verify parser output
        const statements = harness.script.statements;
        console.log('Total statements:', statements.length);
        statements.forEach((s, i) => {
            console.log(`  [${i}] id=${s.id} children=${JSON.stringify(s.children)} parent=${s.parent}`);
        });

        // Compile the timer block
        const statement = statements[0];
        const block = harness.jit.compile([statement as ICodeStatement], harness.runtime);
        expect(block).toBeDefined();
        console.log('Block type:', block!.blockType);
        console.log('Behaviors:', block!.behaviors.map(b => b.constructor.name));

        // Check ChildRunnerBehavior config
        const childRunner = block!.getBehavior(ChildRunnerBehavior);
        expect(childRunner).toBeDefined();
        console.log('ChildRunner allChildrenExecuted:', childRunner!.allChildrenExecuted);

        // Manually push and mount
        harness.runtime.stack.push(block!);
        console.log('Stack depth after manual push:', harness.runtime.stack.count);

        const mountActions = block!.mount(harness.runtime);
        console.log('Mount actions count:', mountActions.length);
        mountActions.forEach((a, i) => console.log(`  Mount action [${i}]: ${a.type}`));

        // Execute mount actions manually and trace
        for (const action of mountActions) {
            console.log(`Executing action: ${action.type}`);
            const results = action.do(harness.runtime);
            console.log(`  Returned ${results?.length ?? 0} sub-actions`);
            if (results) {
                results.forEach((r, i) => console.log(`  Sub-action [${i}]: ${r.type}`));
            }
        }

        console.log('Stack depth after manual mount+exec:', harness.runtime.stack.count);

        // Now test the REAL flow via pushBlock
        // Reset by popping everything
        while (harness.runtime.stack.count > 0) {
            const popped = harness.runtime.stack.pop();
            if (popped) popped.dispose();
        }
        
        // Compile a fresh block
        const block2 = harness.jit.compile([statement as ICodeStatement], harness.runtime);
        expect(block2).toBeDefined();
        
        // Use pushBlock which goes through ExecutionContext
        harness.runtime.pushBlock(block2!);
        console.log('Stack depth after pushBlock:', harness.runtime.stack.count);
        console.log('Current block:', harness.currentBlock?.label);
        console.log('Runtime errors:', harness.runtime.errors.length);
    });
});
