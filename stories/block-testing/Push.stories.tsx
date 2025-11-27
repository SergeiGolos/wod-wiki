import type { Meta, StoryObj } from '@storybook/react';
import { TestableBlockHarness, TestScenario } from '@/runtime/testing';
import { RuntimeBlock } from '@/runtime/RuntimeBlock';
import { IScriptRuntime } from '@/runtime/IScriptRuntime';
import { CompletionBehavior } from '@/runtime/behaviors/CompletionBehavior';

const meta: Meta<typeof TestableBlockHarness> = {
  title: 'Block Testing/Push Phase',
  component: TestableBlockHarness,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Test scenarios for the PUSH lifecycle phase of runtime blocks. These tests verify memory allocation and initial state setup when blocks are mounted.'
      }
    }
  }
};

export default meta;
type Story = StoryObj<typeof meta>;

// ==================== Simple Block Push Scenarios ====================

/**
 * A simple test block that allocates memory on mount
 */
class SimpleTestBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime, sourceIds: number[] = [1]) {
    super(
      runtime,
      sourceIds,
      [new CompletionBehavior(() => false)],
      'simple',
      undefined,
      'Simple',
      'Simple Test Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    // Allocate some test memory
    this.allocate({ type: 'test-state', visibility: 'private', initialValue: { count: 0 } });
    this.allocate({ type: 'test-metric', visibility: 'public', initialValue: 42 });
    return super.mount(runtime);
  }
}

/**
 * A block that does nothing on mount (minimal)
 */
class MinimalBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'minimal',
      undefined,
      'Minimal',
      'Minimal Block'
    );
  }
}

const pushScenarios: TestScenario[] = [
  {
    id: 'simple-block-push',
    name: 'Simple Block Push',
    description: 'Tests a simple block that allocates private and public memory on mount.',
    phase: 'push',
    testBlockId: 'simple-block-1',
    blockFactory: (runtime) => new SimpleTestBlock(runtime),
    expectations: {
      memoryAllocations: 2, // test-state (private) + test-metric (public)
      stackPushes: 1
    }
  },
  {
    id: 'minimal-block-push',
    name: 'Minimal Block Push',
    description: 'Tests a minimal block with no behaviors or custom memory.',
    phase: 'push',
    testBlockId: 'minimal-block-1',
    blockFactory: (runtime) => new MinimalBlock(runtime),
    expectations: {
      stackPushes: 1
    }
  },
  {
    id: 'block-with-parent-context',
    name: 'Block with Parent Context',
    description: 'Tests block push when parent block already exists on stack with public memory.',
    phase: 'push',
    testBlockId: 'child-block-1',
    blockFactory: (runtime) => new SimpleTestBlock(runtime, [2]),
    runtimeConfig: {
      initialMemory: [
        { type: 'parent-metric', ownerId: 'parent-block', value: 100, visibility: 'public' }
      ],
      initialStack: [
        { key: 'parent-block', blockType: 'rounds', label: 'Parent Rounds Block' }
      ]
    },
    expectations: {
      stackPushes: 1, // Only the test block (parent already on stack)
      memoryAllocations: 2
    }
  },
  {
    id: 'override-mount',
    name: 'Override Mount Behavior',
    description: 'Tests block with overridden mount() that returns empty array.',
    phase: 'push',
    testBlockId: 'override-block-1',
    blockFactory: (runtime) => new SimpleTestBlock(runtime),
    blockConfig: {
      mountMode: 'override',
      mountOverride: () => {
        console.log('Custom mount executed - no actions returned');
        return [];
      }
    },
    expectations: {
      stackPushes: 1,
      actionsReturned: 0
    }
  },
  {
    id: 'ignore-mount',
    name: 'Ignore Mount (Skip)',
    description: 'Tests block with mount() ignored completely.',
    phase: 'push',
    testBlockId: 'ignored-block-1',
    blockFactory: (runtime) => new SimpleTestBlock(runtime),
    blockConfig: {
      mountMode: 'ignore'
    },
    expectations: {
      stackPushes: 1,
      actionsReturned: 0
    }
  }
];

export const SimplePushScenarios: Story = {
  args: {
    scenarios: pushScenarios,
    showDetailedDiff: true
  }
};

// ==================== Memory-Focused Scenarios ====================

/**
 * A block that allocates multiple types of memory
 */
class MemoryHeavyBlock extends RuntimeBlock {
  constructor(runtime: IScriptRuntime) {
    super(
      runtime,
      [1],
      [],
      'memory-heavy',
      undefined,
      'MemoryHeavy',
      'Memory Heavy Block'
    );
  }
  
  mount(runtime: IScriptRuntime) {
    // Allocate various types of memory
    this.allocate({ type: 'timer-state', visibility: 'private', initialValue: { elapsed: 0, total: 60000 } });
    this.allocate({ type: 'loop-state', visibility: 'private', initialValue: { index: 0, rounds: 0 } });
    this.allocate({ type: 'metric:reps', visibility: 'public', initialValue: 21 });
    this.allocate({ type: 'metric:weight', visibility: 'public', initialValue: 95 });
    this.allocate({ type: 'metric:distance', visibility: 'public', initialValue: 400 });
    return super.mount(runtime);
  }
}

const memoryScenarios: TestScenario[] = [
  {
    id: 'memory-heavy-push',
    name: 'Memory Heavy Block',
    description: 'Tests a block that allocates multiple memory entries of different types.',
    phase: 'push',
    testBlockId: 'memory-heavy-1',
    blockFactory: (runtime) => new MemoryHeavyBlock(runtime),
    expectations: {
      memoryAllocations: 5,
      stackPushes: 1
    }
  },
  {
    id: 'memory-visibility',
    name: 'Memory Visibility Test',
    description: 'Verifies that public and private memory are allocated correctly.',
    phase: 'push',
    testBlockId: 'visibility-test-1',
    blockFactory: (runtime) => new MemoryHeavyBlock(runtime)
    // No expectations - manually verify visibility in the diff view
  }
];

export const MemoryFocusedScenarios: Story = {
  args: {
    scenarios: memoryScenarios,
    showDetailedDiff: true
  }
};
