/**
 * Interface for code statements referenced by BlockKey
 */

import { v4 as uuidv4 } from 'uuid';

export class BlockKey {
    constructor(public readonly value: string = uuidv4()) {}

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
