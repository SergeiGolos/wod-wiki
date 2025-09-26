/**
 * Storybook story demonstrating RuntimeStack lifecycle management
 * 
 * This story showcases the new constructor-based initialization and
 * consumer-managed dispose pattern introduced in the runtime stack enhancement.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import { RuntimeStack } from '../../src/runtime/RuntimeStack';
import { IRuntimeBlock } from '../../src/runtime/IRuntimeBlock';
import { IRuntimeAction } from '../../src/runtime/IRuntimeAction';
import { BlockKey } from '../../src/BlockKey';

// Demo IRuntimeBlock implementation for the story
class DemoRuntimeBlock implements IRuntimeBlock {
  public readonly sourceId: number[] = [1, 2, 3];
  private _disposed = false;
  
  constructor(
    public readonly key: BlockKey,
    public readonly description: string,
    resources: string[] = []
  ) {
    // Constructor-based initialization (new pattern)
    console.log(`🏗️ Initializing ${this.description} with resources:`, resources);
  }
  
  push(): IRuntimeAction[] {
    console.log(`📥 Push called on ${this.description}`);
    return [];
  }
  
  next(): IRuntimeAction[] {
    return [];
  }
  
  pop(): IRuntimeAction[] {
    console.log(`📤 Pop called on ${this.description}`);
    return [];
  }
  
  dispose(): void {
    if (!this._disposed) {
      console.log(`🗑️ Disposing ${this.description} and cleaning up resources`);
      this._disposed = true;
    }
  }
  
  get disposed(): boolean {
    return this._disposed;
  }
}

// Interactive component for the story
function RuntimeStackDemo() {
  const [stack] = useState(() => new RuntimeStack());
  const [stackState, setStackState] = useState<IRuntimeBlock[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [nextBlockId, setNextBlockId] = useState(1);

  // Update stack state display
  const refreshStackState = useCallback(() => {
    setStackState([...stack.blocks]);
  }, [stack]);

  // Add log entry
  const addLog = useCallback((message: string) => {
    setLogs(prevLogs => [...prevLogs, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  // Create and push a new block
  const pushBlock = useCallback(() => {
    const blockKey = new BlockKey(`demo-block-${nextBlockId}`);
    const resources = [`resource-${nextBlockId}`, `timer-${nextBlockId}`];
    
    // Constructor-based initialization happens here
    const block = new DemoRuntimeBlock(blockKey, `Demo Block ${nextBlockId}`, resources);
    
    // Push to stack (no initialization calls made by stack)
    stack.push(block);
    
    addLog(`✅ Pushed: ${block.description}`);
    setNextBlockId(prev => prev + 1);
    refreshStackState();
  }, [stack, nextBlockId, addLog, refreshStackState]);

  // Pop and dispose block (consumer responsibility)
  const popAndDispose = useCallback(() => {
    // Pop from stack (no cleanup calls made by stack)
    const poppedBlock = stack.pop();
    
    if (poppedBlock) {
      addLog(`🔄 Popped: ${(poppedBlock as DemoRuntimeBlock).description}`);
      
      // Consumer responsibility: dispose the block
      poppedBlock.dispose();
      addLog(`✨ Disposed: ${(poppedBlock as DemoRuntimeBlock).description}`);
    } else {
      addLog(`❌ Cannot pop: stack is empty`);
    }
    
    refreshStackState();
  }, [stack, addLog, refreshStackState]);

  // Demonstrate the graph() method
  const showGraph = useCallback(() => {
    const graph = stack.graph();
    addLog(`📊 Stack graph (top-first): [${graph.map(b => (b as DemoRuntimeBlock).description).join(', ')}]`);
  }, [stack, addLog]);

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Emergency: dispose all blocks (cleanup pattern)
  const disposeAll = useCallback(() => {
    // Pop and dispose all blocks
    while (stack.blocks.length > 0) {
      const block = stack.pop();
      if (block) {
        block.dispose();
        addLog(`🧹 Emergency disposed: ${(block as DemoRuntimeBlock).description}`);
      }
    }
    
    refreshStackState();
  }, [stack, addLog, refreshStackState]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">RuntimeStack Lifecycle Demo</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Stack Operations</h3>
            <div className="space-y-2">
              <button
                onClick={pushBlock}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                Push New Block
              </button>
              <button
                onClick={popAndDispose}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
                disabled={stackState.length === 0}
              >
                Pop & Dispose Block
              </button>
              <button
                onClick={showGraph}
                className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
              >
                Show Stack Graph
              </button>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Utility Operations</h3>
            <div className="space-y-2">
              <button
                onClick={clearLogs}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                Clear Logs
              </button>
              <button
                onClick={disposeAll}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
                disabled={stackState.length === 0}
              >
                Emergency: Dispose All
              </button>
            </div>
          </div>

          {/* Stack Visualization */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-3">Current Stack ({stackState.length} blocks)</h3>
            <div className="space-y-1">
              {stackState.length === 0 ? (
                <div className="text-gray-500 italic">Stack is empty</div>
              ) : (
                stackState.map((block, index) => {
                  const demoBlock = block as DemoRuntimeBlock;
                  return (
                    <div
                      key={block.key.toString()}
                      className={`p-2 rounded text-sm ${
                        index === 0 ? 'bg-purple-200 font-semibold' : 'bg-purple-100'
                      }`}
                    >
                      {index === 0 && '👑 '}{demoBlock.description}
                      {demoBlock.disposed && ' (disposed)'}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Activity Log</h3>
          <div className="bg-white border rounded p-3 h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500 italic">No activity yet...</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-sm font-mono">
                    {log}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Concepts */}
      <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Key Concepts Demonstrated:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li><strong>Constructor-based initialization:</strong> Blocks initialize during construction, not during stack operations</li>
          <li><strong>Consumer-managed disposal:</strong> Consumer must call dispose() after popping blocks</li>
          <li><strong>Simplified stack operations:</strong> push() and pop() don't call lifecycle methods</li>
          <li><strong>Graph visualization:</strong> graph() returns top-first ordered array</li>
          <li><strong>Error handling:</strong> Proper cleanup patterns for resource management</li>
        </ul>
      </div>
    </div>
  );
}

const meta: Meta = {
  title: 'Runtime/RuntimeStack Lifecycle',
  component: RuntimeStackDemo,
  parameters: {
    docs: {
      description: {
        component: `
RuntimeStack Lifecycle Management Demo

This interactive story demonstrates the enhanced RuntimeStack with proper lifecycle management:

- **Constructor-based initialization**: Blocks are initialized when constructed, not when pushed
- **Consumer-managed disposal**: The consumer (your code) must call dispose() after popping blocks
- **Simplified operations**: Stack push/pop operations don't trigger lifecycle methods
- **Graph visualization**: New graph() method returns stack in top-first order

Try the different operations to see how the new lifecycle patterns work in practice.
        `,
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  name: 'Interactive Lifecycle Demo',
  render: () => <RuntimeStackDemo />,
};

// Additional story showing the lifecycle patterns in code
export const CodeExample: Story = {
  name: 'Code Usage Example',
  render: () => (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Usage Pattern Example</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <pre className="text-sm overflow-x-auto">
{`// 1. Constructor-based initialization (new pattern)
class MyRuntimeBlock implements IRuntimeBlock {
  constructor(
    public readonly key: BlockKey,
    private resources: Resource[]
  ) {
    // All initialization happens here, not during push
    this.setupResources(resources);
  }
  
  dispose(): void {
    // Required cleanup method
    this.cleanupResources();
  }
}

// 2. Consumer-managed lifecycle
const stack = new RuntimeStack();

// Create and initialize block
const context = getCurrentContext();
const block = new MyRuntimeBlock(new BlockKey('workout'), context);

try {
  // Push is simple - just adds to stack
  stack.push(block);
  
  // Do work...
  
} finally {
  // Consumer must dispose after pop
  const poppedBlock = stack.pop();
  if (poppedBlock) {
    poppedBlock.dispose(); // Required!
  }
}

// 3. Graph visualization
const graph = stack.graph(); // Returns [top, middle, bottom]
console.log('Stack visualization:', graph);`}
        </pre>
      </div>

      <div className="mt-4 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Breaking Changes in this Enhancement:</h3>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>RuntimeStack no longer calls initialization methods during push</li>
          <li>RuntimeStack no longer calls cleanup methods during pop</li>
          <li>Consumer code must call dispose() on popped blocks</li>
          <li>Initialization must happen in block constructors</li>
          <li>New graph() method provides stack visualization</li>
        </ul>
      </div>
    </div>
  ),
};