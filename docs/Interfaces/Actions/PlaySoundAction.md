# PlaySoundAction

**Description**: Action to trigger playing a sound effect.

**Original Location**: `src/core/runtime/actions/PlaySoundAction.ts`

## Properties

*   `name: string` - Action name, always 'play-sound'
*   `soundType: string` - The type of sound to play (private)

## Methods

*   `constructor(soundType: string)` - Creates a new PlaySoundAction with the specified sound type
*   `apply(runtime: ITimerRuntime, input: Subject<IRuntimeEvent>, output: Subject<OutputEvent>): void` - Plays the sound using SoundService if sound is enabled

## Relationships
*   **Implements**: `[[IRuntimeAction]]`