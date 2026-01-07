import { IRuntimeAction } from '../contracts/IRuntimeAction';
import { IRuntimeBehavior } from '../contracts/IRuntimeBehavior';
import { IRuntimeBlock } from '../contracts/IRuntimeBlock';
import { IRuntimeClock } from '../contracts/IRuntimeClock';
import { IScriptRuntime } from '../contracts/IScriptRuntime';
import { IEvent } from '../contracts/events/IEvent';
import { PopToBlockAction } from '../actions/stack/PopToBlockAction';
import { SkipCurrentBlockAction } from '../actions/stack/SkipCurrentBlockAction';
import { CompileAndPushBlockAction } from '../actions/stack/CompileAndPushBlockAction';
import { SubscribeEventAction, UnsubscribeEventAction } from '../actions/events/EventSubscriptionActions';
import { ClearButtonsAction } from '../actions/display/ControlActions';
import { TimerBehavior } from './TimerBehavior';
import { ChildIndexBehavior } from './ChildIndexBehavior';
import { RoundPerLoopBehavior } from './RoundPerLoopBehavior';
import { WorkoutStateBehavior } from './WorkoutStateBehavior';
import { DisplayModeBehavior } from './DisplayModeBehavior';
import { WorkoutFlowStateMachine } from './WorkoutFlowStateMachine';
import { IdleInjectionBehavior } from './IdleInjectionBehavior';

/**
 * Configuration for WorkoutOrchestrator
 */
export interface WorkoutOrchestratorConfig {
    /** Child statement ID groups to execute in order */
    childGroups: number[][];
    /** Total rounds (default 1) */
    totalRounds?: number;
}

/**
 * WorkoutOrchestrator - Coordinates decomposed behaviors during workout lifecycle.
 * 
 * This behavior acts as the "glue" between the decomposed single-responsibility
 * behaviors, invoking them at the right times during phase transitions.
 * 
 * It handles:
 * - Phase transitions (pre-start → executing → completing → complete)
 * - Event handling (timer:start, timer:next, workout:complete)
 * - Child index/round management
 * - Coordinating idle block injection
 * 
 * Unlike the old RootLifecycleBehavior, this behavior delegates all state
 * management and side effects to the other behaviors it orchestrates.
 */
export class WorkoutOrchestrator implements IRuntimeBehavior {
    private controlHandlerId?: string;
    private readonly childGroups: number[][];
    private readonly totalRounds: number;
    private _isComplete = false;

    constructor(config: WorkoutOrchestratorConfig) {
        this.childGroups = config.childGroups;
        this.totalRounds = config.totalRounds ?? 1;
    }

    onPush(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        this.controlHandlerId = `workout-orchestrator-${block.key.toString()}`;

        // Phase behavior (WorkoutFlowStateMachine) starts in 'pre-start' by default
        // and is accessed via getBehavior when needed

        // Initialize child index behavior
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (childIndex) {
            childIndex.onPush?.(block, clock);
        }

        // Initialize round behavior
        const roundBehavior = block.getBehavior(RoundPerLoopBehavior);
        if (roundBehavior) {
            roundBehavior.onPush?.(block, clock);
        }

        // Subscribe to events
        return [
            new SubscribeEventAction(
                '*',
                this.controlHandlerId,
                block.key.toString(),
                (event, runtime) => this.handleEvent(event, runtime, block),
                'bubble'
            )
        ];
    }

    onNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const flowState = block.getBehavior(WorkoutFlowStateMachine);
        if (!flowState) return [];

        const phase = flowState.getPhase();
        const actions: IRuntimeAction[] = [];

        switch (phase) {
            case 'pre-start':
                // Idle was dismissed, start executing
                return this.transitionToExecuting(block, clock);

            case 'executing':
                // Child completed, run next child or complete
                return this.handleExecutionNext(block, clock);

            case 'completing':
                // Transitioning to final idle
                flowState.transition('post-complete');
                return [];

            case 'post-complete':
                // Final idle dismissed, complete workout
                flowState.transition('complete');
                // Mark block as complete - stack will pop it during sweep
                block.markComplete('workout-post-complete');
                return [];

            case 'complete':
                // Nothing to do
                return [];
        }

