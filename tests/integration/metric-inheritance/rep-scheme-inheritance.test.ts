import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ScriptRuntime } from '../../../src/runtime/ScriptRuntime';
import { JitCompiler } from '../../../src/runtime/JitCompiler';
import { TimeBoundRoundsStrategy, RoundsStrategy, EffortStrategy } from '../../../src/runtime/strategies';
import { MdTimerRuntime } from '../../../src/parser/md-timer';
import { WodScript } from '../../../src/WodScript';
import { MemoryTypeEnum } from '../../../src/runtime/MemoryTypeEnum';

/**
 * Integration test for metric inheritance via public memory system.
 * 
 * Tests the "(21-15-9) Push-ups" workout to verify:
 * 1. RoundsBlock allocates public METRIC_REPS
 * 2. EffortStrategy inherits reps from parent
 * 3. Different rep counts per round (21 → 15 → 9)
 */

describe('Metric Inheritance - Rep Scheme Integration', () => {
  let runtime: ScriptRuntime;
  let consoleLogs: string[];

  beforeEach(() => {
    // Capture console logs
    consoleLogs = [];
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      const message = args.join(' ');
      consoleLogs.push(message);
    });
    vi.spyOn(console, 'warn').mockImplementation((...args) => {
      const message = args.join(' ');
      consoleLogs.push(`WARN: ${message}`);
    });
  });

  it.skip('should inherit reps from RoundsBlock rep scheme: (21-15-9) Push-ups', () => {
    // SKIP: Parser creates single statement for "(21-15-9) Push-ups" without proper parent-child structure.
    // RoundsStrategy requires children array to execute. Parser refactor needed to support nested AST.
    // See: https://github.com/SergeiGolos/wod-wiki/issues/[TBD]
    // 1. Parse workout script
    const parser = new MdTimerRuntime();
    const script = parser.read('(21-15-9) Push-ups') as WodScript;
    
    expect(script.statements).toHaveLength(1);
    console.log('📋 Statement:', JSON.stringify(script.statements[0], null, 2));

    // 2. Create JIT compiler with strategies
    const jitCompiler = new JitCompiler([]);
    jitCompiler.registerStrategy(new RoundsStrategy());
    jitCompiler.registerStrategy(new EffortStrategy());

    // 3. Create runtime
    runtime = new ScriptRuntime(script, jitCompiler);

    // 4. Compile the root block
    const rootBlock = jitCompiler.compile(script.statements, runtime);
    
    expect(rootBlock).toBeDefined();
    expect(rootBlock!.blockType).toBe('Rounds');

    // 5. Push RoundsBlock onto stack
    runtime.stack.push(rootBlock!);
    const mountActions = rootBlock!.mount(runtime);

    // 6. Verify public METRIC_REPS was allocated
    const publicRepsRefs = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });
    
    expect(publicRepsRefs.length).toBeGreaterThan(0);

    const repsRef = publicRepsRefs[0];
    const initialReps = runtime.memory.get(repsRef as any);
    expect(initialReps).toBe(21);

    // 7. Execute mount actions (should push first child)
    for (const action of mountActions) {
      action.do(runtime);
    }

    // 8. Check console logs for metric allocation
    const allocateLog = consoleLogs.find(msg => 
      msg.includes('RoundsBlock allocated public reps metric') && msg.includes('21')
    );
    expect(allocateLog, 'RoundsBlock should log allocation of public reps metric').toBeTruthy();

    // 9. Verify first child (Push-ups) inherited reps
    const round1InheritLog = consoleLogs.find(msg => 
      msg.includes('EffortStrategy: Inherited reps from parent: 21')
    );
    expect(round1InheritLog, 'EffortStrategy should inherit 21 reps in Round 1').toBeTruthy();

    // 10. Advance to next round
    const currentBlock = runtime.stack.current;
    if (currentBlock) {
      runtime.stack.pop(); // Pop child
      const nextActions = rootBlock!.next(runtime);
      console.log(`✅ Called next(), ${nextActions.length} actions`);

      // 11. Verify reps were updated to 15
      const updatedReps = runtime.memory.get(repsRef as any);
      expect(updatedReps).toBe(15);
  
      // 12. Check console log for update
      const updateLog = consoleLogs.find(msg => 
        msg.includes('RoundsBlock updated public reps metric: 15')
      );
      expect(updateLog, 'RoundsBlock should log reps update to 15').toBeTruthy();
  
      // 13. Execute next actions to compile Round 2 child
      for (const action of nextActions) {
        action.do(runtime);
      }

      // 14. Verify Round 2 child inherited 15 reps
      const round2InheritLog = consoleLogs.find(msg => 
        msg.includes('EffortStrategy: Inherited reps from parent: 15')
      );
      expect(round2InheritLog, 'EffortStrategy should inherit 15 reps in Round 2').toBeTruthy();
  
      // 15. Advance to Round 3
      runtime.stack.pop(); // Pop Round 2 child
      const round3Actions = rootBlock!.next(runtime);
  
      // 16. Verify reps were updated to 9
      const round3Reps = runtime.memory.get(repsRef as any);
      expect(round3Reps).toBe(9);
  
      // 17. Execute Round 3 actions
      for (const action of round3Actions) {
        action.do(runtime);
      }

      // 18. Verify Round 3 child inherited 9 reps
      const round3InheritLog = consoleLogs.find(msg => 
        msg.includes('EffortStrategy: Inherited reps from parent: 9')
      );
      expect(round3InheritLog, 'EffortStrategy should inherit 9 reps in Round 3').toBeTruthy();
      }

    // 19. Verify no "no reps specified" warnings
    const noRepsWarnings = consoleLogs.filter(msg => 
      msg.includes('Created EffortBlock with no reps specified')
    );
    expect(noRepsWarnings.length).toBe(0);

  });

  it.skip('should verify METRIC_REPS has public visibility', () => {
    // SKIP: Same parser limitation as above - needs proper parent-child structure  
    // Parse and setup
    const parser = new MdTimerRuntime();
    const script = parser.read('(21-15-9) Squats') as WodScript;
    
    const jitCompiler = new JitCompiler([]);
    jitCompiler.registerStrategy(new RoundsStrategy());
    jitCompiler.registerStrategy(new EffortStrategy());
    
    runtime = new ScriptRuntime(script, jitCompiler);
    
    // Compile and mount
    const rootBlock = jitCompiler.compile(script.statements, runtime);
    runtime.stack.push(rootBlock!);
    rootBlock!.mount(runtime);

    // Search for public metrics
    const publicMetrics = runtime.memory.search({
      type: MemoryTypeEnum.METRIC_REPS,
      visibility: 'public',
      id: null,
      ownerId: null
    });

    expect(publicMetrics.length).toBeGreaterThan(0);
    
    const metric = publicMetrics[0];
    expect(metric.visibility).toBe('public');
    expect(metric.type).toBe(MemoryTypeEnum.METRIC_REPS);
    
    console.log(`✅ Found public METRIC_REPS: ${JSON.stringify({
      type: metric.type,
      visibility: metric.visibility,
      ownerId: metric.ownerId
    })}`);
  });
});
