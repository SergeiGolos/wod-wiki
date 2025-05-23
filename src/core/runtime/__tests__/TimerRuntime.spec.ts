import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Subject, Subscription } from 'rxjs';
import { TimerRuntime } from '../TimerRuntime';
import { RuntimeStack } from '../RuntimeStack';
import { RuntimeScript } from '../RuntimeScript';
import { RuntimeJit } from '../RuntimeJit';
import { IRuntimeBlock } from '../../IRuntimeBlock';
import { IRuntimeAction } from '../../IRuntimeAction';
import { IRuntimeEvent } from '../../IRuntimeEvent';
import { BlockKey } from '../../BlockKey';
import { JitStatement } from '../../JitStatement';

// --- Mocks ---
vi.mock('../RuntimeStack');
vi.mock('../RuntimeScript');
vi.mock('../RuntimeJit');
vi.mock('../../JitStatement');

const mockApplyFn = vi.fn();

// Helper to create mock IRuntimeAction
const createMockAction = (name: string): IRuntimeAction => ({
  name,
  apply: vi.fn(),
});

// Helper to create mock IRuntimeBlock
const createMockBlock = (name: string, blockKeySuffix: string = ''): IRuntimeBlock => {
  const key = new BlockKey();
  key.push([new JitStatement({ id: name, key: name } as any)], 0);
  key.fragments[0].value += blockKeySuffix; // Make block keys unique for logging/debugging

  return {
    blockId: `mockId-${name}${blockKeySuffix}`,
    blockKey: key,
    sources: [],
    spans: [],
    parent: undefined,
    selectMany: vi.fn(() => []),
    handle: vi.fn(() => []),
    enter: vi.fn(() => []),
    leave: vi.fn(() => []),
    next: vi.fn(() => []),
    onStart: vi.fn(() => []),
    onStop: vi.fn(() => []),
  };
};

