# ButtonsState Memory

The `controls` memory type stores UI button configurations that the user can interact with.

## Type Definition

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonConfig {
    /** Unique button identifier */
    readonly id: string;
    
    /** Display label */
    readonly label: string;
    
    /** Button style variant */
    readonly variant: ButtonVariant;
    
    /** Whether button is currently visible */
    readonly visible: boolean;
    
    /** Whether button is enabled (clickable) */
    readonly enabled: boolean;
    
    /** 
     * Event name to emit when clicked.
     * Examples: 'timer:pause', 'block:next', 'workout:stop'
     */
    readonly eventName?: string;
    
    /** 
     * Whether this button is pinned (always visible).
     * Derived from `[:!action]` syntax in WOD scripts.
     */
    readonly isPinned?: boolean;
}

interface ButtonsState {
    /** Current button configurations */
    readonly buttons: readonly ButtonConfig[];
}
```

## Memory Key

- **Key**: `'controls'`
- **Value Type**: `ButtonsState`

## Design Philosophy

Controls memory follows the principle that **events are for external input only**:

- Internal behaviors **write** to controls memory
- UI **reads** controls memory and renders buttons
- When user clicks a button, UI **emits** the button's `eventName` as an external event
- Behaviors **subscribe** to those external events

This creates a clean separation:
```
Behaviors → [write] → Controls Memory → [read] → UI → [user click] → Event → [subscribe] → Behaviors
```

## Behaviors That Write Controls Memory

### ButtonBehavior

**Lifecycle**: `onMount`, `onUnmount`

Initializes button configurations when a block is mounted.

```typescript
// On mount - set buttons
ctx.setMemory('controls', {
    buttons: config.buttons
});

// On unmount - clear buttons (signals UI to remove)
ctx.setMemory('controls', {
    buttons: []
});
```

**Configuration**:
```typescript
interface ControlsConfig {
    buttons: ButtonConfig[];
}
```

### Static Helper: updateButton

Update a specific button's state dynamically:

```typescript
ButtonBehavior.updateButton(ctx, 'pause', { 
    label: 'Resume',
    enabled: false 
});
```

## UI Integration

### Reading Controls Memory

```typescript
// React hook example
function useBlockControls(blockId: string) {
    const controls = useBlockMemory<ButtonsState>(blockId, 'controls');
    return controls?.buttons ?? [];
}
```

### Rendering Buttons

```tsx
function ControlButtons({ blockId }: { blockId: string }) {
    const buttons = useBlockControls(blockId);
    const { emitEvent } = useRuntime();
    
    return (
        <div className="controls">
            {buttons.filter(b => b.visible).map(button => (
                <button
                    key={button.id}
                    disabled={!button.enabled}
                    className={`btn-${button.variant}`}
                    onClick={() => button.eventName && emitEvent({
                        name: button.eventName,
                        timestamp: new Date(),
                        data: { buttonId: button.id }
                    })}
                >
                    {button.label}
                </button>
            ))}
        </div>
    );
}
```

### Handling Button Events

Behaviors subscribe to button events:

```typescript
// TimerPauseBehavior subscribes to pause/resume
ctx.subscribe('timer:pause', (event, ctx) => {
    // Handle pause
});

ctx.subscribe('timer:resume', (event, ctx) => {
    // Handle resume
});
```

## ActionFragment Integration

Action fragments from WOD scripts can generate buttons:

| Syntax | Fragment | Button |
|--------|----------|--------|
| `[:Next]` | `ActionFragment('Next')` | `{ id: 'next', label: 'Next', eventName: 'block:next' }` |
| `[:!Pause]` | `ActionFragment('Pause', { isPinned: true })` | `{ id: 'pause', label: 'Pause', isPinned: true, eventName: 'timer:pause' }` |
| `[:Stop]` | `ActionFragment('Stop')` | `{ id: 'stop', label: 'Stop', variant: 'danger', eventName: 'workout:stop' }` |

The `!` prefix in `[:!action]` marks the button as pinned (always visible).

## Standard Button Events

| Event Name | Purpose | Common Button |
|------------|---------|---------------|
| `timer:pause` | Pause the current timer | Pause |
| `timer:resume` | Resume a paused timer | Resume |
| `block:next` | Advance to next block/round | Next |
| `workout:stop` | Stop the entire workout | Stop |
| `user:skip` | Skip current exercise | Skip |

## Usage Example

```typescript
// Create a block with control buttons
const block = new RuntimeBlock('workout-1', {
    behaviors: [
        new ButtonBehavior({
            buttons: [
                { 
                    id: 'pause', 
                    label: 'Pause', 
                    variant: 'secondary', 
                    visible: true, 
                    enabled: true, 
                    eventName: 'timer:pause' 
                },
                { 
                    id: 'next', 
                    label: 'Next', 
                    variant: 'primary', 
                    visible: true, 
                    enabled: true, 
                    eventName: 'block:next' 
                },
                { 
                    id: 'stop', 
                    label: 'Stop', 
                    variant: 'danger', 
                    visible: true, 
                    enabled: true, 
                    eventName: 'workout:stop' 
                }
            ]
        }),
        new TimerPauseBehavior() // Subscribes to timer:pause/resume
    ]
});
```

## Button Variants

| Variant | Usage | Typical Style |
|---------|-------|---------------|
| `primary` | Main action (Next, Start) | Bold, prominent color |
| `secondary` | Supporting action (Pause) | Subtle, neutral |
| `danger` | Destructive action (Stop) | Red, warning color |
| `ghost` | Minimal action | Borderless, text-only |

## Related Memory Types

- [`TimerState`](TimerState.md) - Timer that pause/resume buttons control
- [`DisplayState`](DisplayState.md) - Display labels shown alongside controls
