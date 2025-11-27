import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { RuntimeBlock } from '@/runtime/RuntimeBlock';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { IRuntimeAction } from '@/runtime/IRuntimeAction';
import { CompletionBehavior } from '@/runtime/behaviors/CompletionBehavior';
import { PopBlockAction } from '@/runtime/PopBlockAction';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Next Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the NEXT lifecycle phase of runtime blocks. These tests verify child advancement, round tracking, and completion detection.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== Next Phase Test Blocks ====================

/**
 * A block that tracks iterations and completes after N calls to next()
 */
class IteratingBlock extends RuntimeBlock {
  private _iteration = 0;
  private readonly _maxIterations: number;
  
  constructor(runtime: IScriptRuntime, maxIterations: number = 3) {
    super(
      runtime,
      [1],
      [],
      'iterating',
      undefined,
      'Iterating',
      `Iterating Block (${maxIterations} iterations)`
    );
    this._maxIterations = maxIterations;
  }
  
  mount(runtime: IScriptRuntime) {
    this.allocate({ 
      type: 'iteration-state', 
      visibility: 'private', 
      initialValue: { current: 0, max: this._maxIterations } 
    });
    return super.mount(runtime);
  }
  
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    this._iteration++;
    
    // Update memory
    const stateRef = this.context.get('iteration-state');
    if (stateRef) {
      runtime.memory.set(stateRef, { current: this._iteration, max: this._maxIterations });
    }
    
    // Check completion
    if (this._iteration >= this._maxIterations) {
      return [new PopBlockAction()];
    }
    
    return super.next(runtime);
  }
}

/**
 * A block that always returns empty from next() (never completes on its own)
 */
class PassiveBlock extends RuntimeBlock {
  private _nextCallCount = 0;
  
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'passive',
      undefined,
      'Passive',
      'Passive Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    this.allocate({ type: 'call-count', visibility: 'public', initialValue: 0 });
    return super.mount(runtime);
  }
  
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    this._nextCallCount++;
    
    // Update memory to track calls
    const ref = this.context.get('call-count');
    if (ref) {
      runtime.memory.set(ref, this._nextCallCount);
    }
    
    return []; // Never returns actions - waits for external completion
  }
}

/**
 * A block with conditional completion based on memory state
 */
class ConditionalCompletionBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    const isComplete = () => {
      const ref = this.context.get<number>('completion-counter');
      const value = ref?.get() ?? 0;
      return value >= 5;
    };
    
    super(
      runtime,
      [1],
      [new CompletionBehavior(isComplete)],
      'conditional',
      undefined,
      'Conditional',
      'Conditional Completion Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    this.allocate({ type: 'completion-counter', visibility: 'private', initialValue: 0 });
    return super.mount(runtime);
  }
  
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    // Increment counter
    const ref = this.context.get<number>('completion-counter');
    if (ref) {
      const current = ref.get() ?? 0;
      runtime.memory.set(ref, current + 1);
    }
    
    return super.next(runtime);
  }
}

// ==================== Test Scenarios ====================

const nextScenarios: TestScenario[] = [
  {
    id: 'iterating-first-next',
    name: 'Iterating Block - First Next',
    description: 'Tests first next() call on iterating block. Should update iteration state but not complete.',
    phase: 'next',
    testBlockId: 'iter-1',
    blockFactory: (runtime) => new IteratingBlock(runtime, 3),
    expectations: {
      actionsReturned: 0 // Not complete yet
    }
  },
  {
    id: 'passive-next',
    name: 'Passive Block - Next Call',
    description: 'Tests next() on passive block. Should update call count but return no actions.',
    phase: 'next',
    testBlockId: 'passive-1',
    blockFactory: (runtime) => new PassiveBlock(runtime),
    expectations: {
      actionsReturned: 0
    }
  },
  {
    id: 'next-with-existing-state',
    name: 'Next with Pre-configured State',
    description: 'Tests next() when block already has state from previous iterations.',
    phase: 'next',
    testBlockId: 'preconfig-1',
    blockFactory: (runtime) => new IteratingBlock(runtime, 3),
    runtimeConfig: {
      initialMemory: [
        { type: 'iteration-state', ownerId: 'preconfig-1', value: { current: 2, max: 3 }, visibility: 'private' }
      ]
    }
    // Should complete since we're at iteration 2 and max is 3
  },
  {
    id: 'conditional-not-complete',
    name: 'Conditional Block - Not Complete',
    description: 'Tests conditional completion block before threshold is reached.',
    phase: 'next',
    testBlockId: 'cond-1',
    blockFactory: (runtime) => new ConditionalCompletionBlock(runtime),
    runtimeConfig: {
      initialMemory: [
        { type: 'completion-counter', ownerId: 'cond-1', value: 2, visibility: 'private' }
      ]
    }
    // Counter will go to 3, but threshold is 5
  },
  {
    id: 'override-next',
    name: 'Override Next Behavior',
    description: 'Tests block with overridden next() that forces completion.',
    phase: 'next',
    testBlockId: 'override-next-1',
    blockFactory: (runtime) => new IteratingBlock(runtime, 10), // Would normally need 10 iterations
    blockConfig: {
      nextMode: 'override',
      nextOverride: () => {
        console.log('Overridden next - forcing completion');
        return [new PopBlockAction()];
      }
    },
    expectations: {
      actionsReturned: 1 // Forced PopBlockAction
    }
  }
];

export const NextPhaseScenarios: Story = {
  args: {
    scenarios: nextScenarios,
    showDetailedDiff: true
  }
};

// ==================== Memory Modification Scenarios ====================

/**
 * A block that modifies multiple memory values on each next()
 */
class MultiUpdateBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'multi-update',
      undefined,
      'MultiUpdate',
      'Multi Update Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    this.allocate({ type: 'counter-a', visibility: 'public', initialValue: 0 });
    this.allocate({ type: 'counter-b', visibility: 'public', initialValue: 100 });
    this.allocate({ type: 'counter-c', visibility: 'private', initialValue: 'initial' });
    return super.mount(runtime);
  }
  
  next(runtime: IScriptRuntime): IRuntimeAction[] {
    // Update all counters
    const refA = this.context.get<number>('counter-a');
    const refB = this.context.get<number>('counter-b');
    const refC = this.context.get<string>('counter-c');
    
    if (refA) runtime.memory.set(refA, (refA.get() ?? 0) + 1);
    if (refB) runtime.memory.set(refB, (refB.get() ?? 100) - 10);
    if (refC) runtime.memory.set(refC, `updated-${Date.now()}`);
    
    return [];
  }
}

const memoryModificationScenarios: TestScenario[] = [
  {
    id: 'multi-update-next',
    name: 'Multiple Memory Updates',
    description: 'Tests a block that modifies multiple memory values in a single next() call.',
    phase: 'next',
    testBlockId: 'multi-1',
    blockFactory: (runtime) => new MultiUpdateBlock(runtime)
    // Check the modified values in the diff view
  }
];

export const MemoryModificationScenarios: Story = {
  args: {
    scenarios: memoryModificationScenarios,
    showDetailedDiff: true
  }
};
