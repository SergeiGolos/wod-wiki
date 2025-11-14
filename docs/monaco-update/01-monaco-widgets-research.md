# Monaco Editor Widgets and Overlays - Research Documentation

## Overview

This document contains research findings on Monaco Editor's widget and overlay capabilities to inform the implementation of the enhanced WOD Wiki markdown editor with contextual overlays.

## Monaco Editor Widget Types

Monaco Editor provides three main mechanisms for adding custom UI elements:

### 1. Content Widgets (IContentWidget)

Content widgets are positioned relative to text positions in the editor. They flow with the text and can be positioned:
- Above, at, or below a specific text position
- With primary and secondary positions (for better placement control)
- Can overflow the editor boundaries (`allowEditorOverflow`)

**Key Properties:**
```typescript
interface IContentWidget {
  allowEditorOverflow?: boolean;  // Allow rendering outside editor bounds
  suppressMouseDown?: boolean;    // Prevent default mouse behavior
  getId(): string;                // Unique identifier
  getDomNode(): HTMLElement;      // The widget's DOM node
  getPosition(): IContentWidgetPosition | null; // Current position
}

interface IContentWidgetPosition {
  position: IPosition | null;     // Primary anchor position (line, column)
  secondaryPosition?: IPosition;  // Optional secondary position
  preference: ContentWidgetPositionPreference[]; // Above, Below, Exact
}
```

**Use Cases:**
- Parameter hints
- Autocomplete suggestions
- Inline documentation
- Quick info tooltips

**Best for WOD Wiki:**
- Exercise suggestions/autocomplete (already implemented)
- Exercise hover cards (already implemented)
- Inline error/warning decorations

### 2. Overlay Widgets (IOverlayWidget)

Overlay widgets render on top of the text with fixed or relative positioning. They don't flow with text scrolling.

**Key Properties:**
```typescript
interface IOverlayWidget {
  allowEditorOverflow?: boolean;
  getId(): string;
  getDomNode(): HTMLElement;
  getPosition(): IOverlayWidgetPosition | null;
}

interface IOverlayWidgetPosition {
  preference: OverlayWidgetPositionPreference | IOverlayWidgetPositionCoordinates;
  stackOridinal?: number;  // Stacking order
}

// Position preferences:
enum OverlayWidgetPositionPreference {
  TOP_RIGHT_CORNER = 0,
  BOTTOM_RIGHT_CORNER = 1,
  TOP_CENTER = 2
}

// Or absolute coordinates:
interface IOverlayWidgetPositionCoordinates {
  top: number;
  left: number;
}
```

**Use Cases:**
- Floating toolbars
- Status indicators
- Notifications
- Minimap overlays

**Best for WOD Wiki:**
- **Context panel for WOD blocks** (right-side panel)
- Timer controls overlay
- Workout execution status

### 3. View Zones (IViewZone)

View zones insert custom DOM content between editor lines. They create vertical space in the editor.

**Key Properties:**
```typescript
interface IViewZone {
  afterLineNumber: number;      // Insert after this line (0 = before first line)
  afterColumn?: number;          // Column position for wrapped lines
  heightInLines?: number;        // Height in editor lines
  heightInPx?: number;           // Height in pixels
  minWidthInPx?: number;         // Minimum width
  domNode: HTMLElement;          // Content to render
  suppressMouseDown?: boolean;
  showInHiddenAreas?: boolean;  // Show even when line is hidden
  ordinal?: number;              // Tiebreaker for same line
  onDomNodeTop?: (top: number) => void;  // Callback when positioned
  onComputedHeight?: (height: number) => void;
}
```

**Use Cases:**
- Inline visualizations
- Diff views
- Embedded widgets
- Debug breakpoint widgets

