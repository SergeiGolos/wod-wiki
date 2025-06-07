# SoundEvent

**Description**: Event related to sound playback or requests.

**Original Location**: `src/core/runtime/inputs/SoundEvent.ts`

## Properties

*   `sound: string` - The sound identifier or name to play
*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'sound'

## Methods

*   `constructor(sound: string, timestamp?: Date)` - Creates a new SoundEvent with the specified sound and optional timestamp (defaults to current time)

## Associated Handler: SoundHandler

**Description**: Handles sound events by creating audio playback actions.

**Implementation**: `implements EventHandler`

**Properties**:
*   `eventType: string` - Always 'sound'

**Methods**:
*   `apply(event: IRuntimeEvent, runtime: ITimerRuntime, block: IRuntimeBlock): IRuntimeAction[]` - Processes sound events

**Behavior**:
*   Extracts the sound identifier from the SoundEvent
*   Creates a PlaySoundAction with the specified sound
*   Integrates with the SoundService for audio playback

**Generated Actions**:
*   `PlaySoundAction` - Triggers audio playback using the SoundService

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`
*   **Handler**: `SoundHandler implements [[EventHandler]]`