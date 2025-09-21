import { IRuntimeAction } from "../EventHandler";
import { IScriptRuntime } from "../IScriptRuntime";
import { IResultSpanBuilder } from "../ResultSpanBuilder";

/**
 * Action to start ALL spans in memory.
 * This is used for global start events that affect all spans system-wide.
 */
export class StartAllSpansAction implements IRuntimeAction {
    public readonly type = 'StartAllSpans';

    constructor(private timestamp: Date) {}

    public do(runtime: IScriptRuntime): void {
        console.log(`🟢 StartAllSpansAction - Starting all spans in memory at ${this.timestamp.toISOString()}`);
        
        if (!runtime.memory) {
            console.warn(`⚠️ StartAllSpansAction - No memory available on runtime`);
            return;
        }

        // Find all span builders in memory
        const spanBuilderRefs = runtime.memory.search({ type: 'span-builder', id: null, ownerId: null, visibility: null });
        
        console.log(`🔍 StartAllSpansAction - Found ${spanBuilderRefs.length} span builders in memory`);
        
        for (const spanRef of spanBuilderRefs) {
            const spanBuilder = runtime.memory.get(spanRef as any);
            if (spanBuilder) {
                try {
                    spanBuilder.start();
                    console.log(`  ✅ Started span builder for owner: ${spanRef.ownerId}`);
                } catch (error) {
                    console.warn(`  ⚠️ Failed to start span builder for owner: ${spanRef.ownerId}`, error);
                }
            }
        }
        
        console.log(`✨ StartAllSpansAction completed - ${spanBuilderRefs.length} spans started`);
    }
}