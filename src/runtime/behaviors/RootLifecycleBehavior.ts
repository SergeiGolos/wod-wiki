import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { LoopCoordinatorBehavior, LoopConfig } from './LoopCoordinatorBehavior';
import { TimerBehavior } from './TimerBehavior';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { PopToBlockAction } from '../actions/stack/PopToBlockAction';
import { SkipCurrentBlockAction } from '../actions/stack/SkipCurrentBlockAction';
import { IEvent } from '../contracts/events/IEvent';
import { RuntimeControlsBehavior } from './RuntimeControlsBehavior';
import { SetWorkoutStateAction } from '../actions/display/WorkoutStateActions';
import { PushIdleBlockAction } from '../actions/stack/PushIdleBlockAction';
import { SubscribeEventAction, UnsubscribeEventAction } from '../actions/events/EventSubscriptionActions';
import {
    UpdateDisplayModeAction,
    RegisterButtonAction,
    UnregisterButtonAction,
    ClearButtonsAction
} from '../actions/display/ControlActions';

enum RootState {
    MOUNTING,
    INITIAL_IDLE,
    EXECUTING,
    COMPLETING,   // Transitioning to final idle (child being skipped)
    FINAL_IDLE,   // Final idle is shown
    COMPLETE
}

export class RootLifecycleBehavior implements IRuntimeBehavior {
    private state: RootState = RootState.MOUNTING;
    private loopCoordinator: LoopCoordinatorBehavior;
    private controls: RuntimeControlsBehavior;
    private controlHandlerId?: string;

    constructor(loopConfig: LoopConfig) {
        this.loopCoordinator = new LoopCoordinatorBehavior(loopConfig);
        this.controls = new RuntimeControlsBehavior();
    }

    onPush(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        this.state = RootState.INITIAL_IDLE;
        this.controlHandlerId = `root-control-handler-${block.key.toString()}`;

        // Ensure we use the controls behavior from the block if it exists (for findability via actions)
        const blockControls = block.getBehavior(RuntimeControlsBehavior);
        if (blockControls) {
            this.controls = blockControls;
        }

        const controlActions = this.controls.onPush(block, options);
        // We don't call setDisplayMode directly, we use an action

        const startTime = options?.startTime ?? new Date();

        return [
            ...controlActions,
            new UpdateDisplayModeAction('clock'),
            new SubscribeEventAction(
                '*',
                this.controlHandlerId,
                block.key.toString(),
                (event, runtime) => this.handleControlEvent(event, runtime, block)
            ),
            new SetWorkoutStateAction('running'),
            new PushIdleBlockAction(
                'idle-start',
                'Ready',
                {
                    popOnNext: true,
                    popOnEvents: [],
                    buttonLabel: 'Start Workout',
                    buttonAction: 'timer:start'
                },
                { startTime }
            )
        ];
    }

    onNext(block: IRuntimeBlock, options?: BlockLifecycleOptions): IRuntimeAction[] {
        const now = options?.now ?? new Date();
        console.log(`[RootLifecycle] onNext: state=${RootState[this.state]}`);

        switch (this.state) {
            case RootState.INITIAL_IDLE: {
                console.log(`[RootLifecycle] INITIAL_IDLE -> EXECUTING`);
                this.state = RootState.EXECUTING;

                const timer = block.getBehavior(TimerBehavior);
                if (timer) {
                    timer.resume(now);
                }

                return [
                    new SetWorkoutStateAction('running'),
                    new UpdateDisplayModeAction('timer'),
                    ...this.getExecutionControlActions(),
                    ...this.loopCoordinator.onNext(block, options)
                ];
            }

            case RootState.EXECUTING: {
                const actions = this.loopCoordinator.onNext(block, options);
                const isComplete = this.loopCoordinator.isComplete(block, now);
                console.log(`[RootLifecycle] EXECUTING: loopCoordinator.isComplete=${isComplete}`);

                if (isComplete) {
                    console.log(`[RootLifecycle] EXECUTING -> FINAL_IDLE`);
                    this.state = RootState.FINAL_IDLE;

                    const timer = block.getBehavior(TimerBehavior);
                    if (timer) {
                        timer.stop(now);
                    }

                    const startTime = options?.completedAt ?? block.executionTiming?.completedAt ?? now;
                    return [
                        ...actions,
                        new SetWorkoutStateAction('complete'),
                        new ClearButtonsAction(),
                        new PushIdleBlockAction(
                            'idle-end',
                            'Cooldown, checkout the Analytics',
                            {
                                popOnNext: false,
                                popOnEvents: ['stop', 'view-results'],
                                buttonLabel: 'View Analytics',
                                buttonAction: 'view:analytics'
                            },
                            { startTime }
                        )
                    ];
                }

                return actions;
            }

            case RootState.COMPLETING:
                // Child is being skipped, final idle is being pushed
                // Transition to FINAL_IDLE now that child skip triggered onNext
                console.log(`[RootLifecycle] COMPLETING -> FINAL_IDLE`);
                this.state = RootState.FINAL_IDLE;
                return [];

            case RootState.FINAL_IDLE:
                // Final idle was pushed and now dismissed - complete the workout
                // With sequential execution, we know the idle was fully pushed before this is called
                console.log(`[RootLifecycle] FINAL_IDLE -> COMPLETE, returning PopBlockAction`);
                this.state = RootState.COMPLETE;
                return [new PopBlockAction()];

            case RootState.COMPLETE:
                console.log(`[RootLifecycle] COMPLETE: no action`);
                return [];

            default:
                console.log(`[RootLifecycle] unknown state: ${this.state}`);
                return [];
        }
    }

