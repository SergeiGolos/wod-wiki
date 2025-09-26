/**
 * A reference to a memory location that can be passed between components.
 * This allows processes to reference memory without directly coupling to it.
 */

import { IRuntimeMemory } from "./IRuntimeMemory";

export interface IMemoryReference {
    readonly id: string;
    readonly ownerId: string;
    readonly type: string;
    readonly visibility: 'public' | 'private';
}

export class TypedMemoryReference<T>  implements IMemoryReference {    
    public readonly id: string = crypto.randomUUID();

    constructor(
        private readonly _memory: IRuntimeMemory,
        public readonly ownerId: string,
        public readonly type: string,
        public visibility: "public" | "private" = 'private',

    ) {
    }
            
    get(): T | undefined {
        return this._memory.get<T>(this)
    }

    set(value: T): void {
        this._memory.set<T>(this, value);
    }
}