import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { RuntimeBlock } from '@/runtime/RuntimeBlock';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { IRuntimeAction } from '@/runtime/IRuntimeAction';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Pop Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the POP lifecycle phase of runtime blocks. These tests verify cleanup, memory release, and disposal behavior.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== Pop Phase Test Blocks ====================

/**
 * A block that allocates memory and properly cleans up on dispose
 */
class CleanupBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'cleanup',
      undefined,
      'Cleanup',
      'Cleanup Test Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    // Allocate various memory that should be cleaned up
    this.allocate({ type: 'state-a', visibility: 'private', initialValue: { data: 'a' } });
    this.allocate({ type: 'state-b', visibility: 'private', initialValue: { data: 'b' } });
    this.allocate({ type: 'metric', visibility: 'public', initialValue: 42 });
    return super.mount(runtime);
  }
  
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    console.log('CleanupBlock.unmount() called');
    return super.unmount(runtime);
  }
  
  dispose(runtime: IScriptRuntime): void {
    console.log('CleanupBlock.dispose() called - cleaning up resources');
    super.dispose(runtime);
  }
}

/**
 * A block with custom unmount actions
 */
class CustomUnmountBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'custom-unmount',
      undefined,
      'CustomUnmount',
      'Custom Unmount Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    this.allocate({ type: 'cleanup-state', visibility: 'private', initialValue: 'active' });
    return super.mount(runtime);
  }
  
  unmount(runtime: IScriptRuntime): IRuntimeAction[] {
    // Update state to indicate unmounting
    const ref = this.context.get<string>('cleanup-state');
    if (ref) {
      runtime.memory.set(ref, 'unmounting');
    }
    
    return super.unmount(runtime);
  }
}

/**
 * A block that has multiple child references (simulating a parent block)
 */
class ParentBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'parent',
      undefined,
      'Parent',
      'Parent Block with Children'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    // Allocate state that tracks children
    this.allocate({ 
      type: 'children-state', 
      visibility: 'private', 
      initialValue: { childIds: ['child-1', 'child-2'], completedCount: 2 } 
    });
    this.allocate({ type: 'loop-state', visibility: 'private', initialValue: { rounds: 3, current: 3 } });
    this.allocate({ type: 'metric:total-reps', visibility: 'public', initialValue: 45 });
    return super.mount(runtime);
  }
}

// ==================== Test Scenarios ====================

const popScenarios: TestScenario[] = [
  {
    id: 'cleanup-block-pop',
    name: 'Basic Cleanup on Pop',
    description: 'Tests that a block properly releases all allocated memory on dispose.',
    phase: 'pop',
    testBlockId: 'cleanup-1',
    blockFactory: (runtime) => new CleanupBlock(runtime),
    expectations: {
      memoryReleases: 3, // state-a, state-b, metric
      stackPops: 1
    }
  },
  {
    id: 'custom-unmount-pop',
    name: 'Custom Unmount Actions',
    description: 'Tests a block with custom unmount behavior that modifies state before cleanup.',
    phase: 'pop',
    testBlockId: 'custom-unmount-1',
    blockFactory: (runtime) => new CustomUnmountBlock(runtime)
    // Check that state changed to "unmounting" before release
  },
  {
    id: 'parent-block-pop',
    name: 'Parent Block Cleanup',
    description: 'Tests cleanup of a parent block with multiple state entries.',
    phase: 'pop',
    testBlockId: 'parent-1',
    blockFactory: (runtime) => new ParentBlock(runtime),
    expectations: {
      memoryReleases: 3, // children-state, loop-state, metric:total-reps
      stackPops: 1
    }
  },
  {
    id: 'pop-with-children-on-stack',
    name: 'Pop with Other Blocks on Stack',
    description: 'Tests popping a block when other blocks remain on the stack.',
    phase: 'pop',
    testBlockId: 'middle-block-1',
    blockFactory: (runtime) => new CleanupBlock(runtime),
    runtimeConfig: {
      initialStack: [
        { key: 'root-block', blockType: 'workout', label: 'Root Workout' },
        { key: 'rounds-block', blockType: 'rounds', label: '3 Rounds' }
      ],
      initialMemory: [
        { type: 'root-state', ownerId: 'root-block', value: {}, visibility: 'private' },
        { type: 'rounds-state', ownerId: 'rounds-block', value: { current: 2 }, visibility: 'private' }
      ]
    },
    expectations: {
      stackPops: 1, // Only the test block
      memoryReleases: 3 // Only the test block's memory
    }
  },
  {
    id: 'override-unmount',
    name: 'Override Unmount Behavior',
    description: 'Tests block with overridden unmount() that skips default behavior.',
    phase: 'pop',
    testBlockId: 'override-unmount-1',
    blockFactory: (runtime) => new CleanupBlock(runtime),
    blockConfig: {
      unmountMode: 'override',
      unmountOverride: () => {
        console.log('Custom unmount - skipping default');
        return [];
      }
    }
  },
  {
    id: 'ignore-dispose',
    name: 'Ignore Dispose (Memory Leak Test)',
    description: 'Tests what happens when dispose() is ignored - memory should NOT be released.',
    phase: 'pop',
    testBlockId: 'ignore-dispose-1',
    blockFactory: (runtime) => new CleanupBlock(runtime),
    blockConfig: {
      disposeMode: 'ignore'
    }
    // Memory will NOT be released since dispose is ignored
    // This demonstrates a potential memory leak scenario
  }
];

