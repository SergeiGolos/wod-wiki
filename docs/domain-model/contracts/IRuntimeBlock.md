# IRuntimeBlock

> Self-contained runtime block with state, events, and lifecycle

## Definition (Option D - Block-Owned Handlers)

```typescript
interface IRuntimeBlock {
  readonly key: BlockKey;
  readonly blockType: string;
  readonly label: string;
  readonly fragments: ICodeFragment[][];
  readonly sourceIds: number[];
  
  // State - typed properties
  readonly timerState?: {
    elapsed: number;
    duration?: number;
    running: boolean;
    direction: 'up' | 'down';
  };
  
  readonly roundState?: {
    current: number;
    total: number | null; // null = unbounded
  };
  
  // Event system - block-owned
  on(event: string, handler: EventHandler): () => void;
  emit(event: string, data?: unknown): void;
  
  // Lifecycle
  mount(): void;
  next(): void;
  unmount(): void;  // Clears all handlers
  dispose(): void;
  
  // Completion
  isComplete(): boolean;
  markComplete(reason?: string): void;
  
  // Behaviors & Fragments
  getBehavior<T>(type: Constructor<T>): T | undefined;
  findFragment<T>(type: FragmentType, predicate?): T | undefined;
  filterFragments<T>(type: FragmentType): T[];
  hasFragment(type: FragmentType): boolean;
}

type EventHandler = (data?: unknown) => void;
```

## Events

| Event | Emitted By | Purpose |
|-------|------------|---------|
| `tick` | Clock/Timer behavior | Time update |
| `stateChange` | Block on mutation | UI re-render |
| `complete` | Block when done | Trigger pop |
| `next` | Stack after child completes | Advance logic |

## UI Binding

```typescript
function TimerDisplay({ block }: { block: IRuntimeBlock }) {
  const [elapsed, setElapsed] = useState(block.timerState?.elapsed ?? 0);
  
  useEffect(() => {
    // Handler auto-cleans when block.unmount() is called
    return block.on('tick', () => {
      setElapsed(block.timerState?.elapsed ?? 0);
    });
  }, [block]);
  
  return <span>{formatTime(elapsed)}</span>;
}
```

## Testing Blocks Directly

```typescript
describe('TimerDisplay', () => {
  it('updates on tick event', () => {
    const block = new TimerBlock(60000);  // No stack needed!
    
    render(<TimerDisplay block={block} />);
    
    block.timerState.elapsed = 5000;
    block.emit('tick');
    
    expect(screen.getByText('00:55')).toBeInTheDocument();
  });
});
```

## Related Files

- [[02-compiler-layer|Compiler Layer]] (producer)
- [[03-runtime-layer|Runtime Layer]] (executor)
- [[05-ui-layer|UI Layer]] (consumer)
