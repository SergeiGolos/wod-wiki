# Integration Patterns & Best Practices

## Overview

This document provides practical patterns and examples for integrating the enhanced markdown editor with existing WOD Wiki components and ensuring smooth operation.

## Pattern 1: Widget Lifecycle Management

### Problem
Monaco widgets need proper lifecycle management to avoid memory leaks and ensure React components render correctly.

### Solution: React Widget Wrapper

```typescript
// src/markdown-editor/widgets/ReactMonacoWidget.ts

import { createRoot, Root } from 'react-dom/client';
import * as monaco from 'monaco-editor';

/**
 * Base class for Monaco widgets that render React components
 */
export abstract class ReactMonacoWidget<P = any> {
  protected domNode: HTMLElement;
  protected reactRoot: Root | null = null;
  protected currentProps: P | null = null;
  
  constructor(
    protected editor: monaco.editor.IStandaloneCodeEditor,
    protected id: string
  ) {
    this.domNode = document.createElement('div');
    this.domNode.className = 'monaco-react-widget';
  }
  
  /**
   * Render React component with given props
   */
  protected renderComponent(Component: React.ComponentType<P>, props: P): void {
    if (!this.reactRoot) {
      this.reactRoot = createRoot(this.domNode);
    }
    this.currentProps = props;
    this.reactRoot.render(<Component {...props} />);
  }
  
  /**
   * Update props without recreating root
   */
  protected updateProps(Component: React.ComponentType<P>, props: P): void {
    if (this.reactRoot && this.currentProps) {
      // Only re-render if props actually changed
      if (JSON.stringify(props) !== JSON.stringify(this.currentProps)) {
        this.renderComponent(Component, props);
      }
    } else {
      this.renderComponent(Component, props);
    }
  }
  
  /**
   * Clean up React root and DOM
   */
  dispose(): void {
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
    this.domNode.remove();
  }
  
  getId(): string {
    return this.id;
  }
  
  getDomNode(): HTMLElement {
    return this.domNode;
  }
}
```

### Example: Content Widget Implementation

```typescript
// src/markdown-editor/widgets/ContextOverlay.tsx

import * as monaco from 'monaco-editor';
import { ReactMonacoWidget } from './ReactMonacoWidget';
import { ContextPanel } from '../components/ContextPanel';
import { WodBlock } from '../types';

export class ContextOverlay extends ReactMonacoWidget<ContextPanelProps> 
  implements monaco.editor.IOverlayWidget {
  
  constructor(
    editor: monaco.editor.IStandaloneCodeEditor,
    private block: WodBlock,
    private onUpdate: (blockId: string, content: string) => void
  ) {
    super(editor, `context-overlay-${block.id}`);
    this.renderComponent(ContextPanel, this.buildProps());
  }
  
  private buildProps(): ContextPanelProps {
    return {
      block: this.block,
      onUpdateContent: (content) => this.onUpdate(this.block.id, content),
      // ... other callbacks
    };
  }
  
  update(block: WodBlock): void {
    this.block = block;
    this.updateProps(ContextPanel, this.buildProps());
  }
  
  getPosition(): monaco.editor.IOverlayWidgetPosition {
    const layout = this.editor.getLayoutInfo();
    const lineTop = this.editor.getTopForLineNumber(this.block.startLine);
    
    return {
      preference: {
        top: Math.max(0, lineTop),
        left: layout.width / 2
      }
    };
  }
}
```

### Usage Pattern

```typescript
// In component
useEffect(() => {
  if (!editor || !activeBlock) return;
  
  const overlay = new ContextOverlay(editor, activeBlock, handleUpdate);
  editor.addOverlayWidget(overlay);
  
  return () => {
    editor.removeOverlayWidget(overlay);
    overlay.dispose();  // Important: clean up React root
  };
}, [editor, activeBlock]);
```

## Pattern 2: View Zone with React Content

### Problem
View zones require DOM nodes, but we want to render React components.

### Solution: Portal-based View Zone

