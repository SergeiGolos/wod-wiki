export interface NoteDef {
  freq: number;
  type: OscillatorType;
  duration: number; // seconds
  offset?: number; // delay from start in seconds (default 0)
}

export interface SoundDef {
  notes: NoteDef[];
}

const SOUNDS: Record<string, SoundDef> = {
  beep: {
    notes: [{ freq: 880, type: 'sine', duration: 0.1 }],
  },
  tick: {
    notes: [{ freq: 880, type: 'sine', duration: 0.1 }],
  },
  click: {
    notes: [{ freq: 1400, type: 'sine', duration: 0.1 }],
  },
  buzzer: {
    notes: [{ freq: 150, type: 'sawtooth', duration: 0.5 }],
  },
  chime: {
    notes: [
      { freq: 523.25, type: 'sine', duration: 0.5, offset: 0 },
      { freq: 659.25, type: 'sine', duration: 0.5, offset: 0.1 },
      { freq: 783.99, type: 'sine', duration: 0.5, offset: 0.2 },
    ],
  },
  complete: {
    notes: [
      { freq: 523.25, type: 'sine', duration: 0.5, offset: 0 },
      { freq: 659.25, type: 'sine', duration: 0.5, offset: 0.1 },
      { freq: 783.99, type: 'sine', duration: 0.5, offset: 0.2 },
    ],
  },
  select: {
    notes: [
      { freq: 880, type: 'sine', duration: 0.08, offset: 0 },
      { freq: 1200, type: 'sine', duration: 0.12, offset: 0.08 },
    ],
  },
  start: {
    notes: [
      { freq: 440, type: 'square', duration: 0.1, offset: 0 },
      { freq: 880, type: 'square', duration: 0.3, offset: 0.15 },
    ],
  },
};

export function getSoundDef(name: string): SoundDef | undefined {
  return SOUNDS[name];
}

export function hasSound(name: string): boolean {
  return name in SOUNDS;
}

export const SOUND_NAMES = Object.freeze(Object.keys(SOUNDS));
