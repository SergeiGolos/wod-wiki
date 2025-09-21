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
    constructor(
        public readonly id: string,
        public readonly ownerId: string,
        public readonly type: string
    ) {
        this.visibility = 'private';    
    }
        
    visibility: "public" | "private";
    
    get(memory : IRuntimeMemory): T | undefined {
        return memory.get<T>(this)
    }

}