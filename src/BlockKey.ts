/**
 * Interface for code statements referenced by BlockKey
 */

export class BlockKey {
    constructor(private readonly value: string) {}

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
