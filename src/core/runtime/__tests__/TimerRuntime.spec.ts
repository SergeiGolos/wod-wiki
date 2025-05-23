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
import { RuntimeSpan } from '../RuntimeSpan';

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


    mockRuntimeJit.root.mockReturnValue(mockRootBlock);
    
    const actualStack: IRuntimeBlock[] = [];
    mockRuntimeStack.push.mockImplementation((block: IRuntimeBlock) => {
      if (block === undefined) return undefined as any;
      
      if (actualStack.length > 0) {
        block.parent = actualStack[actualStack.length - 1];
      }
      actualStack.push(block);
      return block;
    });
    mockRuntimeStack.pop.mockImplementation(() => {
      const popped = actualStack.pop();
      if (popped) popped.parent = undefined; 
      return popped;
    });
    mockRuntimeStack.current.mockImplementation(() => actualStack.length > 0 ? actualStack[actualStack.length - 1] : undefined);
    
    mockRuntimeStack.traverseAll.mockImplementation(<T>(
        callback: (block: IRuntimeBlock) => T,
        _fromChildToParent: boolean = true, 
        startBlock?: IRuntimeBlock
    ): T[] => {
        const results: T[] = [];
        let current = startBlock || (actualStack.length > 0 ? actualStack[actualStack.length -1] : undefined);
        while (current) {
            results.push(callback(current));
            current = current.parent;
        }
        return results; 
    });

    runtime = new TimerRuntime('testCode', mockRuntimeScript, mockRuntimeJit, mockInput$, mockOutput$);
    runtime.apply = mockApplyFn; 
    mockApplyFn.mockClear();

    // Initial push of root block happens in constructor, clear its mock calls for specific tests
    (mockRootBlock.enter as vi.Mock).mockClear();
    (mockRootBlock.onStart as vi.Mock).mockClear();
    mockApplyFn.mockClear(); // Clear apply calls from constructor's root block push
  });

  afterEach(() => {
    if (runtime && (runtime.dispose as any)?.unsubscribe) { // Added type assertion for dispose
      (runtime.dispose as any).unsubscribe();
    }
     while(mockRuntimeStack.pop()){}
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
      expect(mockApplyFn).toHaveBeenCalledWith(onStartActions, blockA);

      expect(mockApplyFn.mock.calls[0]).toEqual([enterActions, blockA]);
      expect(mockApplyFn.mock.calls[1]).toEqual([onStartActions, blockA]);
    });

    it('should call onStart for child then parent, and apply actions in child-then-parent order', () => {
      const parentBlock = createMockBlock('Parent');
      const parentEnterActions = [createMockAction('parentEnter')];
      const parentOnStartActions = [createMockAction('parentOnStart')];
      (parentBlock.enter as vi.Mock).mockReturnValue(parentEnterActions);
      (parentBlock.onStart as vi.Mock).mockReturnValue(parentOnStartActions);
      
      runtime.push(parentBlock); 
      mockApplyFn.mockClear(); 

      const childBlock = createMockBlock('Child');
      const childEnterActions = [createMockAction('childEnter')];
      const childOnStartActions = [createMockAction('childOnStart')];
      (childBlock.enter as vi.Mock).mockReturnValue(childEnterActions);
      (childBlock.onStart as vi.Mock).mockReturnValue(childOnStartActions);

      runtime.push(childBlock); 

      expect(childBlock.enter).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(childEnterActions, childBlock); 

      expect(childBlock.onStart).toHaveBeenCalledWith(runtime);
      expect(parentBlock.onStart).toHaveBeenCalledWith(runtime); 

      const expectedCombinedStartActions = [...childOnStartActions, ...parentOnStartActions];
      expect(mockApplyFn).toHaveBeenCalledWith(expectedCombinedStartActions, childBlock);

      expect(mockApplyFn.mock.calls[0]).toEqual([childEnterActions, childBlock]);
      expect(mockApplyFn.mock.calls[1]).toEqual([expectedCombinedStartActions, childBlock]);
    });
  });

  describe('pop()', () => {
    it('should call onStop and then leave for a single popped block and apply their actions', () => {
      const blockA = createMockBlock('BlockA');
      const onStopActions = [createMockAction('blockAOnStop')];
      const leaveActions = [createMockAction('blockALeave')];
      (blockA.onStop as Mocked<any>).mockReturnValue(onStopActions);
      (blockA.leave as Mocked<any>).mockReturnValue(leaveActions);
      
      runtime.push(blockA); 
      mockApplyFn.mockClear(); 

      runtime.pop();

      expect(blockA.onStop).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(onStopActions, blockA);
      
      expect(blockA.leave).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(leaveActions, blockA);
      
      expect(mockApplyFn.mock.calls[0]).toEqual([onStopActions, blockA]);
      expect(mockApplyFn.mock.calls[1]).toEqual([leaveActions, blockA]);
    });

    it('should call onStop for child then parent (on popped block), apply actions, then leave for child, then next for new current (parent)', () => {
      const parentBlock = createMockBlock('ParentP'); 
      const parentOnStartActions = [createMockAction('parentOnStartP')];
      const parentEnterActions = [createMockAction('parentEnterP')];
      const parentOnStopActions = [createMockAction('parentOnStopP')]; 
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
      mockApplyFn.mockClear(); 

      runtime.pop(); 

      expect(childBlock.onStop).toHaveBeenCalledWith(runtime);
      expect(parentBlock.onStop).toHaveBeenCalledWith(runtime); 
      
      const expectedCombinedStopActions = [...childOnStopActions, ...parentOnStopActions];
      expect(mockApplyFn).toHaveBeenCalledWith(expectedCombinedStopActions, childBlock);

      expect(childBlock.leave).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(childLeaveActions, childBlock);
      
      expect(parentBlock.next).toHaveBeenCalledWith(runtime);
      expect(mockApplyFn).toHaveBeenCalledWith(parentNextActions, parentBlock);

      expect(mockApplyFn.mock.calls[0]).toEqual([expectedCombinedStopActions, childBlock]);
      expect(mockApplyFn.mock.calls[1]).toEqual([childLeaveActions, childBlock]);
      expect(mockApplyFn.mock.calls[2]).toEqual([parentNextActions, parentBlock]);
    });
  });
});
