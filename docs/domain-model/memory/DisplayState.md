# DisplayState Memory

The `display` memory type stores UI-facing presentation state for blocks.

## Type Definition

```typescript
interface DisplayState {
    /** Current display mode */
    readonly mode: 'clock' | 'timer' | 'countdown' | 'hidden';
    
    /** Primary label */
    readonly label: string;
    
    /** Secondary/subtitle label */
    readonly subtitle?: string;
    
    /** Formatted round string (e.g., "Round 2/5") */
    readonly roundDisplay?: string;
    
    /** Exercise/action being performed */
    readonly actionDisplay?: string;
}
```

## Memory Key

- **Key**: `'display'`
- **Value Type**: `DisplayState`

## Display Modes

| Mode | Description | UI Treatment |
|------|-------------|--------------|
| `clock` | Wall clock display | Shows current time |
| `timer` | Count-up stopwatch | Shows elapsed time |
| `countdown` | Count-down timer | Shows remaining time |
| `hidden` | No time display | Hides timer UI |

## Behaviors That Write Display Memory

### DisplayInitBehavior

**Lifecycle**: `onMount`

Initializes display state when a block is mounted.

```typescript
ctx.setMemory('display', {
    mode: config.mode ?? 'clock',
    label: config.label ?? ctx.block.label,
    subtitle: config.subtitle,
    roundDisplay: undefined,
    actionDisplay: config.actionDisplay
});
```

**Configuration**:
```typescript
interface DisplayInitConfig {
    mode?: 'clock' | 'timer' | 'countdown' | 'hidden';
    label?: string;
    subtitle?: string;
    actionDisplay?: string;
}
```

### RoundDisplayBehavior

**Lifecycle**: `onMount`, `onNext`

Updates the `roundDisplay` field when round state changes.

```typescript
const round = ctx.getMemory('round');
const display = ctx.getMemory('display');

const roundDisplay = round.total !== undefined
    ? `Round ${round.current} of ${round.total}`
    : `Round ${round.current}`;

ctx.setMemory('display', { ...display, roundDisplay });
```

## Behaviors That Read Display Memory

### RoundDisplayBehavior

Reads existing display state to preserve other fields when updating `roundDisplay`.

## UI Integration

The display memory is designed for reactive UI consumption:

```typescript
// React hook example
function useBlockDisplay(blockId: string) {
    const display = useBlockMemory<DisplayState>(blockId, 'display');
    
    return {
        mode: display?.mode ?? 'clock',
        label: display?.label ?? '',
        roundDisplay: display?.roundDisplay,
        subtitle: display?.subtitle,
        action: display?.actionDisplay
    };
}
```

## Usage Example

```typescript
// Create a block with countdown display
const block = new RuntimeBlock('workout-1', {
    behaviors: [
        new DisplayInitBehavior({
            mode: 'countdown',
            label: 'AMRAP',
            subtitle: '20 minutes',
            actionDisplay: 'As Many Rounds As Possible'
        }),
        new RoundInitBehavior({ totalRounds: undefined }),
        new RoundDisplayBehavior()
    ]
});
```

## Display Composition

Display state is typically composed from multiple sources:

| Field | Source | Update Trigger |
|-------|--------|----------------|
| `mode` | `DisplayInitBehavior` | Mount |
| `label` | `DisplayInitBehavior` | Mount |
| `subtitle` | `DisplayInitBehavior` | Mount |
| `roundDisplay` | `RoundDisplayBehavior` | Mount, Next |
| `actionDisplay` | `DisplayInitBehavior` | Mount |

## Related Memory Types

- [`TimerState`](TimerState.md) - Timer data that informs display mode
- [`RoundState`](RoundState.md) - Round data that populates `roundDisplay`
