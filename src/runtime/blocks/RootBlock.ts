import { BlockKey } from "../../BlockKey";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlock } from "../RuntimeBlock";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";

/**
 * Root block adapted to the memory model and aligned with the new behavior specification.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior
 * - AllocateChildren
 * - AllocateIndex
 * - NextChildBehavior
 * - NoLoopBehavior
 * - OnEventEndBehavior
 * - StopOnPopBehavior
 * - JournalOnPopBehavior
 * - EndOnPopBehavior
 */
export class RootBlock extends RuntimeBlock {
    
    private _spanRef?: IMemoryReference<IResultSpanBuilder>;
    private _childrenGroupsRef?: IMemoryReference<string[][]>;
    private _loopIndexRef?: IMemoryReference<number>;
    private _childIndexRef?: IMemoryReference<number>;
    private _passCompleteRef?: IMemoryReference<boolean>;
    private _endEventRef?: IMemoryReference<boolean>;
    private _journalingEnabledRef?: IMemoryReference<boolean>;
    private _endOnPopRef?: IMemoryReference<boolean>;
    private _activeTimersRef?: IMemoryReference<string[]>;
    private _childrenInit: string[];

    constructor(children: string[]) {
        console.log(`🌱 RootBlock constructor - Creating with children: [${children.join(', ')}]`);
        
        
        
        const key = new BlockKey('root');
        super(key, []);
        this._childrenInit = children;
        console.log(`🌱 RootBlock created with key: ${this.key.toString()}`);
    }
    
    // IAllocateSpanBehavior implementation
    public getSpan(): IResultSpanBuilder | undefined {
        return this._spanRef?.get();
    }

    public setSpan(span: IResultSpanBuilder): void {
        this._spanRef?.set(span);
    }

    public createSpan(): IResultSpanBuilder {
        return {
            create: () => ({ 
                blockKey: this.key.toString(), 
                timeSpan: { 
                    blockKey: this.key.toString()
                }, 
                metrics: [], 
                duration: 0
            }),
            getSpans: () => [],
            close: () => {
                console.log(`🌱 RootBlock span completed`);
            },
            start: () => {
                console.log(`🌱 RootBlock span started`);
            },
            stop: () => {
                console.log(`🌱 RootBlock span stopped`);
            }
        };
    }

    public getSpanReference(): IMemoryReference<IResultSpanBuilder> | undefined {
        return this._spanRef;
    }

    public initializeSpan(visibility: 'public' | 'private'): void {
        this._spanRef = this.allocateMemory<IResultSpanBuilder>(
            'span', 
            this.createSpan(), 
            visibility
        );
    }

    // IAllocateChildrenBehavior implementation
    public getChildrenGroups(): string[][] {
        return this._childrenGroupsRef?.get() || [];
    }

    public getChildrenGroupsReference(): IMemoryReference<string[][]> | undefined {
        return this._childrenGroupsRef;
    }

    public parseChildrenGroups(childSourceIds: string[]): string[][] {
        // For now, treat each child as its own group
        // Future enhancement: parse lap fragments ("+" / "-" / " ") to group properly
        return childSourceIds.map(id => [id]);
    }

    // IAllocateIndexBehavior implementation
    public getLoopIndex(): number {
        return this._loopIndexRef?.get() || 0;
    }

    public setLoopIndex(index: number): void {
        this._loopIndexRef?.set(index);
    }

    public getChildIndex(): number {
        return this._childIndexRef?.get() || -1;
    }

    public setChildIndex(index: number): void {
        this._childIndexRef?.set(index);
    }

    public getLoopIndexReference(): IMemoryReference<number> | undefined {
        return this._loopIndexRef;
    }

    public getChildIndexReference(): IMemoryReference<number> | undefined {
        return this._childIndexRef;
    }

    // INextChildBehavior implementation
    public hasNextChild(): boolean {
        const groups = this.getChildrenGroups();
        const currentIndex = this.getChildIndex();
        return currentIndex + 1 < groups.length;
    }

    public getNextChild(): IRuntimeBlock | undefined {
        if (!this.hasNextChild()) {
            return undefined;
        }
        
        // Advance to next child
        this.advanceToNextChild();
        
        const currentGroup = this.getCurrentChildGroup();
        if (!currentGroup || currentGroup.length === 0) {
            return undefined;
        }
        
        // For now, return undefined as we need JIT compilation context
        // This will be handled by the runtime system
        return undefined;
    }

