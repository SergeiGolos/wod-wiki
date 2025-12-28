import { describe, it, expect, vi } from 'bun:test';
import { MockBlock } from '../MockBlock';
import { IRuntimeBehavior } from '@/runtime/contracts';

describe('MockBlock', () => {
  it('should initialize with minimal configuration', () => {
    const block = new MockBlock('test-id');
    expect(block.key.toString()).toBe('test-id');
    expect(block.blockType).toBe('MockBlock');
    expect(block.context).toBeDefined();
    expect(block.context.ownerId).toBe('test-id');
  });

  it('should initialize with full configuration', () => {
    const block = new MockBlock({
      id: 'custom-id',
      blockType: 'CustomType',
      label: 'Custom Label',
      state: { count: 10 }
    });

    expect(block.key.toString()).toBe('custom-id');
    expect(block.blockType).toBe('CustomType');
    expect(block.label).toBe('Custom Label');
    expect(block.state.count).toBe(10);
  });

  it('should execute behavior lifecycle methods', () => {
    const onPush = vi.fn().mockReturnValue([]);
    const onNext = vi.fn().mockReturnValue([]);
    const onPop = vi.fn().mockReturnValue([]);

    const mockBehavior: IRuntimeBehavior = {
      onPush,
      onNext,
      onPop
    };

    const block = new MockBlock('test', [mockBehavior]);
    const mockRuntime = { clock: { now: new Date() } } as any;

    block.mount(mockRuntime);
    console.log('Calls:', onPush.mock.calls);
    expect(onPush).toHaveBeenCalled();
    expect(onPush.mock.calls[0][0]).toBe(mockRuntime);
    expect(onPush.mock.calls[0][1]).toBe(block);

    block.next(mockRuntime);
    expect(onNext).toHaveBeenCalled();
    expect(onNext.mock.calls[0][0]).toBe(mockRuntime);
    expect(onNext.mock.calls[0][1]).toBe(block);

    block.unmount(mockRuntime);
    expect(onPop).toHaveBeenCalled();
    expect(onPop.mock.calls[0][0]).toBe(mockRuntime);
    expect(onPop.mock.calls[0][1]).toBe(block);
  });

  it('should find behaviors by type', () => {
    class BehaviorA implements IRuntimeBehavior { }
    class BehaviorB implements IRuntimeBehavior { }

    const block = new MockBlock('test', [new BehaviorA(), new BehaviorB()]);

    expect(block.getBehavior(BehaviorA)).toBeDefined();
    expect(block.getBehavior(BehaviorB)).toBeDefined();
    expect(block.getBehavior(class Missing { })).toBeUndefined();
  });

  it('should allow state mutation', () => {
    const block = new MockBlock('test', [], { state: { value: 0 } });

    block.state.value = 5;
    expect(block.state.value).toBe(5);

    block.state.newItem = 'test';
    expect(block.state.newItem).toBe('test');
  });
});
