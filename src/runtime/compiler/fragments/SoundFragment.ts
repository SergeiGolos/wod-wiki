import { ICodeFragment, FragmentType, FragmentOrigin } from "../../../core/models/CodeFragment";
import { CodeMetadata } from "../../../core/models/CodeMetadata";
import { MetricBehavior } from "../../../types/MetricBehavior";

/**
 * Trigger types for when a sound should play.
 */
export type SoundTrigger = 'mount' | 'unmount' | 'countdown' | 'complete';

/**
 * SoundFragment represents an audio cue to be played during workout execution.
 * 
 * Used by SoundCueBehavior to emit output records that audio systems can process.
 * 
 * @example
 * ```typescript
 * // A countdown beep at 3 seconds remaining
 * new SoundFragment('countdown-beep', 'countdown', { atSecond: 3 })
 * 
 * // A completion chime
 * new SoundFragment('complete-chime', 'complete')
 * ```
 */
export class SoundFragment implements ICodeFragment {
    readonly type: string = 'sound';
    readonly fragmentType = FragmentType.Sound;
    readonly origin: FragmentOrigin;
    readonly value: SoundFragmentValue;
    readonly image: string;
    readonly meta?: CodeMetadata;
    readonly behavior: MetricBehavior = MetricBehavior.Recorded;

    constructor(
        /** Sound identifier or URL */
        public readonly sound: string,
        /** When this sound was triggered */
        public readonly trigger: SoundTrigger,
        /** Additional options */
        options: {
            /** For countdown triggers, the second at which this played */
            atSecond?: number;
            /** Origin of this fragment */
            origin?: FragmentOrigin;
            /** Source metadata */
            meta?: CodeMetadata;
        } = {}
    ) {
        this.origin = options.origin ?? 'runtime';
        this.value = {
            sound,
            trigger,
            atSecond: options.atSecond
        };
        this.image = options.atSecond !== undefined 
            ? `${sound}@${options.atSecond}s` 
            : sound;
        // Preserve source metadata if provided
        this.meta = options.meta;
    }
}

/**
 * Value structure for SoundFragment
 */
export interface SoundFragmentValue {
    /** Sound identifier or URL */
    readonly sound: string;
    /** Trigger type */
    readonly trigger: SoundTrigger;
    /** For countdown triggers, the second at which this played */
    readonly atSecond?: number;
}
