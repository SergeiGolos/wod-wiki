export interface IBlockKey {
  readonly value: string;
  toString(): string;
  valueOf(): string;
  equals(other: IBlockKey): boolean;
}

export class BlockKey implements IBlockKey {
  readonly value: string;

  constructor(value?: string) {
    this.value =
      value ??
      (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2));
  }

  toString(): string {
    return this.value;
  }

  valueOf(): string {
    return this.value;
  }

  equals(other: IBlockKey): boolean {
    return this.value === other?.value;
  }
}
