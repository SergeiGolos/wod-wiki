import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { BlockLifecycleOptions, IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { LoopCoordinatorBehavior, LoopConfig } from './LoopCoordinatorBehavior';
import { TimerBehavior } from './TimerBehavior';
import { PopBlockAction } from '../actions/stack/PopBlockAction';
import { IEvent } from '../contracts/events/IEvent';
import { RuntimeControlsBehavior } from './RuntimeControlsBehavior';
import { SetWorkoutStateAction } from '../actions/display/WorkoutStateActions';
import { PushIdleBlockAction } from '../actions/stack/PushIdleBlockAction';
import { SubscribeEventAction, UnsubscribeEventAction } from '../actions/events/EventSubscriptionActions';

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
        // Start with Initial Idle Block
        this.state = RootState.INITIAL_IDLE;
        this.controlHandlerId = `root-control-handler-${block.key.toString()}`;

        // Initialize controls (for Root level)
        const controlActions = this.controls.onPush(block, options);
        this.controls.setDisplayMode('clock');

        const startTime = options?.startTime ?? new Date();

        return [
            ...controlActions,
            // Register global event handler for controls
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
        // Since we don't have runtime here, we can't create blocks if behaviors depend on runtime construction.
        // But loopCoordinator uses CompileAndPushBlockAction which is stateless here.

        switch (this.state) {
            case RootState.INITIAL_IDLE: {
                this.state = RootState.EXECUTING;

                const timer = block.getBehavior(TimerBehavior);
                if (timer) {
                    timer.resume(now);
                } else {
                    console.error('RootLifecycleBehavior: Root timer not found!');
                }

                this.updateExecutionControls();
                this.controls.setDisplayMode('timer');

                return [
                    new SetWorkoutStateAction('running'),
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

                    this.controls.clearButtons();

                    const startTime = options?.completedAt ?? block.executionTiming?.completedAt ?? now;
                    return [
                        ...actions,
                        new SetWorkoutStateAction('complete'),
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
        // We use a separate handler registered in memory to handle events globally
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
                    // Pop the initial idle block to start execution
                    return [new PopBlockAction()];
                }
                break;

            case 'timer:pause':
                if (timer) {
                    timer.pause(now);
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
                    timer.resume(now);
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
                if (timer) timer.stop(now);

                this.state = RootState.FINAL_IDLE;

                // Update controls
                this.controls.clearButtons();

                const startTime = block.executionTiming?.completedAt ?? now;
                return [
                    new SetWorkoutStateAction('complete'),
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
}
