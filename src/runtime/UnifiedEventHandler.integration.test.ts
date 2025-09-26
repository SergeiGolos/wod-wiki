import { describe, it, expect } from 'vitest';
import { ScriptRuntime } from './ScriptRuntime';
import { WodScript } from '../WodScript';
import { JitCompiler } from './JitCompiler';
import { BlockKey } from '../BlockKey';
import { IRuntimeEvent, IEventHandler, HandlerResponse, IRuntimeLog } from './EventHandler';
import { IScriptRuntime } from './IScriptRuntime';
import { RuntimeBlock } from './RuntimeBlock';

// Mock block that simulates a workout block with timing and state
class WorkoutBlock extends RuntimeBlock {
    public spanStarted = false;
    public spanStopped = false;
    public ticksReceived = 0;

    constructor(key: BlockKey, private workoutType: string) {
        super(key);
    }

    protected createSpansBuilder() {
        const self = this;
        return {
            create: () => ({ blockKey: '', timeSpan: {}, metrics: [], duration: 0 }),
            getSpans: () => [],
            close: () => {},
            start: () => {
                self.spanStarted = true;
                console.log(`🟢 Started ${self.workoutType} workout span for ${self.key}`);
            },
            stop: () => {
                self.spanStopped = true;
                console.log(`🔴 Stopped ${self.workoutType} workout span for ${self.key}`);
            }
        };
    }

    protected createInitialHandlers(): IEventHandler[] {
        return [
            new WorkoutEventHandler(this.workoutType, this.key.toString(), this),
            new StartHandler(),
            new StopHandler()
        ];
    }

    protected onPush(runtime: IScriptRuntime): IRuntimeLog[] { 
        void runtime; 
        return []; 
    }
    protected onNext(runtime: IScriptRuntime): IRuntimeLog[] { 
        void runtime; 
        return []; 
    }
    protected onPop(runtime: IScriptRuntime): IRuntimeLog[] { 
        void runtime; 
        return []; 
    }
    protected initializeMemory(): void {}
}

// Handler that responds to all workout events
class WorkoutEventHandler implements IEventHandler {
    public readonly id: string;
    public readonly name: string;
    private block: WorkoutBlock; // Store reference to the block

    constructor(private workoutType: string, blockKey: string, block: WorkoutBlock) {
        this.name = `${workoutType}Handler`;
        this.id = `${this.name}-${blockKey}`;
        this.block = block;
    }

    handler(event: IRuntimeEvent, runtime: IScriptRuntime): HandlerResponse {
        console.log(`📝 ${this.workoutType} handler processing ${event.name} event`);
        
        // Respond to all events but handle them differently
        switch (event.name) {
            case 'start':
                return {
                    handled: true,
                    shouldContinue: true,
                    actions: [] // StartAllSpansAction will be handled by StartHandler
                };
            case 'stop':
                return {
                    handled: true,
                    shouldContinue: true,
                    actions: [] // StopAllSpansAction will be handled by StopHandler
                };
            case 'tick':
                // Update internal state for tick directly on the block
                this.block.ticksReceived++;
                return {
                    handled: true,
                    shouldContinue: true,
                    actions: []
                };
            default:
                return { handled: false, shouldContinue: true, actions: [] };
        }
    }
}

describe('Unified Runtime Event Handler Integration', () => {
    it('should demonstrate complete unified event processing across multiple workout blocks', () => {
        const mockScript = {} as WodScript;
        const mockCompiler = {} as JitCompiler;
        const runtime = new ScriptRuntime(mockScript, mockCompiler);

        // Create multiple workout blocks representing different exercises
        const squatsBlock = new WorkoutBlock(new BlockKey('squats', 1), 'Squats');
        const pushUpsBlock = new WorkoutBlock(new BlockKey('push-ups', 2), 'PushUps'); 
        const plankBlock = new WorkoutBlock(new BlockKey('plank', 3), 'Plank');

        // Push blocks to runtime stack (simulating workout execution)
        runtime.stack.push(squatsBlock);
        runtime.stack.push(pushUpsBlock);
        runtime.stack.push(plankBlock);

        console.log('\n🏋️‍♀️ === WORKOUT SESSION STARTED ===');

        // Verify initial state - no spans started, no ticks received
        expect(squatsBlock.spanStarted).toBe(false);
        expect(pushUpsBlock.spanStarted).toBe(false);
        expect(plankBlock.spanStarted).toBe(false);
        expect(squatsBlock.ticksReceived).toBe(0);
        expect(pushUpsBlock.ticksReceived).toBe(0);
        expect(plankBlock.ticksReceived).toBe(0);

        console.log('\n⏰ Processing START event - should start ALL workout spans...');
        
        // Global start event - should affect ALL workout spans
        runtime.handle(new StartEvent());

        // Verify ALL workout spans were started (global effect)
        expect(squatsBlock.spanStarted).toBe(true);
        expect(pushUpsBlock.spanStarted).toBe(true);
        expect(plankBlock.spanStarted).toBe(true);

        // Verify all blocks were marked as updated
        let updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('squats');
        expect(updatedBlocks).toContain('push-ups');
        expect(updatedBlocks).toContain('plank');

        console.log('\n⏳ Processing TICK events - should reach ALL workout handlers...');

        // Process some tick events during workout
        runtime.handle(new TickEvent());
        runtime.handle(new TickEvent());

        // Verify ALL workout handlers processed the tick events
        expect(squatsBlock.ticksReceived).toBe(2);
        expect(pushUpsBlock.ticksReceived).toBe(2);
        expect(plankBlock.ticksReceived).toBe(2);

        console.log('\n⏹️ Processing STOP event - should stop ALL workout spans...');

        // Global stop event - should affect ALL workout spans
        runtime.handle(new StopEvent());

        // Verify ALL workout spans were stopped (global effect)
        expect(squatsBlock.spanStopped).toBe(true);
        expect(pushUpsBlock.spanStopped).toBe(true);
        expect(plankBlock.spanStopped).toBe(true);

        // Verify all blocks were marked as updated again
        updatedBlocks = runtime.getLastUpdatedBlocks();
        expect(updatedBlocks).toContain('squats');
        expect(updatedBlocks).toContain('push-ups');
        expect(updatedBlocks).toContain('plank');

        console.log('\n✅ === WORKOUT SESSION COMPLETED ===');
        console.log(`📊 Final state summary:`);
        console.log(`   - Squats: started=${squatsBlock.spanStarted}, stopped=${squatsBlock.spanStopped}, ticks=${squatsBlock.ticksReceived}`);
        console.log(`   - PushUps: started=${pushUpsBlock.spanStarted}, stopped=${pushUpsBlock.spanStopped}, ticks=${pushUpsBlock.ticksReceived}`);
        console.log(`   - Plank: started=${plankBlock.spanStarted}, stopped=${plankBlock.spanStopped}, ticks=${plankBlock.ticksReceived}`);
        console.log(`   - Last updated blocks: [${updatedBlocks.join(', ')}]`);

        // Final verification: all requirements met
        expect(squatsBlock.spanStarted && squatsBlock.spanStopped).toBe(true);
        expect(pushUpsBlock.spanStarted && pushUpsBlock.spanStopped).toBe(true);
        expect(plankBlock.spanStarted && plankBlock.spanStopped).toBe(true);
        expect(squatsBlock.ticksReceived).toBeGreaterThan(0);
        expect(pushUpsBlock.ticksReceived).toBeGreaterThan(0);
        expect(plankBlock.ticksReceived).toBeGreaterThan(0);
    });
});