        return actions;
    }

    onPop(_block: IRuntimeBlock, _clock: IRuntimeClock): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];

        if (this.controlHandlerId) {
            actions.push(new UnsubscribeEventAction(this.controlHandlerId));
            this.controlHandlerId = undefined;
        }

        return actions;
    }

    onDispose(_block: IRuntimeBlock): void {
        this.controlHandlerId = undefined;
    }

    private transitionToExecuting(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        const flowState = block.getBehavior(WorkoutFlowStateMachine);
        const workoutState = block.getBehavior(WorkoutStateBehavior);
        const displayMode = block.getBehavior(DisplayModeBehavior);
        const timer = block.getBehavior(TimerBehavior);

        // Transition phase
        flowState?.transition('executing');

        // Update workout state
        if (workoutState) {
            actions.push(...workoutState.setState('running'));
        }

        // Update display mode
        if (displayMode) {
            actions.push(...displayMode.setMode('timer'));
        }

        // Start timer
        if (timer) {
            timer.resume(clock.now);
        }

        // Push first child
        actions.push(...this.pushNextChild(block, clock));

        return actions;
    }

    private handleExecutionNext(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        const childIndex = block.getBehavior(ChildIndexBehavior);
        const roundBehavior = block.getBehavior(RoundPerLoopBehavior);

        if (!childIndex) return actions;

        // Advance child index
        childIndex.onNext?.(block, clock);

        // Check if wrapped (completed a full loop)
        if (childIndex.hasJustWrapped && roundBehavior) {
            roundBehavior.onNext?.(block, clock);
        }

        // Check completion
        const currentRound = roundBehavior?.getRound() ?? 1;
        if (currentRound > this.totalRounds) {
            this._isComplete = true;
            return this.transitionToComplete(block, clock);
        }

        // Push next child
        actions.push(...this.pushNextChild(block, clock));

        return actions;
    }

    private pushNextChild(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const childIndex = block.getBehavior(ChildIndexBehavior);
        if (!childIndex) return [];

        const currentIndex = childIndex.getIndex();
        if (currentIndex < 0 || currentIndex >= this.childGroups.length) {
            return [];
        }

        const childGroupIds = this.childGroups[currentIndex];
        if (!childGroupIds || childGroupIds.length === 0) {
            return [];
        }

        return [new CompileAndPushBlockAction(childGroupIds, { startTime: clock.now })];
    }

    private transitionToComplete(block: IRuntimeBlock, clock: IRuntimeClock): IRuntimeAction[] {
        const actions: IRuntimeAction[] = [];
        const flowState = block.getBehavior(WorkoutFlowStateMachine);
        const workoutState = block.getBehavior(WorkoutStateBehavior);
        const timer = block.getBehavior(TimerBehavior);

        // Transition phase
        flowState?.transition('completing');

        // Update workout state
        if (workoutState) {
            actions.push(...workoutState.setState('complete'));
        }

        // Stop timer
        if (timer) {
            timer.stop(clock.now);
        }

        // Clear buttons
        actions.push(new ClearButtonsAction());

        // Inject end idle
        const endIdleBehavior = this.findEndIdleBehavior(block);
        if (endIdleBehavior) {
            actions.push(...endIdleBehavior.injectEndIdle(clock));
        }

        return actions;
    }

    private findEndIdleBehavior(block: IRuntimeBlock): IdleInjectionBehavior | undefined {
        // Find the 'end' phase idle injection behavior
        // This is a workaround since we can't use getBehavior with a predicate
        const behaviors = (block as any).behaviors as IRuntimeBehavior[];
        if (!behaviors) return undefined;

        return behaviors.find(b =>
            b instanceof IdleInjectionBehavior &&
            b.getConfig().id.includes('end')
        ) as IdleInjectionBehavior | undefined;
    }

    private handleEvent(event: IEvent, runtime: IScriptRuntime, block: IRuntimeBlock): IRuntimeAction[] {
        const flowState = block.getBehavior(WorkoutFlowStateMachine);
        const timer = block.getBehavior(TimerBehavior);
        const now = event.timestamp ?? runtime.clock.now;

        switch (event.name) {
            case 'timer:start':
                if (flowState?.getPhase() === 'pre-start') {
                    // Mark the current idle block as complete - stack will pop it during sweep
                    const currentBlock = runtime.stack.current;
                    if (currentBlock && currentBlock !== block) {
                        currentBlock.markComplete('timer-started');
                    }
                    return [];
                }
                break;

            case 'timer:next':
                // Skip current block - let user advance
                return [new SkipCurrentBlockAction(block.key.toString())];

            case 'workout:complete':
                if (flowState?.getPhase() !== 'executing') {
                    break;
                }

                // Force complete the workout
                this._isComplete = true;

                if (timer) {
                    timer.stop(now);
                }

                const actions: IRuntimeAction[] = [];
                const workoutState = block.getBehavior(WorkoutStateBehavior);
                if (workoutState) {
                    actions.push(...workoutState.setState('complete'));
                }
                actions.push(new ClearButtonsAction());

                // Pop all children first
                if (runtime.stack.current && runtime.stack.current !== block) {
                    actions.push(new PopToBlockAction(block.key.toString()));
                }

                // Inject end idle
                const endIdleBehavior = this.findEndIdleBehavior(block);
                if (endIdleBehavior) {
                    actions.push(...endIdleBehavior.injectEndIdle(runtime.clock));
                }

                flowState?.transition('completing');
                return actions;
        }

        return [];
    }

    /**
     * Check if the workout is complete.
     */
    isComplete(): boolean {
        return this._isComplete;
    }
}
