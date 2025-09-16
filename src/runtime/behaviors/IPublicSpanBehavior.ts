import type { IMemoryReference } from '../memory';
import { IResultSpanBuilder } from '../ResultSpanBuilder';

/**
 * Create a public span reference that children can append to or read.
 * Ensure children have read-only or constrained access; consider exposing only an identifier 
 * and route mutations through parent handlers.
 */
export interface IPublicSpanBehavior {
    /**
     * Memory allocations:
     * - span-root (public): IResultSpanBuilder | SpanId — a stable handle/address for span aggregation
     */
    
    /**
     * Create a public span reference for child access
     */
    createPublicSpan(): IResultSpanBuilder;
    
    /**
     * Get the public span reference that children can access
     */
    getPublicSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined;
}