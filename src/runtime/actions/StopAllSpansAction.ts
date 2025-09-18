import { IRuntimeAction } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IResultSpanBuilder } from "../ResultSpanBuilder";

/**
 * Action to stop ALL spans in memory.
 * This is used for global stop events that affect all spans system-wide.
 */
export class StopAllSpansAction implements IRuntimeAction {
    public readonly type = 'StopAllSpans';

    constructor(private timestamp: Date) {}

    public do(runtime: IScriptRuntime): void {
        console.log(`🔴 StopAllSpansAction - Stopping all spans in memory at ${this.timestamp.toISOString()}`);
        
        if (!runtime.memory) {
            console.warn(`⚠️ StopAllSpansAction - No memory available on runtime`);
            return;
        }

        // Find all span builders in memory
        const spanBuilderRefs = runtime.memory.searchReferences<IResultSpanBuilder>({ type: 'span-builder' });
        
        console.log(`🔍 StopAllSpansAction - Found ${spanBuilderRefs.length} span builders in memory`);
        
        for (const spanRef of spanBuilderRefs) {
            const spanBuilder = spanRef.get();
            if (spanBuilder) {
                try {
                    spanBuilder.stop();
                    console.log(`  ✅ Stopped span builder for owner: ${spanRef.ownerId}`);
                } catch (error) {
                    console.warn(`  ⚠️ Failed to stop span builder for owner: ${spanRef.ownerId}`, error);
                }
            }
        }
        
        console.log(`✨ StopAllSpansAction completed - ${spanBuilderRefs.length} spans stopped`);
    }
}