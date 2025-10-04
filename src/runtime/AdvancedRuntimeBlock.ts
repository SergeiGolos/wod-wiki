/**
 * AdvancedRuntimeBlock
 * 
 * Enhanced runtime block with proper advancement tracking and lazy child compilation.
 * Implements the IAdvancedRuntimeBlock contract for just-in-time block creation.
 */

import { BlockKey } from '../BlockKey';
import { CodeStatement } from '../CodeStatement';
import { IRuntimeBlock } from './IRuntimeBlock';
import { IRuntimeAction } from './IRuntimeAction';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeBlock } from './RuntimeBlock';
import { NextAction } from './NextAction';

/**
 * Enhanced runtime block supporting lazy child compilation and proper advancement.
 */
export class AdvancedRuntimeBlock extends RuntimeBlock {
    private _currentChildIndex: number = 0;
    private _children: CodeStatement[];
    private _parentContext: IRuntimeBlock | undefined;
    private _isComplete: boolean = false;

    /**
     * Current index in children array for sequential advancement.
     */
    public get currentChildIndex(): number {
        return this._currentChildIndex;
    }

    /**
     * Uncompiled child statements for lazy JIT compilation.
     */
    public get children(): CodeStatement[] {
        return this._children;
    }

    /**
     * Reference to parent block for stack unwinding.
     */
    public get parentContext(): IRuntimeBlock | undefined {
        return this._parentContext;
    }

    /**
     * Indicates whether all children have been processed.
     */
    public get isComplete(): boolean {
        return this._isComplete;
    }

    constructor(
        runtime: IScriptRuntime,
        sourceId: number[],
        children: CodeStatement[] = [],
        parentContext?: IRuntimeBlock
    ) {
        super(runtime, sourceId);
        this._children = children;
        this._parentContext = parentContext;
        this._isComplete = children.length === 0;
        
        console.log(`🔧 AdvancedRuntimeBlock created: ${this.key.toString()}`);
        console.log(`  📊 Children count: ${children.length}`);
        console.log(`  🎯 Is leaf block: ${this._isComplete}`);
    }

    /**
     * Called when this block is pushed onto the runtime stack.
     */
    public push(): IRuntimeAction[] {
        console.log(`⬆️  AdvancedRuntimeBlock.push(): ${this.key.toString()}`);
        return super.push();
    }

    /**
     * Called to advance to the next child or sibling.
     * Lazily compiles child at currentChildIndex using JIT compiler.
     */
    public next(): IRuntimeAction[] {
        console.log(`➡️  AdvancedRuntimeBlock.next(): ${this.key.toString()}`);
        console.log(`  📍 Current child index: ${this._currentChildIndex}/${this._children.length}`);
        
        // Check if there are more children to process
        if (this._currentChildIndex >= this._children.length) {
            console.log(`  ✅ All children processed, marking complete`);
            this._isComplete = true;
            return [];
        }

        // Get the next child statement
        const childStatement = this._children[this._currentChildIndex];
        const childId = typeof childStatement.id === 'number' ? childStatement.id : (Array.isArray(childStatement.id) ? childStatement.id.join(',') : String(childStatement.id));
        console.log(`  🔨 Compiling child ${this._currentChildIndex}: statement [${childId}]`);

        // Increment index for next call
        this._currentChildIndex++;

        // Compile the child using JIT compiler (lazy compilation)
        try {
            const compiledBlock = this._runtime.jit.compile([childStatement], this._runtime);
            
            if (!compiledBlock) {
                console.error(`  ❌ JIT compiler returned undefined for child ${this._currentChildIndex}`);
                this._isComplete = true;
                return [];
            }
            
            console.log(`  ✅ Child compiled: ${compiledBlock.key.toString()}`);

            // Return NextAction to push the compiled child onto the stack
            return [new NextAction(compiledBlock)];
        } catch (error) {
            console.error(`  ❌ Failed to compile child:`, error);
            throw error;
        }
    }

    /**
     * Called when this block is popped from the runtime stack.
     */
    public pop(): IRuntimeAction[] {
        console.log(`⬇️  AdvancedRuntimeBlock.pop(): ${this.key.toString()}`);
        return super.pop();
    }

    /**
     * Cleans up resources held by this block.
     * Must be called by consumer after popping from stack.
     */
    public dispose(): void {
        console.log(`🗑️  AdvancedRuntimeBlock.dispose(): ${this.key.toString()}`);
        console.log(`  🧹 Clearing parent context reference`);
        console.log(`  🧹 Clearing children array (${this._children.length} items)`);
        
        // Clear parent context reference
        this._parentContext = undefined;
        
        // Clear children array
        this._children = [];
        
        // Call parent dispose
        super.dispose();
        
        console.log(`  ✅ Disposal complete`);
    }
}
