import type { IAudioSink } from './IAudioSink';
import type { NoteDef } from './AudioPolicy';

export class WebAudioSink implements IAudioSink {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  init(): void {
    if (this.context) return;
    const windowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext ?? windowWithWebkit.webkitAudioContext;
    if (AudioContextClass) {
      this.context = new AudioContextClass();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
    }
  }

  async playNotes(notes: readonly NoteDef[], volume: number): Promise<void> {
    if (!this.context) this.init();
    if (!this.context || !this.masterGain) return;

    if (this.context.state === 'suspended') {
      await this.context.resume().catch(() => {});
    }
    if (this.context.state !== 'running') return;

    const now = this.context.currentTime;
    for (const note of notes) {
      this.playNote(now + (note.offset ?? 0), note.freq, note.type, note.duration, volume);
    }
  }

  private playNote(startTime: number, freq: number, type: OscillatorType, duration: number, volume: number): void {
    if (!this.context || !this.masterGain) return;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    gain.gain.setValueAtTime(volume * 0.5, startTime);
    gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