```typescript
// src/markdown-editor/zones/ReactViewZone.ts

import { createRoot, Root } from 'react-dom/client';
import * as monaco from 'monaco-editor';

export class ReactViewZone implements monaco.editor.IViewZone {
  private domNode: HTMLElement;
  private reactRoot: Root;
  
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    public afterLineNumber: number,
    private Component: React.ComponentType<any>,
    private props: any,
    private heightPx: number = 200
  ) {
    this.domNode = document.createElement('div');
    this.domNode.className = 'monaco-react-view-zone';
    this.domNode.style.width = '100%';
    
    this.reactRoot = createRoot(this.domNode);
    this.reactRoot.render(<Component {...props} />);
  }
  
  get domNode(): HTMLElement {
    return this.domNode;
  }
  
  get heightInPx(): number {
    return this.heightPx;
  }
  
  updateProps(props: any): void {
    this.props = props;
    this.reactRoot.render(<this.Component {...this.props} />);
  }
  
  updateHeight(height: number): void {
    this.heightPx = height;
    // Trigger editor re-layout
    this.editor.changeViewZones((accessor) => {
      // Monaco will re-read heightInPx
    });
  }
  
  dispose(): void {
    this.reactRoot.unmount();
    this.domNode.remove();
  }
}
```

### Usage with Hook

```typescript
// src/markdown-editor/hooks/useViewZone.ts

export function useViewZone(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  afterLineNumber: number,
  Component: React.ComponentType<any>,
  props: any,
  enabled: boolean = true
): string | null {
  const [zoneId, setZoneId] = useState<string | null>(null);
  const zoneRef = useRef<ReactViewZone | null>(null);
  
  useEffect(() => {
    if (!editor || !enabled) return;
    
    const zone = new ReactViewZone(editor, afterLineNumber, Component, props);
    zoneRef.current = zone;
    
    let id: string | null = null;
    editor.changeViewZones((accessor) => {
      id = accessor.addZone(zone);
    });
    
    setZoneId(id);
    
    return () => {
      if (id) {
        editor.changeViewZones((accessor) => {
          accessor.removeZone(id);
        });
      }
      zone.dispose();
      zoneRef.current = null;
    };
  }, [editor, afterLineNumber, enabled]);
  
  // Update props without recreating zone
  useEffect(() => {
    if (zoneRef.current) {
      zoneRef.current.updateProps(props);
    }
  }, [props]);
  
  return zoneId;
}
```

## Pattern 3: Debounced Block Detection

### Problem
Content changes trigger frequent re-detection, causing performance issues.

### Solution: Debounced Detection with Cancellation

```typescript
// src/markdown-editor/hooks/useWodBlocks.ts

export function useWodBlocks(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  content: string,
  debounceMs: number = 300
) {
  const [blocks, setBlocks] = useState<WodBlock[]>([]);
  const [detecting, setDetecting] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const detectBlocks = useCallback(() => {
    setDetecting(true);
    
    try {
      const detected = detectWodBlocks(content);
      setBlocks(detected);
    } finally {
      setDetecting(false);
    }
  }, [content]);
  
  useEffect(() => {
    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    // Schedule detection
    timerRef.current = setTimeout(detectBlocks, debounceMs);
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [content, debounceMs, detectBlocks]);
  
  return { blocks, detecting, redetect: detectBlocks };
}
```

## Pattern 4: Active Block Tracking

### Problem
Need to determine which block the cursor is currently in.

### Solution: Cursor Position Listener

```typescript
// src/markdown-editor/hooks/useActiveBlock.ts

export function useActiveBlock(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  blocks: WodBlock[]
): WodBlock | null {
  const [activeBlock, setActiveBlock] = useState<WodBlock | null>(null);
  
  useEffect(() => {
    if (!editor) return;
    
    const updateActiveBlock = () => {
      const position = editor.getPosition();
      if (!position) return;
      
      const block = findBlockAtLine(blocks, position.lineNumber);
      setActiveBlock(block);
    };
    
    // Initial check
    updateActiveBlock();
    
    // Listen for cursor changes
    const disposable = editor.onDidChangeCursorPosition(updateActiveBlock);
    
    return () => disposable.dispose();
  }, [editor, blocks]);
  
  return activeBlock;
}

function findBlockAtLine(blocks: WodBlock[], line: number): WodBlock | null {
  return blocks.find(block => 
    line >= block.startLine && line <= block.endLine
  ) || null;
}
```

## Pattern 5: Runtime State Synchronization

### Problem
Runtime state needs to be reflected in UI (clock, controls, results).

### Solution: Event-based State Updates

