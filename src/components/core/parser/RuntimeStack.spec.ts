import { test, expect, describe, beforeEach, vi } from "vitest";
import { RuntimeStack } from "./RuntimeStack";
import { SourceCodeMetadata, StatementFragment, StatementNode } from "../timer.types";

// Mock implementation of StatementFragment for testing
class TestFragment implements StatementFragment {
  type: string;
  value: string;
  meta?: SourceCodeMetadata;
  
  constructor(type: string, value: string) {
    this.type = type;
    this.value = value;
  }
  
  toPart(): string {
    return this.value;
  }
}

// Simple mock for StatementHandlerRegistry to avoid memory issues
vi.mock("./handlers/StatementHandlerRegistry", () => ({
  StatementHandlerRegistry: class {
    constructor() {}
    processWithParents(block: any, node: any) {
      return block;
    }
  }
}));

// Create a simplified version of the test
describe('RuntimeStack', () => {
  let mockNodes: StatementNode[];
  let runtimeStack: RuntimeStack;
  
  // Setup mock data and RuntimeStack instance with minimal configuration
  beforeEach(() => {
    // Create simplified mock nodes
    mockNodes = [
      {
        id: 1,
        children: [2, 3],
        fragments: [new TestFragment('group', 'Workout')],
        meta: {
          line: 1,
          startOffset: 0,
          endOffset: 10,
          columnStart: 0,
          columnEnd: 10,
          length: 10
        }
      },
      {
        id: 2,
        parent: 1,
        children: [],
        fragments: [new TestFragment('text', 'Pushups'), new TestFragment('number', '10')],
        meta: {
          line: 2,
          startOffset: 11,
          endOffset: 20,
          columnStart: 0,
          columnEnd: 9,
          length: 9
        }
      },
      {
        id: 3,
        parent: 1,
        children: [],
        fragments: [new TestFragment('text', 'Situps'), new TestFragment('timer', '1:00')],
        meta: {
          line: 3,
          startOffset: 21,
          endOffset: 30,
          columnStart: 0,
          columnEnd: 9,
          length: 9
        }
      }
    ];
    
    // Initialize RuntimeStack with mock data and no handlers
    runtimeStack = new RuntimeStack(mockNodes, []);
  });
  
  test('constructor initializes leafs correctly', () => {
    expect(runtimeStack.leafs).toHaveLength(2);
    expect(runtimeStack.leafs[0].id).toBe(2);
    expect(runtimeStack.leafs[1].id).toBe(3);
  });
  
  test('getIndex returns correct node', () => {
    const node = runtimeStack.getIndex(0);
    expect(node?.id).toBe(2);
  });
  
  test('getId returns correct index', () => {
    expect(runtimeStack.getId(1)).toBe(0);
    expect(runtimeStack.getId(2)).toBe(1);
  });
});
