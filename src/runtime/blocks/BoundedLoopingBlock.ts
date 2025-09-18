import { BlockKey } from "../../BlockKey";
import { RuntimeMetric } from "../RuntimeMetric";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { GroupNextHandler } from "../handlers/GroupNextHandler";
import { RuntimeBlockWithMemoryBase } from "../RuntimeBlockWithMemoryBase";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { IAllocateSpanBehavior } from "../behaviors/IAllocateSpanBehavior";
import { IAllocateChildrenBehavior } from "../behaviors/IAllocateChildrenBehavior";
import { IAllocateIndexBehavior } from "../behaviors/IAllocateIndexBehavior";
import { INextChildBehavior } from "../behaviors/INextChildBehavior";
import { IBoundLoopBehavior } from "../behaviors/IBoundLoopBehavior";
import { IStopOnPopBehavior } from "../behaviors/IStopOnPopBehavior";
import { IJournalOnPopBehavior } from "../behaviors/IJournalOnPopBehavior";

/**
 * BoundedLoopingBlock - Has a defined number of rounds to execute the child blocks before exiting.
 * 
 * Behaviors Used:
 * - AllocateSpanBehavior
 * - AllocateChildren
 * - AllocateIndex
 * - NextChildBehavior
 * - BoundLoopBehavior
 * - StopOnPopBehavior
 * - JournalOnPopBehavior
 */
