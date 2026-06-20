import { describe, it, expect } from 'bun:test';
import { RecordingAudioSink } from './RecordingAudioSink';
import { getSoundDef } from './AudioPolicy';

describe('RecordingAudioSink', () => {
    it('records a single playNotes call', () => {
        const sink = new RecordingAudioSink();
        const def = getSoundDef('beep')!;
        sink.playNotes(def.notes, 0.8);
        expect(sink.callCount).toBe(1);
        expect(sink.lastCall()!.volume).toBe(0.8);
        expect(sink.lastCall()!.notes).toHaveLength(1);
        expect(sink.lastCall()!.notes[0].freq).toBe(880);
    });

    it('records multiple calls in order', () => {
        const sink = new RecordingAudioSink();
        sink.playNotes([{ freq: 100, type: 'sine', duration: 0.1 }], 0.5);
        sink.playNotes([{ freq: 200, type: 'square', duration: 0.2 }], 0.7);
        expect(sink.callCount).toBe(2);
        expect(sink.calls[0].notes[0].freq).toBe(100);
        expect(sink.calls[1].notes[0].freq).toBe(200);
    });

    it('returns undefined from lastCall when empty', () => {
        const sink = new RecordingAudioSink();
        expect(sink.lastCall()).toBeUndefined();
    });

    it('respects volume parameter', () => {
        const sink = new RecordingAudioSink();
        sink.playNotes([{ freq: 100, type: 'sine', duration: 0.1 }], 0.3);
        sink.playNotes([{ freq: 200, type: 'square', duration: 0.2 }], 0.9);
        expect(sink.calls[0].volume).toBe(0.3);
        expect(sink.calls[1].volume).toBe(0.9);
    });

    it('clears all recordings', () => {
        const sink = new RecordingAudioSink();
        sink.playNotes([{ freq: 100, type: 'sine', duration: 0.1 }], 1.0);
        sink.clear();
        expect(sink.callCount).toBe(0);
        expect(sink.lastCall()).toBeUndefined();
    });
});
