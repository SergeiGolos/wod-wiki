import { IMemoryReference } from './IMemoryReference';

// Interface for the memory allocator to avoid circular dependency
interface IMemoryAllocator {
    allocate<T>(type: string, ownerId: string, initialValue?: T, parent?: MemoryReference): IMemoryReference<T>;
}

/**
 * Concrete implementation of IMemoryReference that provides controlled access to memory locations.
 */
export class MemoryReference<T = any> implements IMemoryReference<T> {
    private _value: T | undefined;
    private _isValid: boolean = true;
    private _children: Set<MemoryReference> = new Set();
    private _parent?: MemoryReference;

    constructor(
        public readonly id: string,
        public readonly type: string,
        public readonly ownerId: string,
        private readonly memory: IMemoryAllocator,
        initialValue?: T,
        parent?: MemoryReference
    ) {
        this._value = initialValue;
        this._parent = parent;
        if (parent) {
            parent._children.add(this);
        }
    }

    get(): T | undefined {
        if (!this._isValid) {
            return undefined;
        }
        return this._value;
    }

    set(value: T): void {
        if (!this._isValid) {
            throw new Error(`Cannot set value on invalid memory reference ${this.id}`);
        }
        this._value = value;
    }

    isValid(): boolean {
        return this._isValid;
    }

    createChild<C = any>(type: string, initialValue?: C): IMemoryReference<C> {
        if (!this._isValid) {
            throw new Error(`Cannot create child on invalid memory reference ${this.id}`);
        }
        return this.memory.allocate(type, this.ownerId, initialValue, this);
    }

    /** Internal method for cleanup - not part of the public interface */
    _invalidate(): void {
        this._isValid = false;
        this._value = undefined;
        
        // Recursively invalidate all children
        for (const child of this._children) {
            child._invalidate();
        }
        this._children.clear();
        
        // Remove from parent
        if (this._parent) {
            this._parent._children.delete(this);
            this._parent = undefined;
        }
    }

    /** Internal method to get children - not part of the public interface */
    _getChildren(): MemoryReference[] {
        return Array.from(this._children);
    }

    /** Internal method to get parent - not part of the public interface */
    _getParent(): MemoryReference | undefined {
        return this._parent;
    }
}