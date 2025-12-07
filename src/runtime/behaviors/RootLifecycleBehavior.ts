import { IRuntimeBehavior } from '../IRuntimeBehavior';
import { IRuntimeAction } from '../IRuntimeAction';
import { IScriptRuntime } from '../IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../IRuntimeBlock';
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
import { IEventHandler } from '../IEventHandler';
import { captureRuntimeTimestamp } from '../RuntimeClock';
import { SetWorkoutStateAction } from '../actions/WorkoutStateActions';

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
    private controlUnsub?: () => void;

    constructor(loopConfig: LoopConfig) {
        this.loopCoordinator = new LoopCoordinatorBehavior(loopConfig);
        this.controls = new RuntimeControlsBehavior();
    }

    onPush(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        // Start with Initial Idle Block
        this.state = RootState.INITIAL_IDLE;
        
        const idleBlock = this.createIdleBlock(
            runtime, 
            'idle-start', 
            'Ready', 
            { 
                popOnNext: false, 
                popOnEvents: ['next'],
                buttonLabel: 'Start Workout',
                buttonAction: 'timer:start'
            }
        );
        
        // We do NOT call loopCoordinator.onPush here because we want to delay execution
        // until the initial idle block is popped.
        // LoopCoordinator.onPush would advance the index to 0 immediately.
        // By skipping it, index remains -1, and the first onNext call during EXECUTING phase
        // will advance it to 0 and push the first child.

        // NOTE: Section records ("Initialized", "Workout Started", etc.) are no longer created here.
        // ScriptRuntime.stack.push() already creates execution-records for each block pushed.
        // Creating additional section markers causes duplicate entries in the execution log.

        // Initialize controls (for Root level)
        this.controls.onPush(runtime, block);
        this.controls.setDisplayMode('clock');
        
        // NOTE: We no longer register "Start" button here.
        // The IdleBehavior of the initial idle block will register it.

        // Register global event handler for controls
        this.registerControlHandler(runtime, block);

        const startTime = options?.startTime ?? captureRuntimeTimestamp(runtime.clock);
        return [
            new SetWorkoutStateAction('running'),
            new PushBlockAction(idleBlock, { startTime })
        ];
    }

    onNext(runtime: IScriptRuntime, block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        switch (this.state) {
            case RootState.INITIAL_IDLE: {
                console.log('🚀 RootLifecycleBehavior: Transitioning from INITIAL_IDLE to EXECUTING');
                this.state = RootState.EXECUTING;

                const timer = block.getBehavior(TimerBehavior);
                if (timer) {
                    console.log('⏱️ RootLifecycleBehavior: Resuming root timer');
                    timer.resume();
                } else {
                    console.error('❌ RootLifecycleBehavior: Root timer not found!');
                }

                this.updateExecutionControls();
                this.controls.setDisplayMode('timer');

                return [
                    new SetWorkoutStateAction('running'),
                    ...this.loopCoordinator.onNext(runtime, block, options)
                ];
            }

            case RootState.EXECUTING: {
                const actions = this.loopCoordinator.onNext(runtime, block, options);

                if (this.loopCoordinator.isComplete(runtime, block)) {
                    this.state = RootState.FINAL_IDLE;

                    const timer = block.getBehavior(TimerBehavior);
                    if (timer) {
                        timer.stop();
                    }

                    const finalIdleBlock = this.createIdleBlock(
                        runtime,
                        'idle-end',
                        'Cooldown, checkout the Analytics',
                        { 
                            popOnNext: false,
                            popOnEvents: ['stop', 'view-results'],
                            buttonLabel: 'View Analytics',
                            buttonAction: 'view:analytics'
                        }
                    );

                    this.controls.clearButtons();

                    const startTime = options?.completedAt ?? block.executionTiming?.completedAt ?? captureRuntimeTimestamp(runtime.clock);
                    return [
                        ...actions,
                        new SetWorkoutStateAction('complete'),
                        new PushBlockAction(finalIdleBlock, { startTime })
                    ];
                }

                return actions;
            }

            case RootState.FINAL_IDLE:
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
        this.controlUnsub = runtime.eventBus?.register?.('*', handler, block.key.toString());
    }

    onPop(): IRuntimeAction[] {
        if (this.controlUnsub) {
            try { this.controlUnsub(); } catch (error) { console.error('Error unsubscribing root control handler', error); }
            this.controlUnsub = undefined;
        }
        return [];
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
                return [new SetWorkoutStateAction('paused')];

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
                return [new SetWorkoutStateAction('running')];

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
                    'Cooldown, checkout the Analytics',
                    { 
                        popOnNext: false, 
                        popOnEvents: ['stop', 'view-results'],
                        buttonLabel: 'View Analytics',
                        buttonAction: 'view:analytics'
                    }
                );

                // Update controls
                this.controls.clearButtons();
                
                // NOTE: We no longer register "View Analytics" button here.
                // The IdleBehavior of the final idle block will register it.

                const startTime = block.executionTiming?.completedAt ?? captureRuntimeTimestamp(runtime.clock);
                return [
                    new SetWorkoutStateAction('complete'),
                    new PushBlockAction(finalIdleBlock, { startTime })
                ];
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
            icon: 'x',
            action: 'timer:complete',
            variant: 'destructive',
            size: 'lg'
        });
    }

    private createIdleBlock(
        runtime: IScriptRuntime, 
        id: string, 
        label: string, 
        config: { 
            popOnNext?: boolean, 
            popOnEvents?: string[],
            buttonLabel?: string,
            buttonAction?: string
        }
    ): RuntimeBlock {
        const blockKey = new BlockKey(id);
        const context = new BlockContext(runtime, blockKey.toString(), 'Idle');
        
        const behaviors = [
            new IdleBehavior({
                label: label,
                popOnNext: config.popOnNext,
                popOnEvents: config.popOnEvents,
                buttonLabel: config.buttonLabel,
                buttonAction: config.buttonAction
            }),
            // Add TimerBehavior so this block appears in the timer stack
            new TimerBehavior('up', undefined, label, 'secondary')
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
