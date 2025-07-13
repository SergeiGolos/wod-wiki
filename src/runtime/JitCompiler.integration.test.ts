import { describe, it, expect, beforeEach } from 'vitest';
import { JitCompiler } from './JitCompiler';
import { RuntimeStack } from './RuntimeStack';
import { BlockEffortStrategy } from './BlockEffortStrategy';
import { BlockTimerStrategy } from './BlockTimerStrategy';
import { ITimerRuntime } from './ITimerRuntime';
import { IRuntimeAction } from './EventHandler';

// Mock runtime script for testing
const createMockScript = (statements: any[]) => ({
  statements: statements.map((stmt, index) => ({
    id: `statement-${index}`,
    fragments: stmt
  }))
});

// Mock timer runtime for testing
const createMockRuntime = (): ITimerRuntime => {
  const stack = new RuntimeStack();
  
  return {
    stack: stack,
    isActive: false,
    isPaused: false,
    elapsedTime: 0,
    currentRep: 1,
    currentRound: 1,
    apply: (actions: IRuntimeAction[]) => {
      // Mock apply implementation
      actions.forEach(action => {
        console.log(`Applied action: ${action.type}`);
      });
    },
    getCurrentTime: () => Date.now(),
    start: () => {},
    stop: () => {},
    pause: () => {},
    resume: () => {},
    reset: () => {}
  };
};