export const PopPhaseScenarios: Story = {
  args: {
    scenarios: popScenarios,
    showDetailedDiff: true
  }
};

// ==================== Comprehensive Lifecycle Test ====================

/**
 * A block designed to test the full lifecycle
 */
class LifecycleTestBlock extends RuntimeBlock {
  private _disposed = false;
  
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'lifecycle',
      undefined,
      'Lifecycle',
      'Full Lifecycle Test Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    console.log('LifecycleTestBlock.mount()');
    this.allocate({ type: 'lifecycle-state', visibility: 'private', initialValue: 'mounted' });
    return super.mount(runtime);
  }
  
  next(runtime: IScriptRuntime) {
    console.log('LifecycleTestBlock.next()');
    const ref = this.context.get<string>('lifecycle-state');
    if (ref) {
      runtime.memory.set(ref, 'next-called');
    }
    return super.next(runtime);
  }
  
  unmount(runtime: IScriptRuntime) {
    console.log('LifecycleTestBlock.unmount()');
    const ref = this.context.get<string>('lifecycle-state');
    if (ref) {
      runtime.memory.set(ref, 'unmounting');
    }
    return super.unmount(runtime);
  }
  
  dispose(runtime: IScriptRuntime) {
    if (this._disposed) {
      console.warn('LifecycleTestBlock.dispose() called multiple times!');
      return;
    }
    console.log('LifecycleTestBlock.dispose()');
    this._disposed = true;
    super.dispose(runtime);
  }
}

const lifecycleScenarios: TestScenario[] = [
  {
    id: 'full-lifecycle-push',
    name: 'Full Lifecycle - Push',
    description: 'Tests the push phase of a full lifecycle block.',
    phase: 'push',
    testBlockId: 'lifecycle-1',
    blockFactory: (runtime) => new LifecycleTestBlock(runtime)
  },
  {
    id: 'full-lifecycle-next',
    name: 'Full Lifecycle - Next',
    description: 'Tests the next phase of a full lifecycle block.',
    phase: 'next',
    testBlockId: 'lifecycle-2',
    blockFactory: (runtime) => new LifecycleTestBlock(runtime)
  },
  {
    id: 'full-lifecycle-pop',
    name: 'Full Lifecycle - Pop',
    description: 'Tests the pop phase of a full lifecycle block.',
    phase: 'pop',
    testBlockId: 'lifecycle-3',
    blockFactory: (runtime) => new LifecycleTestBlock(runtime)
  }
];

export const FullLifecycleScenarios: Story = {
  args: {
    scenarios: lifecycleScenarios,
    showDetailedDiff: true
  }
};
