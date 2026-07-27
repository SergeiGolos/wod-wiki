/**
 * Interface for code statements referenced by BlockKey
 */

import { v7 as uuidv7 } from 'uuid';

export class BlockKey {
    // TODO: make value optional, and if no value is passed, it should
    // generates a new unique ID (e.g., UUID or incrementing number)
    constructor(public readonly value: string = uuidv7()) {}

    toString(): string {
        return this.value;
    }

    valueOf(): string {
        return this.value;
    }

    equals(other: BlockKey): boolean {
        return this.value === other.value;
    }
}
