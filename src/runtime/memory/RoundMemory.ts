import { BaseMemoryEntry } from './BaseMemoryEntry';
import { RoundState } from './MemoryTypes';

/**
 * Memory implementation for round/iteration state.
 */
export class RoundMemory extends BaseMemoryEntry<'round', RoundState> {
    constructor(current: number = 1, total?: number) {
        super('round', { current, total });
    }

    /**
     * Advances to the next round.
     */
    next(): void {
        this.update({
            ...this._value,
            current: this._value.current + 1
        });
    }

    /**
     * Sets the current round number.
     */
    setCurrent(current: number): void {
        this.update({
            ...this._value,
            current
        });
    }

    /**
     * Resets the round counter to 1.
     */
    reset(): void {
        this.update({
            ...this._value,
            current: 1
        });
    }
}
