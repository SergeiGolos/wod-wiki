# Editor Integration

Monaco Editor integration with custom workout script syntax highlighting, suggestions, and rich markdown support.

## Overview

The editor module provides:

- **WodWiki** - Main Monaco editor component
- **SuggestionEngine** - Exercise name autocompletion
- **SemanticTokenEngine** - Syntax highlighting
- **RichMarkdownManager** - Inline card rendering (images, videos)
- **ExerciseIndexManager** - Exercise search and indexing
- **LRUCache** - Least recently used cache
- **HiddenAreasCoordinator** - Code folding management

## WodWiki

Main React component wrapping Monaco Editor with WOD-specific features.

### Props

```typescript
interface WodWikiProps {
  id: string;
  code?: string;
  cursor?: CodeMetadata | undefined;
  onValueChange?: (script?: IScript) => void;
  onMount?: (editor: any) => void;
  readonly?: boolean;
  highlightedLine?: number;
  onLineClick?: (lineNumber: number) => void;
  exerciseProvider?: ExerciseDataProvider;
  theme?: string;
}
```

**Parameters:**

| Prop | Type | Description | Default |
|------|-------|-------------|---------|
| `id` | `string` | Unique editor identifier | Required |
| `code` | `string` | Initial workout script content | `""` |
| `cursor` | `CodeMetadata` | Cursor position to highlight | `undefined` |
| `onValueChange` | `function` | Callback when script changes | `undefined` |
| `onMount` | `function` | Callback when editor mounts | `undefined` |
| `readonly` | `boolean` | Whether editor is read-only | `false` |
| `highlightedLine` | `number` | Line number to highlight | `undefined` |
| `onLineClick` | `function` | Callback on line click | `undefined` |
| `exerciseProvider` | `ExerciseDataProvider` | Exercise data for suggestions | `undefined` |
| `theme` | `string` | Monaco theme name | `"wod-wiki-theme"` |

### Example Usage

```typescript
import { WodWiki } from '@/editor/WodWiki';
import { createDefaultRuntimeFactory } from '@/services/ExerciseData';

<WodWiki 
  id="workout-editor"
  code="3 Rounds of: 10 Push-ups"
  onValueChange={(script) => {
    console.log('Script parsed:', script);
  }}
  readonly={false}
  highlightedLine={5}
  onLineClick={(lineNumber) => {
    console.log('Line clicked:', lineNumber);
  }}
  exerciseProvider={customExerciseProvider}
/>
```

## Syntax Highlighting

Custom token types for workout syntax.

### Token Types

| Token | Color | Style | Hints |
|--------|-------|--------|-------|
| `duration` | `#FFA500` | Bold | ⏱️ before |
| `rep` | `#008800` | Bold | x after |
| `resistance` | `#008800` | Bold | 💪 before |
| `distance` | `#008800` | Bold | - |
| `effort` | `#000000` | Normal | - |
| `rounds` | `#AA8658` | Normal | :rounds after |

### WodWikiToken Interface

```typescript
interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints?: WodWikiTokenHint[];
}

interface WodWikiTokenHint {
  hint: string;
  position: "after" | "before";
  offSet?: number;
}
```

## SuggestionEngine

Provides autocompletion for exercise names.

### Purpose

Offers intelligent exercise suggestions as user types, using:
- Exercise index for fast lookup
- LRU cache for recently used exercises
- Fuzzy matching for partial input

### Example

```typescript
// User types: "Push"
Suggestions:
- Push-ups
- Push press
- Push jerk
- Romanian deadlift push

// User types: "Squ"
Suggestions:
- Squats
- Squat snatch
- Overhead squats
```

## ExerciseIndexManager

Manages exercise data for suggestions and hover information.

### Methods

#### `setProvider(provider: ExerciseDataProvider): void`

Sets the exercise data provider.

**Parameters:**
- `provider` - Implementation providing exercise search

**ExerciseDataProvider Interface:**

```typescript
interface ExerciseDataProvider {
  search(query: string): Promise<Exercise[]>;
  getById(id: string): Promise<Exercise | undefined>;
  getCategoryNames(): Promise<string[]>;
}
```

**Example:**

