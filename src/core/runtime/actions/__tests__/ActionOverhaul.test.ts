import { IRuntimeBlock } from "@/core/IRuntimeBlock";
import { ITimerRuntime } from "@/core/ITimerRuntime";
import { BubbleUpAction } from "../base/BubbleUpAction";
import { LeafNodeAction } from "../base/LeafNodeAction";

// Mock implementation of IRuntimeBlock
class MockRuntimeBlock implements IRuntimeBlock {
  constructor(public blockKey: any, public blockId: string, public parent?: IRuntimeBlock) {}
  
  // Minimal implementation to test actions
  enter = jest.fn().mockReturnValue([]);
  next = jest.fn().mockReturnValue([]);
  leave = jest.fn().mockReturnValue([]);
  onStart = jest.fn().mockReturnValue([]);
  onStop = jest.fn().mockReturnValue([]);
  handle = jest.fn().mockReturnValue([]);
  composeMetrics = jest.fn().mockReturnValue([]);
  selectMany = jest.fn().mockReturnValue([]);
  
  // Other required properties
  sources: any[] = [];
  spans: any[] = [];
}

// Mock implementation of ITimerRuntime
class MockTimerRuntime implements ITimerRuntime {
  constructor(
    public blocks: IRuntimeBlock[] = [],
    public stackState: IRuntimeBlock[] = []
  ) {
    this.trace.stack = stackState;
  }
  
  code: string = "";
  jit: any = { end: jest.fn().mockReturnValue({}) };
  trace: any = {
    stack: this.stackState,
    current: jest.fn().mockImplementation(() => {
      return this.stackState.length > 0 ? this.stackState[this.stackState.length - 1] : undefined;
    })
  };
  history: any[] = [];
  script: any = {};
  
  apply = jest.fn();
  push = jest.fn().mockImplementation((block) => {
    if (block) {
      this.stackState.push(block);
    }
    return block || { blockKey: "mock" };
  });
  pop = jest.fn().mockImplementation(() => {
    return this.stackState.length > 0 ? this.stackState.pop() : undefined;
  });
  reset = jest.fn();
}

// Test implementation of LeafNodeAction
class TestLeafNodeAction extends LeafNodeAction {
  name: string = "test-leaf";
  
  applyBlockCalled: boolean = false;
  lastAppliedBlock: IRuntimeBlock | null = null;
  
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    this.applyBlockCalled = true;
    this.lastAppliedBlock = block;
  }
}

// Test implementation of BubbleUpAction
class TestBubbleUpAction extends BubbleUpAction {
  name: string = "test-bubble";
  
  appliedBlocks: IRuntimeBlock[] = [];
  
  protected applyBlock(runtime: ITimerRuntime, block: IRuntimeBlock): void {
    this.appliedBlocks.push(block);
  }
}

describe("Action Overhaul Tests", () => {
  describe("LeafNodeAction", () => {
    it("should apply action only to the current block", () => {
      // Arrange
      const childBlock = new MockRuntimeBlock("child", "child-id");
      const parentBlock = new MockRuntimeBlock("parent", "parent-id");
      childBlock.parent = parentBlock;
      
      const runtime = new MockTimerRuntime([], [childBlock]);
      const action = new TestLeafNodeAction();
      
      // Act
      action.apply(runtime, {} as any, {} as any);
      
      // Assert
      expect(action.applyBlockCalled).toBe(true);
      expect(action.lastAppliedBlock).toBe(childBlock);
      expect(action.lastAppliedBlock).not.toBe(parentBlock);
    });
    
    it("should not apply action when no current block exists", () => {
      // Arrange
      const runtime = new MockTimerRuntime();
      const action = new TestLeafNodeAction();
      
      // Act
      action.apply(runtime, {} as any, {} as any);
      
      // Assert
      expect(action.applyBlockCalled).toBe(false);
      expect(action.lastAppliedBlock).toBeNull();
    });
  });
  
  describe("BubbleUpAction", () => {
    it("should apply action to current block and all parent blocks", () => {
      // Arrange
      const childBlock = new MockRuntimeBlock("child", "child-id");
      const parentBlock = new MockRuntimeBlock("parent", "parent-id");
      const grandparentBlock = new MockRuntimeBlock("grandparent", "grandparent-id");
      
      childBlock.parent = parentBlock;
      parentBlock.parent = grandparentBlock;
      
      const runtime = new MockTimerRuntime([], [childBlock]);
      const action = new TestBubbleUpAction();
      
      // Act
      action.apply(runtime, {} as any, {} as any);
      
      // Assert
      expect(action.appliedBlocks.length).toBe(3);
      expect(action.appliedBlocks[0]).toBe(childBlock);
      expect(action.appliedBlocks[1]).toBe(parentBlock);
      expect(action.appliedBlocks[2]).toBe(grandparentBlock);
    });
    
    it("should not apply action when no current block exists", () => {
      // Arrange
      const runtime = new MockTimerRuntime();
      const action = new TestBubbleUpAction();
      
      // Act
      action.apply(runtime, {} as any, {} as any);
      
      // Assert
      expect(action.appliedBlocks.length).toBe(0);
    });
  });
});