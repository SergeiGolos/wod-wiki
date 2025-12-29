import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { LoopCoordinatorBehavior, LoopConfig } from './LoopCoordinatorBehavior';
import { TimerBehavior } from './TimerBehavior';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
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
    FINAL_IDLE,
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

        switch (this.state) {
            case RootState.INITIAL_IDLE: {
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

                if (this.loopCoordinator.isComplete(block, now)) {
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

            case RootState.FINAL_IDLE:
                this.state = RootState.COMPLETE;
                return [new PopBlockAction()];

            case RootState.COMPLETE:
                return [];

            default:
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
                return [new SkipCurrentBlockAction(block.key.toString())];

            case 'timer:complete':
                // Only handle completion if we're in EXECUTING state
                // Prevents duplicate handling if timer:complete fires multiple times
                if (this.state !== RootState.EXECUTING) {
                    break;
                }

                // Only handle completion if it's for this block (root)
                // or if it's a generic command (no blockId)
                if (event.data && (event.data as any).blockId && (event.data as any).blockId !== block.key.toString()) {
                    break;
                }
                if (timer) timer.stop(now);

                this.state = RootState.FINAL_IDLE;

                const startTime = block.executionTiming?.completedAt ?? now;

                // Pop any remaining child blocks first, then push final idle
                // Use SkipCurrentBlockAction to pop children until we're back at root
                const actions: IRuntimeAction[] = [
                    new SetWorkoutStateAction('complete'),
                    new ClearButtonsAction(),
                ];

                // Skip any blocks above root (children)
                if (runtime.stack.current && runtime.stack.current !== block) {
                    actions.push(new SkipCurrentBlockAction(block.key.toString()));
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
