# Test Templates

This document provides ready-to-use templates for common testing scenarios in WOD Wiki. Copy and adapt these templates for your specific needs.

## Table of Contents

1. [Behavior Unit Test Template](#behavior-unit-test-template)
2. [Component Integration Test Template](#component-integration-test-template)
3. [Strategy/JIT Test Template](#strategyjit-test-template)
4. [Event Handler Test Template](#event-handler-test-template)
5. [Memory Management Test Template](#memory-management-test-template)
6. [React Component Test Template](#react-component-test-template)
7. [Storybook Interaction Test Template](#storybook-interaction-test-template)

## Behavior Unit Test Template

**File**: `src/runtime/behaviors/__tests__/YourBehavior.test.ts`

```typescript
import { describe, expect, it, afterEach, beforeEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { YourBehavior } from '../YourBehavior';

describe('YourBehavior', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => {
    harness?.dispose();
  });

  describe('mount phase', () => {
    it('should initialize required memory on mount', () => {
      // Arrange
      harness = new BehaviorTestHarness()
        .withClock(new Date('2024-01-01T12:00:00Z'));

      const config = { /* your config */ };
      const block = new MockBlock('test-your-behavior', [
        new YourBehavior(config)
      ]);

      // Act
      harness.push(block);
      harness.mount();

      // Assert - Verify memory initialization
      const pushCalls = block.recordings!.pushMemory;
      expect(pushCalls.length).toBeGreaterThanOrEqual(1);

      const memoryPush = pushCalls.find(c => c.tag === 'yourMemoryType');
      expect(memoryPush).toBeDefined();

      const value = memoryPush!.metrics[0]?.value;
      expect(value).toMatchObject({
        // Your expected properties
      });
    });

    it('should subscribe to required events', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);

      // Act
      harness.push(block);
      harness.mount();

      // Assert - Verify event subscriptions
      const subscribeCalls = block.recordings!.subscribe;
      expect(subscribeCalls).toHaveLength(expectedCount);

      expect(subscribeCalls.some(c => c.eventType === 'event1')).toBe(true);
      expect(subscribeCalls.some(c => c.eventType === 'event2')).toBe(true);

      // Verify subscription scopes if applicable
      const eventSub = subscribeCalls.find(c => c.eventType === 'event1');
      expect(eventSub!.options?.scope).toBe('expectedScope');
    });

    it('should handle missing optional configuration', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);

      // Act & Assert - Should not throw
      expect(() => {
        harness.push(block);
        harness.mount();
      }).not.toThrow();
    });
  });

  describe('next phase', () => {
    beforeEach(() => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();
    });

    it('should process next lifecycle correctly', () => {
      // Act
      const actions = harness.next();

      // Assert
      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThanOrEqual(0);

      // Verify side effects if any
      const updateCalls = harness.currentBlock?.recordings?.updateMemory ?? [];
      // Assert memory updates
    });

    it('should be a no-op when condition not met', () => {
      // Arrange - Set up state where condition shouldn't trigger
      const block = harness.currentBlock as MockBlock;
      block.state.conditionMet = false;

      // Act
      const actions = harness.next();

      // Assert - No actions should be returned
      expect(actions).toEqual([]);
    });

    it('should trigger action when condition is met', () => {
      // Arrange - Set up state where condition should trigger
      const block = harness.currentBlock as MockBlock;
      block.state.conditionMet = true;

      // Act
      const actions = harness.next();

      // Assert - Expected actions should be returned
      expect(actions.length).toBeGreaterThan(0);
      expect(actions[0].constructor.name).toBe('ExpectedAction');
    });
  });

  describe('unmount phase', () => {
    it('should clean up resources on unmount', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act
      harness.unmount();

      // Assert - Verify cleanup
      const updateCalls = block.recordings!.updateMemory;
      const update = updateCalls.find(c => c.tag === 'yourMemoryType');
      expect(update).toBeDefined();

      // Verify final state
      const finalValue = update!.metrics[0]?.value;
      expect(finalValue.cleanedUp).toBe(true);
    });

    it('should preserve required state on unmount', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Set some state
      block.setMemoryValue('yourMemoryType', { data: 'important' });

      // Act
      harness.unmount();

      // Assert - State should be preserved
      const memory = block.getMemory('yourMemoryType');
      expect(memory?.value).toMatchObject({ data: 'important' });
    });
  });

  describe('event handling', () => {
    it('should respond to event1', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act
      harness.simulateEvent('event1', { data: 'test' });

      // Assert - Verify behavior response
      const updateCalls = block.recordings!.updateMemory;
      expect(updateCalls.length).toBeGreaterThan(0);

      // Verify event emissions if any
      expect(harness.wasEventEmitted('responseEvent')).toBe(true);
    });

    it('should handle event2 with specific data', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act
      harness.simulateEvent('event2', { value: 42 });

      // Assert
      const emittedEvents = harness.findEvents('responseEvent');
      expect(emittedEvents.length).toBe(1);
      expect(emittedEvents[0].data.processedValue).toBe(42);
    });
  });

  describe('edge cases', () => {
    it('should handle null/undefined values gracefully', () => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      expect(() => {
        harness.simulateEvent('testEvent', { value: null });
      }).not.toThrow();
    });

    it('should handle empty array inputs', () => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      expect(() => {
        harness.simulateEvent('testEvent', { items: [] });
      }).not.toThrow();
    });

    it('should handle concurrent events correctly', () => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act - Fire multiple events rapidly
      harness.simulateEvent('event1');
      harness.simulateEvent('event2');
      harness.simulateEvent('event1');

      // Assert - Verify all were processed
      expect(harness.findEvents('event1').length).toBe(2);
      expect(harness.findEvents('event2').length).toBe(1);
    });
  });

  describe('time-based behavior', () => {
    it('should track time progression', () => {
      // Arrange
      harness = new BehaviorTestHarness()
        .withClock(new Date('2024-01-01T12:00:00Z'));

      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act - Advance time
      harness.advanceClock(5000);

      // Assert
      const timeMemory = block.getMemoryByTag('time');
      const timerValue = timeMemory[0].metrics[0]?.value;
      expect(timerValue.elapsedMs).toBeGreaterThanOrEqual(5000);
    });
  });

  describe('error handling', () => {
    it('should handle missing memory gracefully', () => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new YourBehavior()]);
      harness.push(block);
      harness.mount();

      // Act - Try to access non-existent memory
      const missing = block.getMemory('nonExistent');

      // Assert
      expect(missing).toBeUndefined();
    });

    it('should validate input parameters', () => {
      harness = new BehaviorTestHarness();

      // Act & Assert - Invalid config should throw
      expect(() => {
        const block = new MockBlock('test', [
          new YourBehavior({ invalid: 'config' } as any)
        ]);
        harness.push(block);
        harness.mount();
      }).toThrow();
    });
  });
});
```

## Component Integration Test Template

**File**: `tests/components/YourComponent.test.ts`

```typescript
import { describe, expect, it, afterEach } from 'bun:test';
import { ExecutionContextTestBuilder } from '@/testing/harness';
import { YourStrategy } from '@/runtime/compiler/strategies/YourStrategy';

describe('YourComponent Integration', () => {
  describe('JIT compilation', () => {
    it('should compile valid script', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withClock(new Date('2024-01-01T12:00:00Z'))
        .withStrategies(new YourStrategy())
        .build();

      const script = '10:00 Run';

      // Act
      const result = harness.mockJit.compile(script, harness.runtime);

      // Assert
      expect(result).toBeDefined();
      expect(result.blocks.length).toBeGreaterThan(0);

      const block = result.blocks[0];
      expect(block.blockType).toBe('ExpectedType');
    });

    it('should handle syntax errors', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const invalidScript = 'invalid syntax here';

      // Act & Assert
      expect(() => {
        harness.mockJit.compile(invalidScript, harness.runtime);
      }).toThrow();
    });
  });

  describe('runtime execution', () => {
    it('should execute compiled script', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const script = '10:00 Run';
      const compilation = harness.mockJit.compile(script, harness.runtime);

      // Act
      harness.pushAllBlocks(compilation.blocks);
      harness.startWorkout();

      // Assert - Verify execution
      expect(harness.stack.count).toBeGreaterThan(0);
      expect(harness.currentBlock?.blockType).toBe('ExpectedType');
    });

    it('should handle multiple statements', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const script = `
        10:00 Run
        5:00 Rest
        20:00 Bike
      `;

      // Act
      const compilation = harness.mockJit.compile(script, harness.runtime);
      harness.pushAllBlocks(compilation.blocks);
      harness.startWorkout();

      // Assert
      expect(harness.stack.count).toBe(3);
    });
  });
});
```

## Strategy/JIT Test Template

**File**: `src/runtime/compiler/strategies/__tests__/YourStrategy.test.ts`

```typescript
import { describe, expect, it } from 'bun:test';
import { ExecutionContextTestBuilder } from '@/testing/harness';
import { YourStrategy } from '../YourStrategy';
import { YourFragment } from '@/fragments';

describe('YourStrategy', () => {
  describe('fragment matching', () => {
    it('should match correct fragment types', () => {
      const strategy = new YourStrategy();
      const fragment = new YourFragment({ /* props */ });

      expect(strategy.canCompile(fragment)).toBe(true);
    });

    it('should reject incorrect fragment types', () => {
      const strategy = new YourStrategy();
      const wrongFragment = { type: 'WrongType' };

      expect(strategy.canCompile(wrongFragment as any)).toBe(false);
    });
  });

  describe('block compilation', () => {
    it('should compile fragment to block', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const fragment = new YourFragment({
        durationMs: 600000,
        label: 'Test'
      });

      // Act
      const block = harness.mockJit.compileFragment(fragment, harness.runtime);

      // Assert
      expect(block).toBeDefined();
      expect(block.blockType).toBe('ExpectedBlockType');

      // Verify block properties
      expect(block.label).toBe('Test');
      expect(block.getMemoryByTag('time').length).toBe(1);
    });

    it('should apply fragment metrics to block', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const fragment = new YourFragment({
        metrics: [
          { type: 'time', value: 600000 },
          { type: 'label', value: 'Work' }
        ]
      });

      // Act
      const block = harness.mockJit.compileFragment(fragment, harness.runtime);

      // Assert - Metrics should be on block
      const timeMemory = block.getMemoryByTag('time');
      expect(timeMemory.length).toBe(1);
      expect(timeMemory[0].metrics[0].value).toBe(600000);

      const labelMemory = block.getMemoryByTag('metric:label');
      expect(labelMemory.length).toBe(1);
      expect(labelMemory[0].metrics[0].value).toBe('Work');
    });
  });

  describe('behavior injection', () => {
    it('should inject required behaviors', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const fragment = new YourFragment({ /* props */ });

      // Act
      const block = harness.mockJit.compileFragment(fragment, harness.runtime);

      // Assert - Verify behaviors
      expect(block.behaviors.length).toBeGreaterThan(0);

      const behavior = block.getBehavior(ExpectedBehavior);
      expect(behavior).toBeDefined();
    });

    it('should configure behaviors from fragment config', () => {
      // Arrange
      const harness = new ExecutionContextTestBuilder()
        .withStrategies(new YourStrategy())
        .build();

      const fragment = new YourFragment({
        config: { option: 'value' }
      });

      // Act
      const block = harness.mockJit.compileFragment(fragment, harness.runtime);
      const behavior = block.getBehavior(ExpectedBehavior);

      // Assert
      expect(behavior!.config.option).toBe('value');
    });
  });
});
```

## Event Handler Test Template

**File**: `src/runtime/events/__tests__/YourEventHandler.test.ts`

```typescript
import { describe, expect, it, beforeEach } from 'bun:test';
import { ExecutionContextTestHarness } from '@/testing/harness';
import { YourEventHandler } from '../YourEventHandler';
import { YourEvent } from '../events';

describe('YourEventHandler', () => {
  let harness: ExecutionContextTestHarness;
  let handler: YourEventHandler;

  beforeEach(() => {
    harness = new ExecutionContextTestBuilder()
      .withClock(new Date('2024-01-01T12:00:00Z'))
      .onEvent('yourEvent', new YourEventHandler())
      .build();

    handler = new YourEventHandler();
  });

  describe('event handling', () => {
    it('should handle yourEvent correctly', () => {
      // Arrange
      const event: YourEvent = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: { value: 42 }
      };

      // Act
      const actions = harness.dispatchEvent(event);

      // Assert
      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThan(0);

      const expectedAction = actions[0];
      expect(expectedAction.constructor.name).toBe('ExpectedAction');
    });

    it('should ignore events when condition not met', () => {
      // Arrange
      const event: YourEvent = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: { shouldIgnore: true }
      };

      // Act
      const actions = harness.dispatchEvent(event);

      // Assert - No actions should be returned
      expect(actions).toEqual([]);
    });

    it('should handle multiple events in sequence', () => {
      // Arrange
      const event1: YourEvent = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: { sequence: 1 }
      };

      const event2: YourEvent = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: { sequence: 2 }
      };

      // Act
      const actions1 = harness.dispatchEvent(event1);
      const actions2 = harness.dispatchEvent(event2);

      // Assert
      expect(actions1.length).toBeGreaterThan(0);
      expect(actions2.length).toBeGreaterThan(0);

      // Verify state changes
      expect(harness.stack.current?.getMemoryByTag('state').length).toBe(2);
    });
  });

  describe('error handling', () => {
    it('should handle malformed event data', () => {
      // Arrange
      const event = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: null
      };

      // Act & Assert - Should not throw
      expect(() => {
        harness.dispatchEvent(event as any);
      }).not.toThrow();
    });

    it('should validate required fields', () => {
      // Arrange - Missing required field
      const event = {
        name: 'yourEvent',
        timestamp: new Date(),
        data: { /* missing requiredField */ }
      };

      // Act
      const actions = harness.dispatchEvent(event as any);

      // Assert - Should handle gracefully
      expect(actions).toEqual([]);
    });
  });
});
```

## Memory Management Test Template

**File**: `src/runtime/memory/__tests__/YourMemoryTest.test.ts`

```typescript
import { describe, expect, it, afterEach } from 'bun:test';
import { BehaviorTestHarness, MockBlock } from '@/testing/harness';
import { MemoryConsumerBehavior } from '../MemoryConsumerBehavior';

describe('Memory Management', () => {
  let harness: BehaviorTestHarness;

  afterEach(() => {
    harness?.dispose();
  });

  describe('memory allocation', () => {
    it('should allocate memory with correct type and visibility', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new MemoryConsumerBehavior()]);

      // Act
      harness.push(block);
      harness.mount();

      // Assert
      const pushCalls = block.recordings!.pushMemory;
      const memoryPush = pushCalls.find(c => c.tag === 'yourType');

      expect(memoryPush).toBeDefined();
      expect(memoryPush!.metrics[0]).toMatchObject({
        type: expect.any(Number),
        origin: 'runtime'
      });
    });

    it('should set memory visibility correctly', () => {
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new MemoryConsumerBehavior()]);
      harness.push(block);
      harness.mount();

      const publicMemory = block.getMetricMemoryByVisibility('public');
      const privateMemory = block.getMetricMemoryByVisibility('private');

      expect(publicMemory.length).toBe(expectedPublicCount);
      expect(privateMemory.length).toBe(expectedPrivateCount);
    });
  });

  describe('memory updates', () => {
    it('should update memory values correctly', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new MemoryConsumerBehavior()]);
      harness.push(block);
      harness.mount();

      // Act - Trigger update
      harness.simulateEvent('updateValue', { newValue: 'updated' });

      // Assert
      const updateCalls = block.recordings!.updateMemory;
      const update = updateCalls.find(c => c.tag === 'yourType');

      expect(update).toBeDefined();
      expect(update!.metrics[0].value).toBe('updated');
    });

    it('should notify subscribers on update', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new MemoryConsumerBehavior()]);
      harness.push(block);
      harness.mount();

      let notified = false;
      const memory = block.getMemory('yourType');
      memory?.subscribe(() => { notified = true; });

      // Act
      harness.simulateEvent('updateValue', { newValue: 'test' });

      // Assert
      expect(notified).toBe(true);
    });
  });

  describe('memory cleanup', () => {
    it('should release memory on dispose', () => {
      // Arrange
      harness = new BehaviorTestHarness();
      const block = new MockBlock('test', [new MemoryConsumerBehavior()]);
      harness.push(block);
      harness.mount();

      const memoryBefore = block.getAllMemory().length;

      // Act
      harness.unmount();

      // Assert - Memory should be cleaned up appropriately
      const memoryAfter = block.getAllMemory().length;
      // Depending on your cleanup strategy
      expect(memoryAfter).toBeLessThanOrEqual(memoryBefore);
    });
  });
});
```

## React Component Test Template

**File**: `src/components/__tests__/YourComponent.test.tsx`

```typescript
import { describe, expect, it } from 'bun:test';
import { render } from '@testing-library/react';
import { YourComponent } from '../YourComponent';

describe('YourComponent', () => {
  describe('rendering', () => {
    it('should render with default props', () => {
      // Act
      const { container } = render(<YourComponent />);

      // Assert
      expect(container).toBeDefined();
      expect(container.querySelector('.your-component')).toBeTruthy();
    });

    it('should render with custom props', () => {
      // Arrange
      const props = {
        title: 'Test Title',
        value: 42
      };

      // Act
      const { getByText } = render(<YourComponent {...props} />);

      // Assert
      expect(getByText('Test Title')).toBeTruthy();
      expect(getByText('42')).toBeTruthy();
    });

    it('should render children correctly', () => {
      // Arrange
      const children = <div>Child Content</div>;

      // Act
      const { getByText } = render(
        <YourComponent>
          {children}
        </YourComponent>
      );

      // Assert
      expect(getByText('Child Content')).toBeTruthy();
    });
  });

  describe('user interactions', () => {
    it('should handle click events', () => {
      // Arrange
      const handleClick = () => { /* handler */ };
      const { getByRole } = render(
        <YourComponent onClick={handleClick} />
      );

      const button = getByRole('button');

      // Act
      button.click();

      // Assert - Verify handler was called
      // (You'd need to mock and verify handleClick)
    });

    it('should handle input changes', () => {
      // Arrange
      const handleChange = (value: string) => { /* handler */ };
      const { getByRole } = render(
        <YourComponent onChange={handleChange} />
      );

      const input = getByRole('textbox') as HTMLInputElement;

      // Act
      input.value = 'test input';
      input.dispatchEvent(new Event('input', { bubbles: true }));

      // Assert
      expect(input.value).toBe('test input');
    });
  });

  describe('conditional rendering', () => {
    it('should show content when condition is true', () => {
      const { getByText } = render(
        <YourComponent showContent={true} />
      );

      expect(getByText('Content')).toBeTruthy();
    });

    it('should hide content when condition is false', () => {
      const { queryByText } = render(
        <YourComponent showContent={false} />
      );

      expect(queryByText('Content')).toBeNull();
    });
  });

  describe('error states', () => {
    it('should display error message when error prop is set', () => {
      const { getByText } = render(
        <YourComponent error="Something went wrong" />
      );

      expect(getByText('Something went wrong')).toBeTruthy();
    });

    it('should not display error when no error', () => {
      const { queryByText } = render(
        <YourComponent />
      );

      expect(queryByText(/error/i)).toBeNull();
    });
  });
});
```

## Storybook Interaction Test Template

**File**: `stories/components/YourComponent.stories.tsx`

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { YourComponent } from '../YourComponent';

const meta = {
  title: 'Components/YourComponent',
  component: YourComponent,
} satisfies Meta<typeof YourComponent>;

export default meta;
type Story = StoryObj<typeof YourComponent>;

// Basic story
export const Default: Story = {
  args: {
    title: 'Default Title',
    value: 42,
  },
};

// Story with interaction test
export const WithInteractionTest: Story = {
  args: {
    title: 'Interactive',
    value: 0,
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify initial state
    expect(canvas.getByText('Interactive')).toBeTruthy();
    expect(canvas.getByText('0')).toBeTruthy();

    // Find and click button
    const button = canvas.getByRole('button');
    await button.click();

    // Verify updated state
    expect(canvas.getByText('1')).toBeTruthy();
  },
};

// Story with multiple interactions
export const ComplexInteraction: Story = {
  args: {
    title: 'Complex',
    steps: 5,
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Test initial state
    expect(canvas.getByText('Complex')).toBeTruthy();
    expect(canvas.getByText(/step: 0/i)).toBeTruthy();

    // Simulate multiple interactions
    const nextButton = canvas.getByRole('button', { name: /next/i });

    for (let i = 1; i <= 5; i++) {
      await nextButton.click();
      expect(canvas.getByText(new RegExp(`step: ${i}`, 'i'))).toBeTruthy();
    }

    // Verify completion state
    expect(canvas.getByText(/completed/i)).toBeTruthy();
  },
};

// Story with form interaction
export const FormInteraction: Story = {
  args: {
    onSubmit: (data: any) => console.log('Form submitted:', data),
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Fill in form fields
    const nameInput = canvas.getByLabelText(/name/i);
    await nameInput.type('Test User');

    const emailInput = canvas.getByLabelText(/email/i);
    await emailInput.type('test@example.com');

    // Submit form
    const submitButton = canvas.getByRole('button', { name: /submit/i });
    await submitButton.click();

    // Verify form was submitted
    // (In real scenario, you'd check for submission feedback)
  },
};

// Story with async operations
export const AsyncInteraction: Story = {
  args: {
    fetchData: true,
  },

  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Verify loading state
    expect(canvas.getByText(/loading/i)).toBeTruthy();

    // Wait for data to load (use waitFor in real scenario)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify loaded state
    expect(canvas.getByText(/data loaded/i)).toBeTruthy();
    expect(canvas.queryByText(/loading/i)).toBeNull();
  },
};
```

## Template Usage Guidelines

### Step 1: Copy the Appropriate Template

Choose the template that matches your testing needs and copy it to your test file location.

### Step 2: Rename and Customize

- Replace `YourBehavior`, `YourComponent`, `YourStrategy` etc. with actual names
- Update test descriptions to match your functionality
- Add or remove test cases as needed

### Step 3: Fill in Test Logic

- Replace placeholder assertions with real expectations
- Add test data that's realistic for your use case
- Include edge cases and error conditions

### Step 4: Run and Validate

- Run tests: `bun run test` or `bun test path/to/test.test.ts`
- Ensure tests fail on missing implementation (RED phase)
- Verify tests pass on correct implementation (GREEN phase)

## Additional Resources

- [Component Testing Guidelines](/docs/component-testing-guidelines.md)
- [Test Harness API](/docs/runtime-api.md)
- [Storybook Testing Guide](/docs/storybook-testing.md)
- [PR Testing Checklist](/docs/pr-testing-checklist.md)