**Best for WOD Wiki:**
- **Clock/timer display below WOD block** (inline after ````wod` block)
- **Results table rendering** (inline after workout completion)
- Fragment visualization preview
- Inline workout preview

## Integration with React

### React Component Wrapper Pattern

Monaco widgets need to be integrated with React lifecycle:

```typescript
// Widget wrapper class
class ReactContentWidget implements monaco.editor.IContentWidget {
  private domNode: HTMLElement;
  private reactRoot: Root;
  
  constructor(
    private editor: monaco.editor.IStandaloneCodeEditor,
    private id: string,
    private Component: React.ComponentType<any>
  ) {
    this.domNode = document.createElement('div');
    this.reactRoot = createRoot(this.domNode);
  }
  
  getId(): string { return this.id; }
  getDomNode(): HTMLElement { return this.domNode; }
  
  render(props: any) {
    this.reactRoot.render(<this.Component {...props} />);
  }
  
  dispose() {
    this.reactRoot.unmount();
  }
}
```

### Adding/Removing Widgets

```typescript
// Add widget
editor.addContentWidget(widget);
editor.addOverlayWidget(widget);

// Remove widget
editor.removeContentWidget(widget);
editor.removeOverlayWidget(widget);

// View zones use accessor pattern
editor.changeViewZones((accessor) => {
  const zoneId = accessor.addZone(zone);
  // Store zoneId for later removal
});

// Remove zone
editor.changeViewZones((accessor) => {
  accessor.removeZone(zoneId);
});
```

## Monaco Editor Decorations

Decorations add visual styling to text ranges without inserting DOM:

```typescript
const decorations = editor.createDecorationsCollection([
  {
    range: new monaco.Range(startLine, startCol, endLine, endCol),
    options: {
      isWholeLine: true,
      className: 'my-decoration',
      glyphMarginClassName: 'my-glyph',
      inlineClassName: 'inline-style',
      beforeContentClassName: 'before-icon',
      afterContentClassName: 'after-icon',
      linesDecorationsClassName: 'line-number-decoration'
    }
  }
]);

// Update decorations
decorations.set([/* new decoration array */]);

// Clear decorations
decorations.clear();
```

**Best for WOD Wiki:**
- Highlighting WOD block boundaries
- Syntax highlighting for workout elements
- Current execution line highlighting
- Error/warning underlines

## Monaco Language Features

### Custom Language Registration

```typescript
monaco.languages.register({ id: 'wodmarkdown' });

// Tokenizer for syntax highlighting
monaco.languages.setMonarchTokensProvider('wodmarkdown', {
  tokenizer: {
    root: [
      [/```wod/, 'wod-block-start'],
      [/```/, 'wod-block-end'],
      // ... more rules
    ]
  }
});

// Theme for colors
monaco.editor.defineTheme('wod-theme', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'wod-block-start', foreground: 'ff0000', fontStyle: 'bold' }
  ],
  colors: {}
});
```

## Best Practices for WOD Wiki Implementation

### 1. Performance Considerations

- **Debounce parsing**: Already implemented (500ms debounce in RuntimeTestBench)
- **Lazy widget creation**: Only create widgets for visible WOD blocks
- **React root reuse**: Create single React root per widget, update props instead of recreating
- **Decoration batching**: Use `createDecorationsCollection` for efficient updates

### 2. State Management

- **Widget lifecycle tied to editor**: Clean up widgets on editor unmount
- **Sync widget state with editor content**: Use `onDidChangeModelContent` to detect changes
- **Position tracking**: Store line numbers/ranges for each WOD block to position widgets

### 3. UX Patterns

- **Smooth transitions**: Use CSS transitions for widget appearance/disappearance
- **Responsive sizing**: Adapt overlay size to editor viewport changes
- **Focus management**: Handle keyboard navigation between editor and widgets
- **Scroll synchronization**: Update widget positions on scroll events

### 4. React Integration Patterns

```typescript
// Custom hook for widget management
function useMonacoWidget<P>(
  editor: monaco.editor.IStandaloneCodeEditor | null,
  Component: React.ComponentType<P>,
  props: P,
  position: () => monaco.editor.IContentWidgetPosition | null
) {
  useEffect(() => {
    if (!editor) return;
    
    const widget = new ReactContentWidget(editor, 'widget-id', Component);
    widget.render(props);
    editor.addContentWidget(widget);
    
    return () => {
      editor.removeContentWidget(widget);
      widget.dispose();
    };
  }, [editor, Component, props, position]);
}
```

## Markdown Block Detection

To detect and parse `````wod` blocks:

```typescript
interface WodBlock {
  startLine: number;
  endLine: number;
  content: string;
  parsed?: ICodeStatement[];
  runtime?: ScriptRuntime;
}

function detectWodBlocks(text: string): WodBlock[] {
  const lines = text.split('\n');
  const blocks: WodBlock[] = [];
  let inBlock = false;
  let currentBlock: Partial<WodBlock> = {};
  
  lines.forEach((line, index) => {
    if (line.trim().startsWith('```wod')) {
      inBlock = true;
      currentBlock = { startLine: index + 1, content: '' };
    } else if (inBlock && line.trim().startsWith('```')) {
      inBlock = false;
      currentBlock.endLine = index;
      blocks.push(currentBlock as WodBlock);
      currentBlock = {};
    } else if (inBlock) {
      currentBlock.content = (currentBlock.content || '') + line + '\n';
    }
  });
  
  return blocks;
}
```

## Monaco Editor Event Hooks

Key events for WOD Wiki integration:

```typescript
// Content changes
editor.onDidChangeModelContent((e) => {
  // Re-detect WOD blocks
  // Update widget positions
});

// Cursor position
editor.onDidChangeCursorPosition((e) => {
  // Determine if cursor is in WOD block
  // Show/hide context panel
});

// Viewport changes
editor.onDidScrollChange((e) => {
  // Update widget positions if using absolute positioning
});

// Focus changes
editor.onDidFocusEditorText(() => {
  // Handle focus between editor and widgets
});
```

## References

- [Monaco Editor API Documentation](https://microsoft.github.io/monaco-editor/api/index.html)
- [Monaco Editor Playground](https://microsoft.github.io/monaco-editor/playground.html)
- [VS Code Editor API](https://code.visualstudio.com/api/references/vscode-api) (Monaco's inspiration)

## Related WOD Wiki Files

- `src/editor/WodWiki.tsx` - Current Monaco editor integration
- `src/editor/WodWikiSyntaxInitializer.tsx` - Language registration
- `src/runtime-test-bench/RuntimeTestBench.tsx` - Reference implementation with panels
- `src/parser/md-timer.ts` - Parser for workout scripts
- `src/runtime/ScriptRuntime.ts` - Runtime execution engine