```typescript
// src/markdown-editor/hooks/useBlockRuntime.ts

export function useBlockRuntime(block: WodBlock | null) {
  const [runtime, setRuntime] = useState<ScriptRuntime | null>(null);
  const [state, setState] = useState<WodBlockState>('idle');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [results, setResults] = useState<WorkoutResults | null>(null);
  
  const start = useCallback(() => {
    if (!block || !block.statements) return;
    
    setState('starting');
    
    // Create runtime
    const compiler = new JitCompiler([/* strategies */]);
    const newRuntime = new ScriptRuntime(
      { statements: block.statements } as IScript,
      compiler
    );
    
    // Subscribe to events
    newRuntime.on('tick', (time: number) => {
      setElapsedTime(time);
    });
    
    newRuntime.on('stateChange', (newState: string) => {
      setState(newState as WodBlockState);
    });
    
    newRuntime.on('complete', (data: any) => {
      setState('completed');
      setResults(formatResults(data));
    });
    
    setRuntime(newRuntime);
    newRuntime.start();
    setState('running');
  }, [block]);
  
  const stop = useCallback(() => {
    if (runtime) {
      runtime.stop();
      setState('stopped');
      setRuntime(null);
    }
  }, [runtime]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (runtime) {
        runtime.stop();
      }
    };
  }, [runtime]);
  
  return { runtime, state, start, stop, elapsedTime, results };
}
```

## Pattern 6: Content Synchronization

### Problem
Changes in context panel need to update editor content without breaking cursor position.

### Solution: Targeted Content Replacement

```typescript
// src/markdown-editor/utils/contentSync.ts

export function updateBlockContent(
  editor: monaco.editor.IStandaloneCodeEditor,
  block: WodBlock,
  newContent: string
): void {
  const model = editor.getModel();
  if (!model) return;
  
  // Calculate range (exclude backticks)
  const startLine = block.startLine + 1;  // After ```wod
  const endLine = block.endLine;          // Before ```
  
  const range = new monaco.Range(
    startLine,
    1,
    endLine,
    model.getLineMaxColumn(endLine)
  );
  
  // Get cursor position
  const cursorPos = editor.getPosition();
  
  // Apply edit
  editor.executeEdits('context-panel', [{
    range,
    text: newContent,
    forceMoveMarkers: false
  }]);
  
  // Try to restore cursor position (if still valid)
  if (cursorPos && cursorPos.lineNumber >= startLine && cursorPos.lineNumber < endLine) {
    editor.setPosition(cursorPos);
  }
}

export function insertWodBlock(
  editor: monaco.editor.IStandaloneCodeEditor,
  template: string = '(21-15-9)\\n  Thrusters 95lb\\n  Pullups'
): void {
  const position = editor.getPosition();
  if (!position) return;
  
  const text = `\\n\`\`\`wod\\n${template}\\n\`\`\`\\n`;
  
  editor.executeEdits('toolbar', [{
    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
    text
  }]);
  
  // Move cursor inside block
  editor.setPosition({
    lineNumber: position.lineNumber + 2,
    column: 1
  });
  editor.focus();
}
```

## Pattern 7: Multiple Runtime Management

### Problem
Multiple blocks can have active runtimes simultaneously.

### Solution: Runtime Registry

```typescript
// src/markdown-editor/context/RuntimeRegistry.ts

export class RuntimeRegistry {
  private runtimes = new Map<string, ScriptRuntime>();
  
  register(blockId: string, runtime: ScriptRuntime): void {
    // Stop existing runtime for this block
    this.unregister(blockId);
    this.runtimes.set(blockId, runtime);
  }
  
  unregister(blockId: string): void {
    const runtime = this.runtimes.get(blockId);
    if (runtime) {
      runtime.stop();
      this.runtimes.delete(blockId);
    }
  }
  
  get(blockId: string): ScriptRuntime | undefined {
    return this.runtimes.get(blockId);
  }
  
  stopAll(): void {
    this.runtimes.forEach(runtime => runtime.stop());
    this.runtimes.clear();
  }
  
  getActiveCount(): number {
    return Array.from(this.runtimes.values())
      .filter(r => r.isRunning).length;
  }
}

// Usage in context
const registryRef = useRef(new RuntimeRegistry());

const startWorkout = useCallback((blockId: string) => {
  const block = blocks.get(blockId);
  if (!block) return;
  
  const runtime = createRuntime(block);
  registryRef.current.register(blockId, runtime);
  runtime.start();
}, [blocks]);

// Cleanup on unmount
useEffect(() => {
  return () => registryRef.current.stopAll();
}, []);
```

## Pattern 8: Performance Optimization

### Problem
Many widgets and zones can cause performance issues.

### Solution: Lazy Widget Creation and Virtualization

```typescript
// Only create widgets for visible blocks
export function useVisibleBlocks(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  blocks: WodBlock[]
): WodBlock[] {
  const [visibleBlocks, setVisibleBlocks] = useState<WodBlock[]>([]);
  
  useEffect(() => {
    if (!editor) return;
    
    const updateVisible = () => {
      const visibleRange = editor.getVisibleRanges()[0];
      if (!visibleRange) return;
      
      const visible = blocks.filter(block =>
        block.startLine <= visibleRange.endLineNumber &&
        block.endLine >= visibleRange.startLineNumber
      );
      
      setVisibleBlocks(visible);
    };
    
    updateVisible();
    
    const scrollDisposable = editor.onDidScrollChange(updateVisible);
    
    return () => scrollDisposable.dispose();
  }, [editor, blocks]);
  
  return visibleBlocks;
}