    public advanceToNextChild(): void {
        const currentIndex = this.getChildIndex();
        this.setChildIndex(currentIndex + 1);
    }

    public getCurrentChildGroup(): string[] | undefined {
        const groups = this.getChildrenGroups();
        const currentIndex = this.getChildIndex();
        
        if (currentIndex >= 0 && currentIndex < groups.length) {
            return groups[currentIndex];
        }
        
        return undefined;
    }

    // INoLoopBehavior implementation
    public isPassComplete(): boolean {
        return this._passCompleteRef?.get() || false;
    }

    public markPassComplete(): void {
        this._passCompleteRef?.set(true);
    }

    public resetPassState(): void {
        this._passCompleteRef?.set(false);
    }

    // IOnEventEndBehavior implementation
    public isEndEventReceived(): boolean {
        return this._endEventRef?.get() || false;
    }

    public markEndEventReceived(): void {
        this._endEventRef?.set(true);
        console.log(`🌱 RootBlock end event received`);
    }

    public resetEndEventState(): void {
        this._endEventRef?.set(false);
    }

    public handleEndEvent(): void {
        console.log(`🌱 RootBlock handling end event - stopping and popping all children`);
        this.markEndEventReceived();
        // Implementation would stop all children and trigger shutdown
    }

    // IStopOnPopBehavior implementation
    public stopTimers(): void {
        const timers = this.getActiveTimerIds();
        console.log(`🌱 RootBlock stopping ${timers.length} timers`);
        // Implementation would stop actual timers
        this._activeTimersRef?.set([]);
    }

    public areTimersRunning(): boolean {
        return this.getActiveTimerIds().length > 0;
    }

    public getActiveTimerIds(): string[] {
        return this._activeTimersRef?.get() || [];
    }

    // IJournalOnPopBehavior implementation
    public writeToJournal(): void {
        console.log(`🌱 RootBlock writing to journal`);
        // Implementation would write metrics and spans to persistent storage
    }

    public getJournalEntries(): any[] {
        return [];
    }

    public isJournalingEnabled(): boolean {
        return this._journalingEnabledRef?.get() || false;
    }

    public setJournalingEnabled(enabled: boolean): void {
        this._journalingEnabledRef?.set(enabled);
    }

    // IEndOnPopBehavior implementation
    public shouldEndOnPop(): boolean {
        return this._endOnPopRef?.get() || false;
    }

    public markForEndOnPop(): void {
        this._endOnPopRef?.set(true);
    }

    public triggerProgramEnd(): void {
        console.log(`🌱 RootBlock triggering program end`);
        this.markForEndOnPop();
        // Implementation would end the program
    }

    public resetEndOnPopState(): void {
        this._endOnPopRef?.set(false);
    }

    // Legacy compatibility methods
    /**
     * Get the current statement index from memory (legacy compatibility)
     */
    public getStatementIndex(): number {
        return this.getChildIndex();
    }

    /**
     * Set the current statement index in memory (legacy compatibility)
     */
    public setStatementIndex(index: number): void {
        this.setChildIndex(index);
    }

    /**
     * Increment the statement index in memory (legacy compatibility)
     */
    public incrementStatementIndex(): void {
        this.advanceToNextChild();
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return this.createSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        const handlers = [new RootNextHandler()];
        console.log(`  🔧 Registered ${handlers.length} handlers: ${handlers.map(h => h.name).join(', ')}`);
        return handlers;
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onPush() - Block pushed to stack`);
        
        // Start the root span
        const span = this.getSpan();
        if (span) {
            span.start();
        }
        
        return [{ level: 'info', message: 'root push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onNext() - Determining next block after child completion`);
        
        // Check if we should end due to external event
        if (this.isEndEventReceived()) {
            this.handleEndEvent();
            return [];
        }
        
        // Check if single pass is complete
        if (!this.hasNextChild()) {
            this.markPassComplete();
            console.log(`🌱 RootBlock single pass complete`);
        }
        
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🌱 RootBlock.onPop() - Block popped from stack, cleaning up`);
        
        // Stop all timers
        this.stopTimers();
        
        // Stop the root span
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Journal metrics and spans
        if (this.isJournalingEnabled()) {
            this.writeToJournal();
        }
        
        // End program if marked for end on pop
        if (this.shouldEndOnPop()) {
            this.triggerProgramEnd();
        }
        
        return [{ level: 'info', message: 'root pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}