export class BoundedLoopingBlock extends RuntimeBlockWithMemoryBase 
    implements IAllocateSpanBehavior, IAllocateChildrenBehavior, IAllocateIndexBehavior, INextChildBehavior, 
               IBoundLoopBehavior, IStopOnPopBehavior, IJournalOnPopBehavior {
    
    private _spanRef?: IMemoryReference<IResultSpanBuilder>;
    private _childrenGroupsRef?: IMemoryReference<string[][]>;
    private _loopIndexRef?: IMemoryReference<number>;
    private _childIndexRef?: IMemoryReference<number>;
    private _remainingIterationsRef?: IMemoryReference<number>;
    private _totalIterationsRef?: IMemoryReference<number>;
    private _activeTimersRef?: IMemoryReference<string[]>;
    private _journalingEnabledRef?: IMemoryReference<boolean>;

    constructor(key: BlockKey, metrics: RuntimeMetric[]) {
        super(key, metrics);
        console.log(`🔄 BoundedLoopingBlock created for key: ${key.toString()}`);
    }

    protected initializeMemory(): void {
        // AllocateSpanBehavior
        this.initializeSpan('private');
        
        // Find rounds metric value from initial metrics
        const roundsMetric = this.initialMetrics.find(m =>
            m.values.some(v => v.type === 'rounds')
        );
        const initialRounds = roundsMetric?.values.find(v => v.type === 'rounds')?.value || 1;

        // AllocateChildren
        const childrenGroups = this.parseChildrenGroups(this.identifyChildStatements());
        this._childrenGroupsRef = this.allocateMemory<string[][]>('children-groups', childrenGroups, 'private');
        
        // AllocateIndex
        this._loopIndexRef = this.allocateMemory<number>('loop-index', 0, 'private');
        this._childIndexRef = this.allocateMemory<number>('child-index', -1, 'private');
        
        // BoundLoopBehavior
        this._remainingIterationsRef = this.allocateMemory<number>('remaining-iterations', initialRounds, 'private');
        this._totalIterationsRef = this.allocateMemory<number>('total-iterations', initialRounds, 'private');
        
        // StopOnPopBehavior
        this._activeTimersRef = this.allocateMemory<string[]>('active-timers', [], 'private');
        
        // JournalOnPopBehavior
        this._journalingEnabledRef = this.allocateMemory<boolean>('journaling-enabled', true, 'private');

        console.log(`🔄 BoundedLoopingBlock initialized with ${initialRounds} rounds and ${childrenGroups.length} child groups`);
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
                console.log(`🔄 BoundedLoopingBlock span completed`);
            },
            start: () => {
                console.log(`🔄 BoundedLoopingBlock span started`);
            },
            stop: () => {
                console.log(`🔄 BoundedLoopingBlock span stopped`);
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

    public parseChildrenGroups(childSourceIds: any[]): string[][] {
        // For now, treat each child as its own group
        // Future enhancement: parse lap fragments ("+" / "-" / " ") to group properly
        return childSourceIds.map(child => {
            // Ensure we convert the statement ID to string for consistent storage
            const childId = typeof child === 'string' ? child : (child.id || child.sourceId || 'unknown').toString();
            return [childId];
        });
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

    // IBoundLoopBehavior implementation
    public getRemainingIterations(): number {
        return this._remainingIterationsRef?.get() || 0;
    }

    public setRemainingIterations(count: number): void {
        this._remainingIterationsRef?.set(count);
    }

    public getTotalIterations(): number {
        return this._totalIterationsRef?.get() || 0;
    }

    public decrementIterations(): void {
        const current = this.getRemainingIterations();
        this.setRemainingIterations(Math.max(0, current - 1));
    }

    public hasMoreIterations(): boolean {
        return this.getRemainingIterations() > 0;
    }

    public getRemainingIterationsReference(): IMemoryReference<number> | undefined {
        return this._remainingIterationsRef;
    }

    // IStopOnPopBehavior implementation
    public stopTimers(): void {
        const timers = this.getActiveTimerIds();
        console.log(`🔄 BoundedLoopingBlock stopping ${timers.length} timers`);
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
        console.log(`🔄 BoundedLoopingBlock writing to journal`);
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

    // Legacy compatibility methods (from RepeatingBlock)
    /**
     * Identify child statements for this repeating block from the script.
     * Child statements are those that are indented (higher columnStart) 
     * and appear after this block's statement in the script.
     */
    private identifyChildStatements(): any[] {
        if (!this.runtime || !this.runtime.script) {
            console.log(`🔄 BoundedLoopingBlock - No runtime or script available for child identification`);
            return [];
        }

        // Get this block's source statement from the runtime by matching sourceId
        const sourceId = this.initialMetrics[0]?.sourceId;
        if (!sourceId) {
            console.log(`🔄 BoundedLoopingBlock - No source ID available for child identification`);
            return [];
        }

        const statements = this.runtime.script.statements || [];
        const parentStatement = statements.find(stmt => stmt.id?.toString() === sourceId);
        if (!parentStatement) {
            console.log(`🔄 BoundedLoopingBlock - Parent statement not found for sourceId: ${sourceId}`);
            return [];
        }

        const parentColumnStart = parentStatement.meta?.columnStart || 1;
        const parentIndex = statements.indexOf(parentStatement);

        // Find child statements that:
        // 1. Appear after the parent statement in the script
        // 2. Have greater columnStart (are indented relative to parent)
        // 3. Are not children of other statements at the same or deeper level
        const childStatements: any[] = [];
        
        for (let i = parentIndex + 1; i < statements.length; i++) {
            const stmt = statements[i];
            const stmtColumnStart = stmt.meta?.columnStart || 1;
            
            // If we encounter a statement at the same or lesser indentation level, 
            // we've moved out of this block's children
            if (stmtColumnStart <= parentColumnStart) {
                break;
            }
            
            // If this is a direct child (immediately one level deeper)
            if (stmtColumnStart === parentColumnStart + 2 || stmtColumnStart === parentColumnStart + 4) {
                childStatements.push(stmt);
            }
        }

        // Safely log only the IDs without trying to log the full objects
        console.log(`🔄 BoundedLoopingBlock - Identified ${childStatements.length} child statements for block ${this.key.toString()}: [${childStatements.map(s => s.id?.toString() || 'unknown').join(', ')}]`);
        return childStatements;
    }

    protected createSpansBuilder(): IResultSpanBuilder {
        return this.createSpan();
    }

    protected createInitialHandlers(): IEventHandler[] {
        return [new GroupNextHandler()];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onPush() - Starting bounded loop`);
        
        // Start the span
        const span = this.getSpan();
        if (span) {
            span.start();
        }
        
        return [{ level: 'info', message: 'bounded loop push', timestamp: new Date(), context: { key: this.key.toString() } }];
    }

    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onNext() - Processing next iteration`);
        
        // Check if we've completed a round and need to loop
        if (!this.hasNextChild()) {
            // Reset child index for next round
            this.setChildIndex(-1);
            
            // Decrement remaining iterations
            this.decrementIterations();
            
            // Check if we have more iterations
            if (!this.hasMoreIterations()) {
                console.log(`🔄 BoundedLoopingBlock completed all ${this.getTotalIterations()} iterations`);
                return [];
            }
            
            // Increment loop index for new round
            const currentLoop = this.getLoopIndex();
            this.setLoopIndex(currentLoop + 1);
            console.log(`🔄 BoundedLoopingBlock starting round ${currentLoop + 1}`);
        }
        
        return [];
    }

    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] {
        console.log(`🔄 BoundedLoopingBlock.onPop() - Cleaning up bounded loop`);
        
        // Stop all timers
        this.stopTimers();
        
        // Stop the span
        const span = this.getSpan();
        if (span) {
            span.stop();
        }
        
        // Journal metrics and spans
        if (this.isJournalingEnabled()) {
            this.writeToJournal();
        }
        
        return [{ level: 'info', message: 'bounded loop pop', timestamp: new Date(), context: { key: this.key.toString() } }];
    }
}