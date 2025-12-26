
// Basic beep sounds synthesis using Web Audio API

/**
 * Service for playing synthesized audio feedback.
 * Uses Web Audio API to generate beeps and boops without external assets.
 */
export class AudioService {
    private context: AudioContext | null = null;
    private enabled: boolean = false;
    private masterGain: GainNode | null = null;

    constructor() {
        // Initialize enabled state from localStorage if available
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('wod-wiki-audio-enabled');
                this.enabled = stored === 'true';
            } catch (e) {
                console.warn('Failed to read audio preference from localStorage:', e);
                this.enabled = false;
            }
        }
    }

    /**
     * Initialize AudioContext on user interaction
     */
    private initContext() {
        // Safari still uses webkitAudioContext prefix
        const windowWithWebkit = window as Window & { webkitAudioContext?: typeof AudioContext };
        if (!this.context && typeof window !== 'undefined') {
            const AudioContextClass = window.AudioContext ?? windowWithWebkit.webkitAudioContext;
            if (AudioContextClass) {
                this.context = new AudioContextClass();
                this.masterGain = this.context.createGain();
                this.masterGain.connect(this.context.destination);
            }
        }
    }

    /**
     * Enable or disable audio
     */
    setEnabled(enabled: boolean) {
        this.enabled = enabled;
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('wod-wiki-audio-enabled', String(enabled));
            } catch (e) {
                console.warn('Failed to save audio preference to localStorage:', e);
            }
        }

        // Resume context if enabling
        if (enabled && this.context?.state === 'suspended') {
            this.context.resume();
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Play a sound based on its name.
     *
     * @param name - Sound name to play. Supported values: 'beep', 'tick', 'buzzer',
     *               'chime', 'complete', 'start'. Falls back to a default beep for
     *               unknown names.
     * @param volume - Volume level (0.0 to 1.0, default: 1.0)
     * @returns Promise that resolves when the sound starts playing
     */
    async playSound(name: string, volume: number = 1.0) {
        if (!this.enabled) return;

        // Validate volume parameter
        if (volume < 0 || volume > 1.0) {
            console.warn(`Invalid volume ${volume}, clamping to range [0, 1]`);
            volume = Math.max(0, Math.min(1.0, volume));
        }

        // Initialize context if needed (must happen after user interaction usually)
        if (!this.context) {
            this.initContext();
        }

        if (!this.context || !this.masterGain) return;

        // Ensure context is running
        if (this.context.state === 'suspended') {
            await this.context.resume();
        }

        const now = this.context.currentTime;

        switch (name) {
            case 'beep':
            case 'tick': {
                // Short high pitch beep
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, now); // A5
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            }

            case 'buzzer': {
                // Long lower pitch buzz
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.linearRampToValueAtTime(100, now + 0.5);
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.linearRampToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;
            }

            case 'chime':
            case 'complete':
                // Pleasant major chord arpeggio
                this.playNote(now, 523.25, 'sine', 0.5, volume); // C5
                this.playNote(now + 0.1, 659.25, 'sine', 0.5, volume); // E5
                this.playNote(now + 0.2, 783.99, 'sine', 0.5, volume); // G5
                break;

            case 'start':
                // Ascending sequence
                this.playNote(now, 440, 'square', 0.1, volume); // A4
                this.playNote(now + 0.15, 880, 'square', 0.3, volume); // A5
                break;

            default: {
                // Fallback beep
                const oscillator = this.context.createOscillator();
                const gainNode = this.context.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(this.masterGain);
                
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(440, now);
                gainNode.gain.setValueAtTime(volume, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                oscillator.start(now);
                oscillator.stop(now + 0.1);
                break;
            }
        }
    }

    private playNote(startTime: number, freq: number, type: OscillatorType, duration: number, volume: number) {
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

export const audioService = new AudioService();
