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
import { RuntimeControlsBehavior } from './RuntimeControlsBehavior';
import { RuntimeButton } from '../models/MemoryModels';
import { IEventHandler } from '../IEventHandler';

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
    private controls: RuntimeControlsBehavior;

    constructor(loopConfig: LoopConfig) {
        this.loopCoordinator = new LoopCoordinatorBehavior(loopConfig);
        this.controls = new RuntimeControlsBehavior();
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

        // NOTE: Section records ("Initialized", "Workout Started", etc.) are no longer created here.
        // ScriptRuntime.stack.push() already creates execution-records for each block pushed.
        // Creating additional section markers causes duplicate entries in the execution log.

        // Initialize controls
        this.controls.onPush(runtime, block);
        this.controls.setDisplayMode('clock');
        
        // Register "Start" button
        this.controls.registerButton({
            id: 'btn-start',
            label: 'Start Workout',
            icon: 'play',
            action: 'timer:start',
            variant: 'default',
            size: 'lg'
        });

        // Register global event handler for controls
        this.registerControlHandler(runtime, block);

        return [new PushBlockAction(idleBlock)];
    }

    onNext(runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        switch (this.state) {
            case RootState.INITIAL_IDLE:
                // Initial idle just finished (popped)
                // Transition to execution
                this.state = RootState.EXECUTING;

                // NOTE: "Workout Started" section record is no longer created here.
                // The UI displays execution records from blocks; section markers
                // were causing confusion in the execution log display.

                // Update controls for execution
                this.updateExecutionControls();
                this.controls.setDisplayMode('timer');

                return this.loopCoordinator.onNext(runtime, block);

            case RootState.EXECUTING:
                // Delegate to loop coordinator
                const actions = this.loopCoordinator.onNext(runtime, block);
                
                // Check if loop is complete
                if (this.loopCoordinator.isComplete(runtime, block)) {

                    this.state = RootState.FINAL_IDLE;
                    
                    // NOTE: "Completed" section record is no longer created here.
                    // ScriptRuntime handles execution records for blocks.
                    
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
                    // Update controls for completion
                    this.controls.clearButtons();
                    this.controls.registerButton({
                        id: 'btn-analytics',
                        label: 'View Analytics',
                        icon: 'analytics',
                        action: 'view:analytics',
                        variant: 'default'
                    });

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
        // We use a separate handler registered in memory to handle events globally
        // because onEvent is only called if the block is active (top of stack)
        // or if we manually dispatch to it.
        return [];
    }

    private registerControlHandler(runtime: IScriptRuntime, block: IRuntimeBlock) {
        const handler: IEventHandler = {
            id: `root-control-handler-${block.key.toString()}`,
            name: 'RootControlHandler',
            handler: (event: IEvent, rt: IScriptRuntime) => {
                return this.handleControlEvent(event, rt, block);
            }
        };
        
        // Allocate handler in memory (public so it's found by runtime.handle)
        runtime.memory.allocate<IEventHandler>('handler', block.key.toString(), handler, 'public');
    }

    private handleControlEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        const timer = block.getBehavior(TimerBehavior);

        switch (event.name) {
            case 'timer:start':
                if (this.state === RootState.INITIAL_IDLE) {
                    // Pop the initial idle block to start execution
                    return [new PopBlockAction()];
                }
                break;

            case 'timer:pause':
                if (timer) {
                    timer.pause();
                    this.controls.unregisterButton('btn-pause');
                    this.controls.registerButton({
                        id: 'btn-resume',
                        label: 'Resume',
                        icon: 'play',
                        action: 'timer:resume',
                        variant: 'default',
                        size: 'lg'
                    });
                }
                break;

            case 'timer:resume':
                if (timer) {
                    timer.resume();
                    this.controls.unregisterButton('btn-resume');
                    this.controls.registerButton({
                        id: 'btn-pause',
                        label: 'Pause',
                        icon: 'pause',
                        action: 'timer:pause',
                        variant: 'default', // Keep it default/primary
                        size: 'lg'
                    });
                }
                break;

            case 'timer:next':
                // Pop the current leaf block (skip current segment)
                // We don't want to pop the root block itself
                if (runtime.stack.current && runtime.stack.current !== block) {
                    return [new PopBlockAction()];
                }
                break;

            case 'timer:complete':
                // Force completion
                // For now, we'll just stop the timer and push the final idle block
                // effectively "covering" the rest of the workout
                if (timer) timer.stop();
                
                this.state = RootState.FINAL_IDLE;
                
                // NOTE: "Completed" section record is no longer created here.

                const finalIdleBlock = this.createIdleBlock(
                    runtime,
                    'idle-end',
                    'Finished',
                    { popOnNext: false, popOnEvents: ['stop', 'view-results'] }
                );

                // Update controls
                this.controls.clearButtons();
                this.controls.registerButton({
                    id: 'btn-analytics',
                    label: 'View Analytics',
                    icon: 'analytics',
                    action: 'view:analytics',
                    variant: 'default'
                });

                return [new PushBlockAction(finalIdleBlock)];
        }

        return [];
    }

    private updateExecutionControls() {
        this.controls.clearButtons();
        
        // Pause/Play
        this.controls.registerButton({
            id: 'btn-pause',
            label: 'Pause',
            icon: 'pause',
            action: 'timer:pause',
            variant: 'default',
            size: 'lg'
        });

        // Next
        this.controls.registerButton({
            id: 'btn-next',
            label: 'Next',
            icon: 'next',
            action: 'timer:next',
            variant: 'secondary',
            size: 'lg'
        });

        // Complete
        this.controls.registerButton({
            id: 'btn-complete',
            label: 'Complete',
            icon: 'check',
            action: 'timer:complete',
            variant: 'destructive',
            size: 'lg'
        });
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

    // NOTE: createSectionRecord was removed - section markers were causing
    // duplicate/confusing entries in the execution log. ScriptRuntime.stack.push()
    // now handles all execution record creation centrally.
}
