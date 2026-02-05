# SoundFragment

`SoundFragment` represents an audio cue to be played during workout execution. It is used by `SoundCueBehavior` to emit output records that audio systems can observe and process.

## Type Definition

```typescript
type SoundTrigger = 'mount' | 'unmount' | 'countdown' | 'complete';

interface SoundFragmentValue {
    /** Sound identifier or URL */
    readonly sound: string;
    /** Trigger type */
    readonly trigger: SoundTrigger;
    /** For countdown triggers, the second at which this played */
    readonly atSecond?: number;
}

class SoundFragment implements ICodeFragment {
    readonly type: string = 'sound';
    readonly fragmentType = FragmentType.Sound;
    readonly origin: FragmentOrigin;
    readonly value: SoundFragmentValue;
    readonly image: string;
    readonly sound: string;
    readonly trigger: SoundTrigger;
}
```

## Fragment Type

- **Type**: `FragmentType.Sound`
- **Origin**: Typically `'runtime'` (generated during execution)

## Trigger Types

| Trigger | When Emitted | Example |
|---------|--------------|---------|
| `mount` | Block starts executing | Start beep |
| `unmount` | Block finishes executing | General end sound |
| `countdown` | Timer reaches specific second | 3, 2, 1 countdown beeps |
| `complete` | Block completes successfully | Victory chime |

## Design Philosophy

Sound cues follow the principle that **behaviors emit outputs, not events**:

1. `SoundCueBehavior` creates `SoundFragment` instances
2. Emits them via `ctx.emitOutput('milestone', [soundFragment])`
3. Audio systems subscribe to the output stream
4. Filter for `FragmentType.Sound` and play audio

This approach:
- Keeps sound cues in the output history (useful for replay/debugging)
- Follows the "events for external input only" principle
- Allows audio systems to be decoupled from the runtime

## SoundCueBehavior

The primary behavior that creates SoundFragments:

```typescript
new SoundCueBehavior({
    cues: [
        { sound: 'start-beep', trigger: 'mount' },
        { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [3, 2, 1] },
        { sound: 'complete-chime', trigger: 'complete' }
    ]
})
```

### Output Pattern

```typescript
// On mount
ctx.emitOutput('milestone', [
    new SoundFragment('start-beep', 'mount')
], { label: 'Sound: start-beep' });

// On countdown
ctx.emitOutput('milestone', [
    new SoundFragment('countdown-beep', 'countdown', { atSecond: 3 })
], { label: 'Countdown: 3s' });

// On unmount
ctx.emitOutput('milestone', [
    new SoundFragment('complete-chime', 'complete')
], { label: 'Sound: complete-chime' });
```

## Audio System Integration

Audio systems should subscribe to the runtime output stream:

```typescript
// React hook example
function useAudioCues(runtime: IScriptRuntime) {
    useEffect(() => {
        const subscription = runtime.outputs$.subscribe(output => {
            // Find sound fragments in the output
            const soundFragments = output.fragments.filter(
                f => f.fragmentType === FragmentType.Sound
            ) as SoundFragment[];
            
            for (const sf of soundFragments) {
                audioPlayer.play(sf.sound);
            }
        });
        
        return () => subscription.unsubscribe();
    }, [runtime]);
}
```

### Alternative: Direct Observation

```typescript
// Poll outputs from runtime
const outputs = runtime.getOutputs();
const soundOutputs = outputs.filter(o => 
    o.fragments.some(f => f.fragmentType === FragmentType.Sound)
);
```

## WOD Script Syntax (Future)

Sound cues could be specified in WOD syntax:

```markdown
[:5:00 AMRAP]
  [:sound:start-beep]
  10 Push-ups
  [:sound:rep-complete]
```

This would parse into `SoundFragment` with `origin: 'parser'`.

## Usage Examples

### Basic Timer with Sounds

```typescript
const block = new RuntimeBlock('timer-1', {
    behaviors: [
        new TimerInitBehavior({ direction: 'down', durationMs: 60000 }),
        new TimerTickBehavior(),
        new TimerCompletionBehavior(),
        new SoundCueBehavior({
            cues: [
                { sound: 'ready', trigger: 'mount' },
                { sound: 'beep', trigger: 'countdown', atSeconds: [10, 5, 3, 2, 1] },
                { sound: 'horn', trigger: 'complete' }
            ]
        })
    ]
});
```

### AMRAP with Sounds

```typescript
new SoundCueBehavior({
    cues: [
        { sound: 'start-horn', trigger: 'mount' },
        { sound: 'halfway', trigger: 'countdown', atSeconds: [300] }, // 5 min mark
        { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [10, 5, 3, 2, 1] },
        { sound: 'end-horn', trigger: 'complete' }
    ]
})
```

## Testing

```typescript
import { SoundFragment } from '@/runtime/compiler/fragments';

it('should create countdown sound fragment', () => {
    const fragment = new SoundFragment('beep', 'countdown', { atSecond: 3 });
    
    expect(fragment.fragmentType).toBe(FragmentType.Sound);
    expect(fragment.sound).toBe('beep');
    expect(fragment.trigger).toBe('countdown');
    expect(fragment.value.atSecond).toBe(3);
    expect(fragment.image).toBe('beep@3s');
});
```

## Related

- [`SoundCueBehavior`](../behaviors/SoundCueBehavior.ts) - Behavior that emits sound outputs
- [`TimerState`](./TimerState.md) - Timer memory used for countdown calculations
- [`FragmentType`](../../core/models/CodeFragment.ts) - Fragment type enum including `Sound`