    onEvent(_event: IEvent, _block: IRuntimeBlock): IRuntimeAction[] {
        return [];
    }

    onPop(_block: IRuntimeBlock, _options?: BlockLifecycleOptions): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        if (this.controlHandlerId) {
            actions.push(new UnsubscribeEventAction(this.controlHandlerId));
            this.controlHandlerId = undefined;
        }
        return actions;
    }

    onDispose(block: IRuntimeBlock): void {
        this.controls.onDispose(block);
    }

    private handleControlEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        const timer = block.getBehavior(TimerBehavior);
        const now = event.timestamp ?? runtime.clock.now;

        switch (event.name) {
            case 'timer:start':
                if (this.state === RootState.INITIAL_IDLE) {
                    return [new PopBlockAction()];
                }
                break;

            case 'timer:pause':
                if (timer) {
                    timer.pause(now);
                    return [
                        new SetWorkoutStateAction('paused'),
                        new UnregisterButtonAction('btn-pause'),
                        new RegisterButtonAction({
                            id: 'btn-resume',
                            label: 'Resume',
                            icon: 'play',
                            action: 'timer:resume',
                            variant: 'default',
                            size: 'lg'
                        })
                    ];
                }
                break;

            case 'timer:resume':
                if (timer) {
                    timer.resume(now);
                    return [
                        new SetWorkoutStateAction('running'),
                        new UnregisterButtonAction('btn-resume'),
                        new RegisterButtonAction({
                            id: 'btn-pause',
                            label: 'Pause',
                            icon: 'pause',
                            action: 'timer:pause',
                            variant: 'default',
                            size: 'lg'
                        })
                    ];
                }
                break;

            case 'timer:next':
                // Use SkipCurrentBlockAction instead of checking runtime.stack.current directly here
                console.log(`[RootLifecycle] handleControlEvent: timer:next -> SkipCurrentBlockAction`);
                return [new SkipCurrentBlockAction(block.key.toString())];

            case 'timer:complete':
                console.log(`[RootLifecycle] handleControlEvent: timer:complete, state=${RootState[this.state]}`);
                // Only handle completion if we're in EXECUTING state
                // Prevents duplicate handling if timer:complete fires multiple times
                if (this.state !== RootState.EXECUTING) {
                    console.log(`[RootLifecycle] handleControlEvent: timer:complete ignored, not in EXECUTING state`);
                    break;
                }

                // Only handle completion if it's for this block (root)
                // or if it's a generic command (no blockId)
                if (event.data && (event.data as any).blockId && (event.data as any).blockId !== block.key.toString()) {
                    console.log(`[RootLifecycle] handleControlEvent: timer:complete ignored, blockId mismatch`);
                    break;
                }
                if (timer) timer.stop(now);

                // Use COMPLETING state during transition - this prevents onNext from popping root
                // while child is being skipped
                console.log(`[RootLifecycle] EXECUTING -> COMPLETING`);
                this.state = RootState.COMPLETING;

                const startTime = block.executionTiming?.completedAt ?? now;

                // Pop any remaining child blocks first, then push final idle
                // Use PopToBlockAction to pop ALL nested children at once
                const actions: IRuntimeAction[] = [
                    new SetWorkoutStateAction('complete'),
                    new ClearButtonsAction(),
                ];

                // Pop all blocks above root (including nested containers like AMRAP)
                if (runtime.stack.current && runtime.stack.current !== block) {
                    console.log(`[RootLifecycle] handleControlEvent: adding PopToBlockAction to pop all children`);
                    actions.push(new PopToBlockAction(block.key.toString()));
                }

                actions.push(new PushIdleBlockAction(
                    'idle-end',
                    'Cooldown, checkout the Analytics',
                    {
                        popOnNext: false,
                        popOnEvents: ['stop', 'view-results'],
                        buttonLabel: 'View Analytics',
                        buttonAction: 'view:analytics'
                    },
                    { startTime }
                ));

                return actions;
        }

        return [];
    }

    private getExecutionControlActions(): IRuntimeAction[] {
        return [
            new RegisterButtonAction({
                id: 'btn-pause',
                label: 'Pause',
                icon: 'pause',
                action: 'timer:pause',
                variant: 'default',
                size: 'lg'
            }),
            new RegisterButtonAction({
                id: 'btn-next',
                label: 'Next',
                icon: 'next',
                action: 'timer:next',
                variant: 'secondary',
                size: 'lg'
            }),
            new RegisterButtonAction({
                id: 'btn-complete',
                label: 'Complete',
                icon: 'x',
                action: 'timer:complete',
                variant: 'destructive',
                size: 'lg'
            })
        ];
    }
}
