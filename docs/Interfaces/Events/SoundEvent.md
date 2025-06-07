# SoundEvent

**Description**: Event related to sound playback or requests.

**Original Location**: `src/core/runtime/inputs/SoundEvent.ts`

## Properties

*   `sound: string` - The sound identifier or name to play
*   `timestamp: Date` - The timestamp when the event was created
*   `name: string` - Event name, always 'sound'

## Methods

*   `constructor(sound: string, timestamp?: Date)` - Creates a new SoundEvent with the specified sound and optional timestamp (defaults to current time)

## Relationships
*   **Implements**: `[[IRuntimeEvent]]`