// Usage
const visibleBlocks = useVisibleBlocks(editor, blocks);

// Only render overlays for visible blocks
{visibleBlocks.map(block => (
  <ContextOverlayWrapper key={block.id} block={block} />
))}
```

## Pattern 9: Error Boundary for Widgets

### Problem
Errors in React widgets shouldn't crash the entire editor.

### Solution: Error Boundary Wrapper

```typescript
// src/markdown-editor/components/WidgetErrorBoundary.tsx

export class WidgetErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Widget error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="widget-error">
          <p>Widget error occurred</p>
          <details>
            <summary>Details</summary>
            <pre>{this.state.error?.message}</pre>
          </details>
        </div>
      );
    }
    
    return this.props.children;
  }
}

// Use in widget rendering
protected renderComponent(Component: React.ComponentType<P>, props: P): void {
  this.reactRoot?.render(
    <WidgetErrorBoundary>
      <Component {...props} />
    </WidgetErrorBoundary>
  );
}
```

## Pattern 10: Testing Patterns

### Problem
Monaco editor components are hard to test without actual editor instance.

### Solution: Mock Editor and Test Helpers

```typescript
// tests/helpers/mockEditor.ts

export function createMockEditor(): monaco.editor.IStandaloneCodeEditor {
  const model = {
    getValue: jest.fn(() => ''),
    getLineContent: jest.fn(() => ''),
    getLineCount: jest.fn(() => 10),
    getLineMaxColumn: jest.fn(() => 80),
  };
  
  return {
    getModel: () => model,
    getPosition: jest.fn(),
    setPosition: jest.fn(),
    getVisibleRanges: jest.fn(() => []),
    executeEdits: jest.fn(),
    addOverlayWidget: jest.fn(),
    removeOverlayWidget: jest.fn(),
    changeViewZones: jest.fn(),
    onDidChangeCursorPosition: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeModelContent: jest.fn(() => ({ dispose: jest.fn() })),
    // ... other methods
  } as any;
}

// tests/helpers/mockBlock.ts

export function createMockBlock(overrides?: Partial<WodBlock>): WodBlock {
  return {
    id: 'test-block-1',
    startLine: 1,
    endLine: 5,
    content: '(21-15-9)\\n  Thrusters 95lb\\n  Pullups',
    state: 'idle',
    widgetIds: {},
    ...overrides
  };
}

// Usage in tests
describe('useWodBlocks', () => {
  it('should detect blocks', () => {
    const editor = createMockEditor();
    const { result } = renderHook(() => useWodBlocks(editor, testContent));
    
    expect(result.current.blocks).toHaveLength(2);
  });
});
```

## Best Practices Summary

1. **Always dispose widgets** - Use `useEffect` cleanup to prevent memory leaks
2. **Debounce expensive operations** - Parsing, detection, layout calculations
3. **Isolate state** - Each block has independent state, avoid global mutations
4. **Use TypeScript strictly** - Type all Monaco API interactions
5. **Error boundaries** - Wrap React content in error boundaries
6. **Test with mocks** - Don't require real editor for unit tests
7. **Performance monitoring** - Use React DevTools to check for unnecessary renders
8. **Keyboard accessibility** - Ensure widgets are keyboard-navigable
9. **Responsive design** - Test on various viewport sizes
10. **Documentation** - Document custom hooks and utility functions

## Common Pitfalls to Avoid

❌ **Don't** create widgets in render - Use `useEffect`
❌ **Don't** forget to remove widgets - Always clean up
❌ **Don't** mutate editor content directly - Use `executeEdits`
❌ **Don't** recreate React roots unnecessarily - Reuse and update props
❌ **Don't** block the main thread - Debounce and use requestAnimationFrame
❌ **Don't** ignore TypeScript errors - Monaco types are strict for good reason
❌ **Don't** couple widgets tightly - Keep components independent

✅ **Do** use hooks for lifecycle management
✅ **Do** implement proper cleanup
✅ **Do** use Monaco's edit API
✅ **Do** reuse React roots
✅ **Do** optimize performance proactively
✅ **Do** follow TypeScript best practices
✅ **Do** design for reusability
