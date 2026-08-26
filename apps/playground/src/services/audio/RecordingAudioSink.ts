import type { IAudioSink } from './IAudioSink';
import type { NoteDef } from './AudioPolicy';

export interface RecordedCall {
  notes: NoteDef[];
  volume: number;
}

export class RecordingAudioSink implements IAudioSink {
  readonly calls: RecordedCall[] = [];

  playNotes(notes: readonly NoteDef[], volume: number): void {
    this.calls.push({ notes: [...notes], volume });
  }

  get callCount(): number {
    return this.calls.length;
  }

  lastCall(): RecordedCall | undefined {
    return this.calls[this.calls.length - 1];
  }

  clear(): void {
    this.calls.length = 0;
  }
}
