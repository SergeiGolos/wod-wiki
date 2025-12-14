import { describe, it, expect, vi } from 'vitest';
import {
  IBehavior,
  IBehaviorContext,
  IPushBehavior,
  INextBehavior,
  IPopBehavior,
  BaseBehavior,
  BehaviorOperation,
  isPushBehavior,
  isNextBehavior,
  isPopBehavior,
  composeBehaviors,
  createBehavior
} from '../IBehavior';
import { IRuntimeAction } from '../../IRuntimeAction';
import { IScriptRuntime } from '../../IScriptRuntime';
import { IRuntimeBlock } from '../../IRuntimeBlock';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockContext(overrides: Partial<IBehaviorContext> = {}): IBehaviorContext {
  return {
    runtime: {} as IScriptRuntime,
    block: { id: 'test-block' } as IRuntimeBlock,
    ...overrides
  };
}

function createMockAction(type: string): IRuntimeAction {
  return {
    type,
    do: vi.fn()
  } as unknown as IRuntimeAction;
}

// ============================================================================
// Test Behaviors
// ============================================================================

/**
 * Behavior that implements all three interfaces
 */
class FullBehavior extends BaseBehavior implements IPushBehavior, INextBehavior, IPopBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('push-action')];
  }

  onNext(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('next-action')];
  }

  onPop(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('pop-action')];
  }
}

/**
 * Behavior that only implements IPushBehavior
 */
class PushOnlyBehavior extends BaseBehavior implements IPushBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('push-only')];
  }
}

/**
 * Behavior that only implements INextBehavior
 */
class NextOnlyBehavior extends BaseBehavior implements INextBehavior {
  onNext(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('next-only')];
  }
}

/**
 * Behavior that only implements IPopBehavior
 */
class PopOnlyBehavior extends BaseBehavior implements IPopBehavior {
  onPop(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('pop-only')];
  }
}

/**
 * Behavior that implements push and pop but not next
 */
class PushPopBehavior extends BaseBehavior implements IPushBehavior, IPopBehavior {
  onPush(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('pp-push')];
  }

  onPop(context: IBehaviorContext): IRuntimeAction[] {
    return [createMockAction('pp-pop')];
  }
}

/**
 * Empty behavior - implements no interfaces
 */
class EmptyBehavior extends BaseBehavior {}

// ============================================================================
// Tests
// ============================================================================

