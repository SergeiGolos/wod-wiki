import { BlockKey } from "../../BlockKey";
import { IEventHandler, IRuntimeLog } from "../EventHandler";
import { IResultSpanBuilder } from "../ResultSpanBuilder";
import { RootNextHandler } from "../handlers/RootNextHandler";
import { RuntimeBlock } from "../RuntimeBlock";
import type { IMemoryReference } from "../memory";
import { IScriptRuntime } from "../IScriptRuntime";
import { IRuntimeBlock } from "../IRuntimeBlock";
import { AllocateSpanBehavior } from "../behaviors/AllocateSpanBehavior";
import { AllocateChildrenBehavior } from "../behaviors/AllocateChildrenBehavior";
import { AllocateIndexBehavior } from "../behaviors/AllocateIndexBehavior";
import { NextChildBehavior } from "../behaviors/NextChildBehavior";
import { NoLoopBehavior } from "../behaviors/NoLoopBehavior";
import { OnEventEndBehavior } from "../behaviors/OnEventEndBehavior";
import { StopOnPopBehavior } from "../behaviors/StopOnPopBehavior";
import { JournalOnPopBehavior } from "../behaviors/JournalOnPopBehavior";
import { EndOnPopBehavior } from "../behaviors/EndOnPopBehavior";

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

    constructor(key: BlockKey, sourceId: string[] = []) {
        super(key, sourceId);
        this.behaviors.push(
            new AllocateSpanBehavior(),
            new AllocateChildrenBehavior(),
            new AllocateIndexBehavior(),
            
            new NextChildBehavior(),
            new NoLoopBehavior(),
            
            new OnEventEndBehavior(),            
            new StopOnPopBehavior(),            
            new JournalOnPopBehavior(),
            new EndOnPopBehavior()            
        );
    }
}