```typescript
class CustomExerciseProvider implements ExerciseDataProvider {
  async search(query: string) {
    // Search local database or API
    return exercises.filter(e => 
      e.name.toLowerCase().includes(query.toLowerCase())
    );
  }
  
  async getById(id: string) {
    return exercises.find(e => e.id === id);
  }
  
  async getCategoryNames() {
    return Array.from(new Set(
      exercises.map(e => e.category)
    ));
  }
}

const manager = ExerciseIndexManager.getInstance();
manager.setProvider(new CustomExerciseProvider());
```

## SemanticTokenEngine

Processes editor tokens for syntax highlighting.

### Purpose

- Maps Monaco tokens to WOD token types
- Adds visual hints (icons, labels)
- Updates highlighting in real-time

## RichMarkdownManager

Renders inline cards for rich content (images, videos, YouTube, etc.).

### Features

- **Inline Card Rendering** - Cards for images, videos, blockquotes
- **Frontmatter Cards** - Metadata cards with custom UI
- **Heading Cards** - Styled section headers
- **Code Folding** - Hides card content under headings
- **WOD Block Cards** - Special styling for workout blocks

### Card Types

| Card Type | Example | Purpose |
|-----------|---------|---------|
| **Image** | `![Alt text](url)` | Display images inline |
| **YouTube** | `YouTube: video_id` | Embed YouTube videos |
| **Blockquote** - `> Quote text` | Highlight quotes |
| **Heading** - `# Header` | Section markers with folding |
| **Frontmatter** - `---` metadata `---` | Document metadata |

**Example:**

```markdown
## Workout: Cindy
> Five rounds for time

![Warm-up Diagram](/images/warmup.png)

YouTube: abc123

3 Rounds:
- 5 Pull-ups
- 10 Push-ups
- 15 Squats
```

## LRUCache

Least Recently Used cache for performance optimization.

### Purpose

Caches frequently accessed data to avoid redundant computation:
- Recently used exercises
- Parsed scripts
- Compiled blocks

### Methods

```typescript
class LRUCache<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  clear(): void;
}
```

## HiddenAreasCoordinator

Manages code folding (hidden areas) in Monaco Editor.

### Purpose

- Folds code sections under headings
- Hides inline card content when collapsed
- Coordinates folding with RichMarkdownManager

### Use

```typescript
const coordinator = new HiddenAreasCoordinator(editor, monaco);

// Hide content under heading
coordinator.toggleFold(lineNumber);

// Expand hidden content
coordinator.expandAll();
```

## WodWikiSyntaxInitializer

Initializes Monaco with WOD-specific syntax and features.

### Purpose

Configures Monaco on mount:
- Registers custom language
- Sets up token provider
- Configures suggestion provider
- Registers completion provider

## Editor Hooks

Custom React hooks for editor functionality.

### useMonacoTheme

Applies Monaco theme customization.

**Example:**

```typescript
import { useMonacoTheme } from '@/hooks/editor/useMonacoTheme';

function Editor() {
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);
  
  useMonacoTheme(editorRef.current, 'custom-theme');
  
  return <Editor ref={editorRef} />;
}
```

### useEditorResize

Handles automatic editor resizing.

**Purpose:**
- Adjusts height based on content
- Debounces resize events
- Prevents layout shifts

## Example Integration

### Complete Workout Editor

```typescript
import { WodWiki } from '@/editor/WodWiki';
import { MetricsProvider } from '@/services/MetricsContext';
import { RuntimeProvider } from '@/components/RuntimeProvider';

function WorkoutEditor() {
  const [runtime, setRuntime] = useState(null);
  
  return (
    <RuntimeProvider>
      <MetricsProvider>
        <WodWiki 
          id="main-editor"
          code={initialScript}
          onValueChange={handleScriptChange}
          onMount={(editor) => {
            console.log('Editor ready');
          }}
        />
        {runtime && <WorkoutTimer runtime={runtime} />}
      </MetricsProvider>
    </RuntimeProvider>
  );
}
```

## See Also

- [Parser System](./parser-system.md) - How scripts are parsed
- [Fragment Types](./fragment-types.md) - Highlighted token types
- [Services](./services.md) - Exercise providers and data