describe('IBehavior', () => {
  describe('Type Guards', () => {
    it('isPushBehavior correctly identifies IPushBehavior', () => {
      const push = new PushOnlyBehavior();
      const next = new NextOnlyBehavior();
      const empty = new EmptyBehavior();

      expect(isPushBehavior(push)).toBe(true);
      expect(isPushBehavior(next)).toBe(false);
      expect(isPushBehavior(empty)).toBe(false);
      expect(isPushBehavior(null)).toBe(false);
      expect(isPushBehavior(undefined)).toBe(false);
    });

    it('isNextBehavior correctly identifies INextBehavior', () => {
      const push = new PushOnlyBehavior();
      const next = new NextOnlyBehavior();
      const empty = new EmptyBehavior();

      expect(isNextBehavior(next)).toBe(true);
      expect(isNextBehavior(push)).toBe(false);
      expect(isNextBehavior(empty)).toBe(false);
    });

    it('isPopBehavior correctly identifies IPopBehavior', () => {
      const pop = new PopOnlyBehavior();
      const next = new NextOnlyBehavior();
      const empty = new EmptyBehavior();

      expect(isPopBehavior(pop)).toBe(true);
      expect(isPopBehavior(next)).toBe(false);
      expect(isPopBehavior(empty)).toBe(false);
    });
  });

  describe('BaseBehavior', () => {
    it('dispatches to onPush when operation is push and interface is implemented', () => {
      const behavior = new FullBehavior();
      const ctx = createMockContext();

      const actions = behavior.do('push', ctx);

      expect(actions).toHaveLength(1);
      expect((actions[0] as any).type).toBe('push-action');
    });

    it('dispatches to onNext when operation is next and interface is implemented', () => {
      const behavior = new FullBehavior();
      const ctx = createMockContext();

      const actions = behavior.do('next', ctx);

      expect(actions).toHaveLength(1);
      expect((actions[0] as any).type).toBe('next-action');
    });

    it('dispatches to onPop when operation is pop and interface is implemented', () => {
      const behavior = new FullBehavior();
      const ctx = createMockContext();

      const actions = behavior.do('pop', ctx);

      expect(actions).toHaveLength(1);
      expect((actions[0] as any).type).toBe('pop-action');
    });

    it('returns empty array when interface is not implemented', () => {
      const pushOnly = new PushOnlyBehavior();
      const ctx = createMockContext();

      expect(pushOnly.do('next', ctx)).toEqual([]);
      expect(pushOnly.do('pop', ctx)).toEqual([]);
    });

    it('handles partial implementations correctly', () => {
      const pushPop = new PushPopBehavior();
      const ctx = createMockContext();

      expect(pushPop.do('push', ctx)).toHaveLength(1);
      expect((pushPop.do('push', ctx)[0] as any).type).toBe('pp-push');
      
      expect(pushPop.do('next', ctx)).toEqual([]);
      
      expect(pushPop.do('pop', ctx)).toHaveLength(1);
      expect((pushPop.do('pop', ctx)[0] as any).type).toBe('pp-pop');
    });

    it('returns empty array for empty behavior', () => {
      const empty = new EmptyBehavior();
      const ctx = createMockContext();

      expect(empty.do('push', ctx)).toEqual([]);
      expect(empty.do('next', ctx)).toEqual([]);
      expect(empty.do('pop', ctx)).toEqual([]);
    });
  });

  describe('composeBehaviors', () => {
    it('combines actions from multiple behaviors', () => {
      const behavior1 = new PushOnlyBehavior();
      const behavior2 = new FullBehavior();
      const composed = composeBehaviors([behavior1, behavior2]);
      const ctx = createMockContext();

      const actions = composed.do('push', ctx);

      expect(actions).toHaveLength(2);
      expect((actions[0] as any).type).toBe('push-only');
      expect((actions[1] as any).type).toBe('push-action');
    });

    it('returns empty array when no behaviors handle operation', () => {
      const behavior1 = new PushOnlyBehavior();
      const behavior2 = new PushOnlyBehavior();
      const composed = composeBehaviors([behavior1, behavior2]);
      const ctx = createMockContext();

      const actions = composed.do('next', ctx);

      expect(actions).toEqual([]);
    });

    it('maintains order of behaviors', () => {
      const behaviors: IBehavior[] = [
        createBehavior(() => [createMockAction('first')]),
        createBehavior(() => [createMockAction('second')]),
        createBehavior(() => [createMockAction('third')])
      ];
      const composed = composeBehaviors(behaviors);
      const ctx = createMockContext();

      const actions = composed.do('push', ctx);

      expect((actions[0] as any).type).toBe('first');
      expect((actions[1] as any).type).toBe('second');
      expect((actions[2] as any).type).toBe('third');
    });
  });

  describe('createBehavior', () => {
    it('creates behavior from function', () => {
      const behavior = createBehavior((op, ctx) => {
        return [createMockAction(`action-${op}`)];
      });
      const ctx = createMockContext();

      expect((behavior.do('push', ctx)[0] as any).type).toBe('action-push');
      expect((behavior.do('next', ctx)[0] as any).type).toBe('action-next');
      expect((behavior.do('pop', ctx)[0] as any).type).toBe('action-pop');
    });

    it('function receives context correctly', () => {
      const fn = vi.fn().mockReturnValue([]);
      const behavior = createBehavior(fn);
      const ctx = createMockContext({ block: { id: 'specific-block' } as IRuntimeBlock });

      behavior.do('push', ctx);

      expect(fn).toHaveBeenCalledWith('push', ctx);
      expect(fn.mock.calls[0][1].block.id).toBe('specific-block');
    });
  });
});
