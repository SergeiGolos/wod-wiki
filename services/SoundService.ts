/**
 * Service for managing workout sounds using Web Audio API
 */
export class SoundService {
  private static instance: SoundService;
  private enabled: boolean = false;
  private audioContext: AudioContext | null = null;

  // Sound configurations
  private soundConfigs = {
    start: { frequency: 880, duration: 0.15, type: 'triangle' as OscillatorType, pattern: [0, 0.2, 0.4] },
    complete: { frequency: 660, duration: 0.2, type: 'sine' as OscillatorType, pattern: [0, 0.2, 0.4, 0.6] },
    countdown: { frequency: 440, duration: 0.1, type: 'sine' as OscillatorType, pattern: [0] },
    tick: { frequency: 220, duration: 0.05, type: 'sine' as OscillatorType, pattern: [0] }
  };

  private constructor() {
    // Private constructor for singleton pattern
    this.initAudioContext();
  }

  /**
   * Get the singleton instance of SoundService
   */
  public static getInstance(): SoundService {
    if (!SoundService.instance) {
      SoundService.instance = new SoundService();
    }
    return SoundService.instance;
  }

  /**
   * Initialize the Audio Context
   */
  private initAudioContext(): void {
    // Create audio context only when needed (on first sound play)
    // This helps with autoplay policies in browsers
  }

  /**
   * Enable or disable sounds
   */
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get current enabled state
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate a beep sound with the Web Audio API
   */
  private generateBeep(frequency: number, duration: number, type: OscillatorType, volume: number = 0.5): void {
    if (!this.audioContext) {
      // Create audio context on first use (to handle browser autoplay policies)
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    if (!this.audioContext) {
      console.error('Web Audio API not supported in this browser');
      return;
    }

    try {
      // Create oscillator
      const oscillator = this.audioContext.createOscillator();
      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Create gain node for volume control
      const gainNode = this.audioContext.createGain();
      gainNode.gain.value = volume;

      // Connect nodes
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Start and stop the oscillator
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);

      // Smooth fade out to avoid clicks
      gainNode.gain.exponentialRampToValueAtTime(
        0.001, this.audioContext.currentTime + duration
      );
    } catch (err) {
      console.error('Error generating beep sound:', err);
    }
  }

  /**
   * Play a sequence of beeps based on pattern
   */
  private playBeepPattern(config: { frequency: number, duration: number, type: OscillatorType, pattern: number[] }): void {
    config.pattern.forEach((delay, index) => {
      setTimeout(() => {
        this.generateBeep(
          // Slightly increase pitch for successive beeps in a pattern
          config.frequency * (1 + index * 0.05),
          config.duration,
          config.type
        );
      }, delay * 1000);
    });
  }

  /**
   * Play a sound by type
   */
  public play(soundType: string): void {
    if (!this.enabled) return;
    
    const config = this.soundConfigs[soundType as keyof typeof this.soundConfigs];
    if (config) {
      this.playBeepPattern(config);
    }
  }
}