describe('JitCompiler Integration Tests', () => {
  let compiler: JitCompiler;
  let runtime: ITimerRuntime;

  beforeEach(() => {
    // Create a script with multiple exercise types
    const script = createMockScript([
      [
        { type: 'action', value: 'Pullups' },
        { type: 'rep', value: 21 }
      ],
      [
        { type: 'action', value: 'Thrusters' },
        { type: 'rep', value: 15 },
        { type: 'resistance', value: '95lb' }
      ],
      [
        { type: 'timer', value: '3:00' }
      ]
    ]);

    compiler = new JitCompiler(script);
    runtime = createMockRuntime();
  });

  describe('Full Compilation Pipeline', () => {
    it('should create root block with child blocks', () => {
      const rootBlock = compiler.root(runtime);

      expect(rootBlock).toBeDefined();
      expect(rootBlock.key).toBeDefined();
      expect(rootBlock.metrics).toBeDefined();
      
      // Root block should have child blocks
      const childBlocks = (rootBlock as any).getChildBlocks();
      expect(childBlocks).toHaveLength(3); // 2 effort + 1 timer
    });

    it('should compile individual statements correctly', () => {
      const statements = [
        {
          id: 'pullup-statement',
          fragments: [
            { type: 'action', value: 'Pullups' },
            { type: 'rep', value: 21 }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);

      expect(block).toBeDefined();
      expect(block!.metrics).toHaveLength(1);
      expect(block!.metrics[0].effort).toBe('Pullups');
      expect(block!.metrics[0].values).toHaveLength(1);
      expect(block!.metrics[0].values[0].type).toBe('repetitions');
      expect(block!.metrics[0].values[0].value).toBe(21);
    });

    it('should handle timer statements', () => {
      // Register timer strategy first
      compiler.registerStrategy(new BlockTimerStrategy());

      const statements = [
        {
          id: 'timer-statement',
          fragments: [
            { type: 'timer', value: '3:00' }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);

      expect(block).toBeDefined();
      expect(block!.metrics).toHaveLength(1);
      expect(block!.metrics[0].values[0].type).toBe('time');
      expect(block!.metrics[0].values[0].value).toBe(3);
      expect(block!.metrics[0].values[0].unit).toBe('min');
    });

    it('should handle complex statements with multiple metrics', () => {
      const statements = [
        {
          id: 'complex-statement',
          fragments: [
            { type: 'action', value: 'Deadlifts' },
            { type: 'rep', value: 5 },
            { type: 'resistance', value: '225lb' }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);

      expect(block).toBeDefined();
      expect(block!.metrics).toHaveLength(1);
      expect(block!.metrics[0].effort).toBe('Deadlifts');
      expect(block!.metrics[0].values).toHaveLength(2);
      
      const repValue = block!.metrics[0].values.find(v => v.type === 'repetitions');
      expect(repValue).toEqual({ type: 'repetitions', value: 5, unit: 'reps' });
      
      const resistanceValue = block!.metrics[0].values.find(v => v.type === 'resistance');
      expect(resistanceValue).toEqual({ type: 'resistance', value: 225, unit: 'lb' });
    });
  });

  describe('Strategy Registration and Priority', () => {
    it('should use custom strategies with higher priority', () => {
      // Create a custom strategy that always returns a specific block
      const customStrategy = {
        canHandle: () => true,
        compile: () => ({
          key: { value: 'custom-block' },
          spans: {},
          handlers: [],
          metrics: [],
          next: () => [],
          onEnter: () => {},
          inherit: () => ({} as any)
        })
      };

      compiler.registerStrategy(customStrategy);

      const statements = [
        {
          id: 'test-statement',
          fragments: [
            { type: 'action', value: 'Test' },
            { type: 'rep', value: 1 }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);

      expect(block).toBeDefined();
      expect((block!.key as any).value).toBe('custom-block');
    });
  });

  describe('Metric Inheritance Integration', () => {
    it('should apply metric inheritance from parent blocks', () => {
      // Push a parent block onto the stack with some metrics
      const parentBlock = {
        key: { value: 'parent-block' },
        spans: {},
        handlers: [],
        metrics: [
          {
            sourceId: 'parent',
            effort: 'Parent Exercise',
            values: [{ type: 'rounds', value: 3, unit: 'rounds' }]
          }
        ],
        next: () => [],
        onEnter: () => {},
        inherit: () => ({
          canDelete: () => false,
          canOverride: () => true,
          canCreateOnly: () => false,
          getMetrics: () => []
        })
      };

      runtime.stack.push(parentBlock as any);

      const statements = [
        {
          id: 'child-statement',
          fragments: [
            { type: 'action', value: 'Child Exercise' },
            { type: 'rep', value: 10 }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);

      expect(block).toBeDefined();
      // The child block should have compiled metrics (inheritance system tested separately)
      expect(block!.metrics).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty statements gracefully', () => {
      const block = compiler.compile([], runtime);
      expect(block).toBeUndefined();
    });

    it('should handle statements without recognizable fragments', () => {
      const statements = [
        {
          id: 'invalid-statement',
          fragments: [
            { type: 'unknown', value: 'something' }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);
      expect(block).toBeUndefined();
    });
  });

  describe('Idle and End Blocks', () => {
    it('should create idle blocks', () => {
      const idleBlock = compiler.idle(runtime);

      expect(idleBlock).toBeDefined();
      expect(idleBlock.key).toBeDefined();
      expect(idleBlock.metrics).toEqual([]);
      
      // Idle blocks should return no actions
      const actions = idleBlock.next(runtime);
      expect(actions).toEqual([]);
    });

    it('should create end blocks', () => {
      const endBlock = compiler.end(runtime);

      expect(endBlock).toBeDefined();
      expect(endBlock.key).toBeDefined();
      
      // End blocks should return completion actions
      const actions = endBlock.next(runtime);
      expect(actions).toHaveLength(1);
      expect(actions[0].type).toBe('END_WORKOUT');
    });
  });

  describe('Block Execution Flow', () => {
    it('should execute blocks and return appropriate actions', () => {
      const statements = [
        {
          id: 'execution-test',
          fragments: [
            { type: 'action', value: 'Test Exercise' },
            { type: 'rep', value: 5 }
          ]
        }
      ];

      const block = compiler.compile(statements, runtime);
      expect(block).toBeDefined();

      // Execute the block
      block!.onEnter(runtime);
      const actions = block!.next(runtime);

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
    });
  });
});