describe('TimerRuntime', () => {
  let runtime: TimerRuntime;
  let mockInput$: Subject<IRuntimeEvent>;
  let mockOutput$: Subject<any>;
  let mockRuntimeStack: vi.Mocked<RuntimeStack>;
  let mockRuntimeScript: vi.Mocked<RuntimeScript>;
  let mockRuntimeJit: vi.Mocked<RuntimeJit>;
  let mockRootBlock: IRuntimeBlock;

  beforeEach(() => {
    mockInput$ = new Subject<IRuntimeEvent>();
    mockOutput$ = new Subject<any>();
    
    // Create new instances of mocks for each test
    mockRuntimeStack = new RuntimeStack() as vi.Mocked<RuntimeStack>;
    mockRuntimeScript = new RuntimeScript({} as any) as vi.Mocked<RuntimeScript>;
    mockRuntimeJit = new RuntimeJit({} as any, {} as any) as vi.Mocked<RuntimeJit>;

    mockRootBlock = createMockBlock('root');
    (mockRootBlock.enter as vi.Mock).mockReturnValue([createMockAction('rootEnter')]);
    (mockRootBlock.onStart as vi.Mock).mockReturnValue([createMockAction('rootOnStart')]);


    // Setup mockRuntimeJit to return the root block
    mockRuntimeJit.root.mockReturnValue(mockRootBlock);
    
    // Mock RuntimeStack's methods
    const actualStack: IRuntimeBlock[] = [];
    mockRuntimeStack.push.mockImplementation((block: IRuntimeBlock) => {
      if (actualStack.length > 0) {
        block.parent = actualStack[actualStack.length - 1];
      }
      actualStack.push(block);
      return block;
    });
    mockRuntimeStack.pop.mockImplementation(() => {
      const popped = actualStack.pop();
      if (popped) popped.parent = undefined; // Clear parent on pop
      return popped;
    });
    mockRuntimeStack.current.mockImplementation(() => actualStack.length > 0 ? actualStack[actualStack.length - 1] : undefined);
    
    // Mock traverseAll to simulate traversal from a given block up to its parents
    // This is crucial for testing onStart/onStop action aggregation.
    mockRuntimeStack.traverseAll.mockImplementation(<T>(
        callback: (block: IRuntimeBlock) => T,
        _fromChildToParent: boolean = true, // TimerRuntime uses default true
        startBlock?: IRuntimeBlock
    ): T[] => {
        const results: T[] = [];
        let current = startBlock || (actualStack.length > 0 ? actualStack[actualStack.length -1] : undefined);
        while (current) {
            results.push(callback(current));
            current = current.parent;
        }
        // TimerRuntime's current usage of traverseAll implies child's actions first in the flattened array
        // Results are collected [childCallbackResult, parentCallbackResult, grandparentCallbackResult]
        // Then TimerRuntime does: collected.forEach(arr => final = final.concat(arr))
        // So if callback returns [action], final becomes [childAction, parentAction]
        return results; // This order [child, parent] will be naturally concatted by TimerRuntime
    });


    runtime = new TimerRuntime('testCode', mockRuntimeScript, mockRuntimeJit, mockInput$, mockOutput$);
    runtime.apply = mockApplyFn; // Override apply with a Jest mock
    mockApplyFn.mockClear();

    // Initial push of root block happens in constructor, clear its mock calls for specific tests
    (mockRootBlock.enter as vi.Mock).mockClear();
    (mockRootBlock.onStart as vi.Mock).mockClear();
    mockApplyFn.mockClear(); // Clear apply calls from constructor's root block push
  });

  afterEach(() => {
    if (runtime && runtime.dispose) {
      runtime.dispose.unsubscribe();
    }
    // Clear the actualStack so it's empty for the next test
     while(mockRuntimeStack.pop()){} // Clear stack
  });

  describe('push()', () => {
    it('should call enter and then onStart for a single pushed block and apply their actions', () => {
      const blockA = createMockBlock('BlockA');
      const enterActions = [createMockAction('blockAEnter')];
      const onStartActions = [createMockAction('blockAOnStart')];
      (blockA.enter as vi.Mock).mockReturnValue(enterActions);
      (blockA.onStart as vi.Mock).mockReturnValue(onStartActions);

      runtime.push(blockA);

      expect(blockA.enter).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(enterActions, blockA);
      
      expect(blockA.onStart).toHaveBeenCalledWith(runtime);
      // onStart actions are collected by traverseAll and then applied
      expect(mockApplyFn).toHaveBeenCalledWith(onStartActions, blockA);

      // Check order of apply calls
      expect(mockApplyFn.mock.calls[0]).toEqual([enterActions, blockA]);
      expect(mockApplyFn.mock.calls[1]).toEqual([onStartActions, blockA]);
    });

    it('should call onStart for child then parent, and apply actions in child-then-parent order', () => {
      const parentBlock = createMockBlock('Parent');
      const parentEnterActions = [createMockAction('parentEnter')];
      const parentOnStartActions = [createMockAction('parentOnStart')];
      (parentBlock.enter as vi.Mock).mockReturnValue(parentEnterActions);
      (parentBlock.onStart as vi.Mock).mockReturnValue(parentOnStartActions);
      
      runtime.push(parentBlock); // Push parent first
      mockApplyFn.mockClear(); // Clear apply calls from parent push

      const childBlock = createMockBlock('Child');
      const childEnterActions = [createMockAction('childEnter')];
      const childOnStartActions = [createMockAction('childOnStart')];
      (childBlock.enter as vi.Mock).mockReturnValue(childEnterActions);
      (childBlock.onStart as vi.Mock).mockReturnValue(childOnStartActions);

      runtime.push(childBlock); // Push child

      expect(childBlock.enter).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(childEnterActions, childBlock); // Child enter actions first

      expect(childBlock.onStart).toHaveBeenCalledWith(runtime);
      expect(parentBlock.onStart).toHaveBeenCalledWith(runtime); // Parent onStart also called via traverseAll

      // Check the combined onStart actions
      // traverseAll collects [childOnStartActionsFromCallback, parentOnStartActionsFromCallback]
      // .forEach(actionArray => startActions = startActions.concat(actionArray))
      // results in [ ...childOnStartActions, ...parentOnStartActions ]
      const expectedCombinedStartActions = [...childOnStartActions, ...parentOnStartActions];
      expect(mockApplyFn).toHaveBeenCalledWith(expectedCombinedStartActions, childBlock);

      // Verify order of apply calls for the child push
      expect(mockApplyFn.mock.calls[0]).toEqual([childEnterActions, childBlock]);
      expect(mockApplyFn.mock.calls[1]).toEqual([expectedCombinedStartActions, childBlock]);
    });
  });

  describe('pop()', () => {
    it('should call onStop and then leave for a single popped block and apply their actions', () => {
      const blockA = createMockBlock('BlockA');
      const onStopActions = [createMockAction('blockAOnStop')];
      const leaveActions = [createMockAction('blockALeave')];
      (blockA.onStop as vi.Mock).mockReturnValue(onStopActions);
      (blockA.leave as vi.Mock).mockReturnValue(leaveActions);
      
      runtime.push(blockA); // Push then pop
      mockApplyFn.mockClear(); // Clear apply from push

      runtime.pop();

      expect(blockA.onStop).toHaveBeenCalledWith(runtime);
      // onStop actions are collected by traverseAll and then applied
      expect(mockApplyFn).toHaveBeenCalledWith(onStopActions, blockA);
      
      expect(blockA.leave).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(leaveActions, blockA);
      
      // Check order of apply calls
      expect(mockApplyFn.mock.calls[0]).toEqual([onStopActions, blockA]);
      expect(mockApplyFn.mock.calls[1]).toEqual([leaveActions, blockA]);
    });

    it('should call onStop for child then parent (on popped block), apply actions, then leave for child, then next for new current (parent)', () => {
      const parentBlock = createMockBlock('ParentP'); // Suffix to avoid name collision in mock block creation if tests run parallel or names are keys
      const parentOnStartActions = [createMockAction('parentOnStartP')];
      const parentEnterActions = [createMockAction('parentEnterP')];
      const parentOnStopActions = [createMockAction('parentOnStopP')]; // For when parent itself might be popped
      const parentNextActions = [createMockAction('parentNextP')];
      (parentBlock.onStart as vi.Mock).mockReturnValue(parentOnStartActions);
      (parentBlock.enter as vi.Mock).mockReturnValue(parentEnterActions);
      (parentBlock.onStop as vi.Mock).mockReturnValue(parentOnStopActions);
      (parentBlock.next as vi.Mock).mockReturnValue(parentNextActions);

      runtime.push(parentBlock);

      const childBlock = createMockBlock('ChildC');
      const childEnterActions = [createMockAction('childEnterC')];
      const childOnStartActions = [createMockAction('childOnStartC')];
      const childLeaveActions = [createMockAction('childLeaveC')];
      const childOnStopActions = [createMockAction('childOnStopC')];
      (childBlock.enter as vi.Mock).mockReturnValue(childEnterActions);
      (childBlock.onStart as vi.Mock).mockReturnValue(childOnStartActions);
      (childBlock.leave as vi.Mock).mockReturnValue(childLeaveActions);
      (childBlock.onStop as vi.Mock).mockReturnValue(childOnStopActions);
      
      runtime.push(childBlock);
      mockApplyFn.mockClear(); // Clear apply calls from push operations

      runtime.pop(); // Pop childBlock

      // 1. onStop calls (child then parent, for the childBlock being popped)
      expect(childBlock.onStop).toHaveBeenCalledWith(runtime);
      expect(parentBlock.onStop).toHaveBeenCalledWith(runtime); // Parent's onStop also called via traverseAll for the popped child
      
      const expectedCombinedStopActions = [...childOnStopActions, ...parentOnStopActions];
      expect(mockApplyFn).toHaveBeenCalledWith(expectedCombinedStopActions, childBlock);

      // 2. leave call for popped block (childBlock)
      expect(childBlock.leave).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(childLeaveActions, childBlock);
      
      // 3. next call for the new current block (parentBlock)
      expect(parentBlock.next).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(parentNextActions, parentBlock);

      // Verify order of apply calls for the pop operation
      expect(mockApplyFn.mock.calls[0]).toEqual([expectedCombinedStopActions, childBlock]);
      expect(mockApplyFn.mock.calls[1]).toEqual([childLeaveActions, childBlock]);
      expect(mockApplyFn.mock.calls[2]).toEqual([parentNextActions, parentBlock]);
    });
  });
});
