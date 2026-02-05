# ActionFragment

`ActionFragment` represents a named action or movement in a workout script. It supports pinning for persistent display and preserves the raw input text.

## Type Definition

```typescript
interface ActionFragmentOptions {
  raw?: string;           // Original text after colon
  name?: string;          // Normalized name (without ! pin marker)
  isPinned?: boolean;     // Whether action is pinned
}

class ActionFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Action;
  readonly type: string = "action";
  readonly origin: FragmentOrigin = 'parser';
  
  readonly value: string;           // Normalized action name
  readonly image: string;           // Raw input text
  readonly raw: string;             // Original text (with ! if pinned)
  readonly name: string;            // Normalized name
  readonly isPinned: boolean;       // Pinned for persistent display
  readonly sourceLine?: number;     // Line number from meta
  readonly meta?: CodeMetadata;
}
```

## Fragment Type

- **Type**: `FragmentType.Action`
- **Legacy Type**: `"action"`
- **Origin**: Always `'parser'`

## Constructor

```typescript
constructor(
  action: string,                       // Action name
  meta?: CodeMetadata,                  // Source location
  options: ActionFragmentOptions = {}   // Additional options
)
```

## Pinning Behavior

Actions starting with `!` are pinned and persist in display:

```markdown
[:start]           # Unpinned: name="start"
[:!reset]          # Pinned: name="reset", isPinned=true
```

## WOD Script Syntax

```markdown
[:start]                 # Action trigger
[:!for-time]             # Pinned action (persists in display)
[:rest]                  # Rest action
[:complete]              # Completion marker
```

## Compiler Integration

`ActionFragmentCompiler` converts to `MetricValue`:

```typescript
class ActionFragmentCompiler implements IFragmentCompiler {
  readonly type = 'action';
  
  compile(fragment: ActionFragment): MetricValue[] {
    const label = fragment.value?.toString().trim();
    if (!label) return [];
    return [{
      type: MetricValueType.Action,
      value: undefined,
      unit: `action:${label}`
    }];
  }
}
```

## Usage Examples

### Unpinned Action

```typescript
const action = new ActionFragment('start', { line: 1, column: 1 });

expect(action.name).toBe('start');
expect(action.isPinned).toBe(false);
expect(action.value).toBe('start');
```

### Pinned Action

```typescript
const action = new ActionFragment('!reset', { line: 1, column: 1 }, {
  raw: '!reset',
  isPinned: true,
  name: 'reset'
});

expect(action.name).toBe('reset');
expect(action.isPinned).toBe(true);
expect(action.raw).toBe('!reset');
```

### In Statement Context

```typescript
import { MdTimerRuntime } from './md-timer';

const script = new MdTimerRuntime().read('[:!for-time]');
const action = script.statements[0].fragments
  .find(f => f.fragmentType === FragmentType.Action) as ActionFragment;

expect(action.name).toBe('for-time');
expect(action.isPinned).toBe(true);
```

### Multi-Word Actions

```typescript
const action = new ActionFragment('for time-fast', meta, {
  raw: 'for time-fast'
});

expect(action.name).toBe('for time-fast');
expect(action.isPinned).toBe(false);
```

## Related

- [RepFragment](RepFragment.md) - Rep count paired with action
- [EffortFragment](EffortFragment.md) - Effort level for action
- [TextFragment](TextFragment.md) - Display text alternative
