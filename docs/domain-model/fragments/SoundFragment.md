# SoundFragment

`SoundFragment` represents an audio cue to be played during workout execution. It is used by `SoundCueBehavior` to emit output records that audio systems can observe and process.

## Type Definition

```typescript
type SoundTrigger = 'mount' | 'unmount' | 'countdown' | 'complete';

interface SoundFragmentValue {
  readonly sound: string;           // Sound identifier or URL
  readonly trigger: SoundTrigger;   // Trigger type
  readonly atSecond?: number;       // For countdown triggers
}

class SoundFragment implements ICodeFragment {
  readonly fragmentType = FragmentType.Sound;
  readonly type: string = 'sound';
  readonly origin: FragmentOrigin;
  
  readonly value: SoundFragmentValue;
  readonly image: string;           // Display string
  readonly sound: string;           // Sound identifier
  readonly trigger: SoundTrigger;   // When to play
}
```

## Fragment Type

- **Type**: `FragmentType.Sound`
- **Legacy Type**: `"sound"`
- **Origin**: Typically `'runtime'` (generated during execution)

## Constructor

```typescript
constructor(
  sound: string,                    // Sound identifier or URL
  trigger: SoundTrigger,            // When to play
  options?: {
    atSecond?: number;              // For countdown triggers
    origin?: FragmentOrigin;        // Override default origin
    meta?: CodeMetadata;            // Source metadata
  }
)
```

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

## SoundCueBehavior Integration

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

// On complete
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

### Countdown Sound

```typescript
const fragment = new SoundFragment('beep', 'countdown', { atSecond: 3 });

expect(fragment.fragmentType).toBe(FragmentType.Sound);
expect(fragment.sound).toBe('beep');
expect(fragment.trigger).toBe('countdown');
expect(fragment.value.atSecond).toBe(3);
expect(fragment.image).toBe('beep@3s');
```

### Mount Sound

```typescript
const fragment = new SoundFragment('start-horn', 'mount');

expect(fragment.trigger).toBe('mount');
expect(fragment.image).toBe('start-horn');
expect(fragment.origin).toBe('runtime');
```

### AMRAP with Sounds

```typescript
new SoundCueBehavior({
  cues: [
    { sound: 'start-horn', trigger: 'mount' },
    { sound: 'halfway', trigger: 'countdown', atSeconds: [300] },
    { sound: 'countdown-beep', trigger: 'countdown', atSeconds: [10, 5, 3, 2, 1] },
    { sound: 'end-horn', trigger: 'complete' }
  ]
})
```

## Related

- [TimerFragment](TimerFragment.md) - Timer that triggers countdown sounds
- [TimerState Memory](../memory/TimerState.md) - Timer state for countdown calculations
- [IRuntimeBehavior Contract](../contracts/IRuntimeBehavior.md) - Behavior interface
