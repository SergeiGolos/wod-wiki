/**
 * AudioService — thin orchestrator for audio feedback.
 *
 * Policy (what sound for what cue) lives in AudioPolicy.
 * I/O (synthesis via Web Audio API) lives in WebAudioSink.
 * This class wires them together and manages enabled/disabled state.
 */

import { getSoundDef } from './audio/AudioPolicy';
import type { IAudioSink } from './audio/IAudioSink';
import { WebAudioSink } from './audio/WebAudioSink';

export class AudioService {
  private enabled: boolean;
  private sink: IAudioSink;

  constructor(sink?: IAudioSink, enabled?: boolean) {
    this.sink = sink ?? new WebAudioSink();
    // Initialize enabled state from localStorage if available
    if (enabled !== undefined) {
      this.enabled = enabled;
    } else if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('wod-wiki-audio-enabled');
        this.enabled = stored !== null ? stored === 'true' : true;
      } catch {
        this.enabled = true;
      }
    } else {
      this.enabled = true;
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wod-wiki-audio-enabled', String(enabled));
      } catch {}
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async playSound(name: string, volume: number = 1.0): Promise<void> {
    if (!this.enabled) return;

    const def = getSoundDef(name);
    if (!def) {
      // Fallback: play a default beep
      const fallback = getSoundDef('beep');
      if (fallback) {
        await this.sink.playNotes(fallback.notes, volume);
      }
      return;
    }

    // Initialize sink if it supports init (WebAudioSink does)
    if ('init' in this.sink && typeof this.sink.init === 'function') {
      this.sink.init();
    }

    await this.sink.playNotes(def.notes, volume);
  }
}

/**
 * Default singleton for backward compatibility.
 * Uses WebAudioSink (production audio output).
 */
export const audioService = new AudioService();
