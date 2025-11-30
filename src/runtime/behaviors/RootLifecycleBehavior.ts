import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { IRuntimeBlock } from '../IRuntimeBlock';
import { LoopCoordinatorBehavior, LoopConfig } from './LoopCoordinatorBehavior';
import { IdleBehavior } from './IdleBehavior';
import { TimerBehavior } from './TimerBehavior';
import { RuntimeBlock } from '../RuntimeBlock';
import { BlockContext } from '../BlockContext';
import { BlockKey } from '../../core/models/BlockKey';
import { PushBlockAction } from '../PushBlockAction';
import { PopBlockAction } from '../PopBlockAction';
import { IEvent } from '../IEvent';

enum RootState {
    MOUNTING,
    INITIAL_IDLE,
    EXECUTING,
    FINAL_IDLE,
    COMPLETE
}

export class RootLifecycleBehavior implements IRuntimeBehavior {
    private state: RootState = RootState.MOUNTING;
    private loopCoordinator: LoopCoordinatorBehavior;

    constructor(loopConfig: LoopConfig) {
        this.loopCoordinator = new LoopCoordinatorBehavior(loopConfig);
    }

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        // Start with Initial Idle Block
        this.state = RootState.INITIAL_IDLE;
        
        const idleBlock = this.createIdleBlock(
            runtime, 
            'idle-start', 
            'Ready', 
            { popOnNext: false, popOnEvents: ['next'] }
        );
        
        // We do NOT call loopCoordinator.onPush here because we want to delay execution
        // until the initial idle block is popped.
        // LoopCoordinator.onPush would advance the index to 0 immediately.
        // By skipping it, index remains -1, and the first onNext call during EXECUTING phase
        // will advance it to 0 and push the first child.

        // Create "Initialized" section record
        this.createSectionRecord(runtime, block, 'root-init', 'Initialized');

        return [new PushBlockAction(idleBlock)];
    }

    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        switch (this.state) {
            case RootState.INITIAL_IDLE:
                // Initial idle just finished (popped)
                // Transition to execution
                this.state = RootState.EXECUTING;

                // Create "Workout Started" section record
                this.createSectionRecord(runtime, block, 'root-start', 'Workout Started');

                return this.loopCoordinator.onNext(runtime, block);

            case RootState.EXECUTING:
                // Delegate to loop coordinator
                const actions = this.loopCoordinator.onNext(runtime, block);
                
                // Check if loop is complete
                if (this.loopCoordinator.isComplete(runtime, block)) {

                    this.state = RootState.FINAL_IDLE;
                    
                    // Create "Completed" section record
                    this.createSectionRecord(runtime, block, 'root-complete', 'Completed');
                    
                    // Stop the timer
                    const timer = block.getBehavior(TimerBehavior);
                    if (timer) {
                        timer.stop();
                    }
                    
                    const finalIdleBlock = this.createIdleBlock(
                        runtime,
                        'idle-end',
                        'Finished',
                        { 
                            popOnNext: false,
                            popOnEvents: ['stop', 'view-results'] // Wait for explicit stop/view
                        }
                    );
                    
                    // Add the final idle block push to the actions
                    // Note: We append it to any actions returned by loopCoordinator (though usually it returns empty when complete)
                    return [...actions, new PushBlockAction(finalIdleBlock)];
                }
                
                return actions;

            case RootState.FINAL_IDLE:
                // Final idle just finished
                this.state = RootState.COMPLETE;

                return [new PopBlockAction()];

            case RootState.COMPLETE:
                return [];

            default:
                return [];
        }
    }

    onEvent(_event: IEvent, _runtime: IScriptRuntime, _block: IRuntimeBlock): IRuntimeAction[] {
        // Delegate events to loop coordinator during execution
        if (this.state === RootState.EXECUTING) {
             // LoopCoordinator doesn't implement onEvent currently, but if it did:
             // return this.loopCoordinator.onEvent?.(event, runtime, block) || [];
        }
        return [];
    }

    private createIdleBlock(
        runtime: IScriptRuntime, 
        id: string, 
        label: string, 
        config: { popOnNext?: boolean, popOnEvents?: string[] }
    ): RuntimeBlock {
        const blockKey = new BlockKey(id);
        const context = new BlockContext(runtime, blockKey.toString(), 'Idle');
        
        const behaviors = [
            new IdleBehavior({
                label: label,
                popOnNext: config.popOnNext,
                popOnEvents: config.popOnEvents
            })
        ];

        return new RuntimeBlock(
            runtime,
            [], // No source IDs for idle block
            behaviors,
            context,
            blockKey,
            'Idle',
            label
        );
    }

    private createSectionRecord(runtime: IScriptRuntime, block: IRuntimeBlock, idSuffix: string, label: string): void {
        const record = {
            id: `${block.key.toString()}-${idSuffix}`,
            blockId: block.key.toString(),
            parentId: block.key.toString(),
            type: 'section',
            label: label,
            startTime: Date.now(),
            status: 'completed', // Event/Marker is instantaneous/completed
            metrics: []
        };
        
        runtime.memory.allocate('execution-record', block.key.toString(), record, 'public');
    }
}
