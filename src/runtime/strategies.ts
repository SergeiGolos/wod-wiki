import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BlockKey } from "../core/models/BlockKey";
import { ICodeStatement, CodeStatement } from "../core/models/CodeStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { FragmentType } from "../core/models/CodeFragment";
import { TimerBehavior } from "./behaviors/TimerBehavior";
import { BlockContext } from "./BlockContext";
import { CompletionBehavior } from "./behaviors/CompletionBehavior";
import { MemoryTypeEnum } from "./MemoryTypeEnum";
import { LoopCoordinatorBehavior, LoopType } from "./behaviors/LoopCoordinatorBehavior";
import { HistoryBehavior } from "./behaviors/HistoryBehavior";
import { EffortBlock } from "./blocks/EffortBlock";


export class EffortStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        if (!statements[0].fragments) return false;

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);

        // Only match if NO timer AND NO rounds (pure effort)
        return !hasTimer && !hasRounds;
    }
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {


        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext (may not need memory allocation for simple effort blocks)
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // 4. Extract reps from fragment OR inherit from parent's public metric
        let reps: number | undefined = undefined;
        
        // First, check if fragment explicitly specifies reps
        const fragments = code[0]?.fragments || [];
        const repsFragment = fragments.find(f => f.fragmentType === FragmentType.Effort);
        if (repsFragment && typeof repsFragment.value === 'number') {
          reps = repsFragment.value;

        }
        
        // If no explicit reps, check for inherited reps from parent blocks
        if (reps === undefined) {
          const publicRepsRefs = runtime.memory.search({
            type: MemoryTypeEnum.METRIC_REPS,
            visibility: 'public',
            id: null,
            ownerId: null
          });
          
          if (publicRepsRefs.length > 0) {
            // Use the most recent public reps metric (last in array)
            const latestRepsRef = publicRepsRefs[publicRepsRefs.length - 1];
            const inheritedReps = runtime.memory.get(latestRepsRef as any);
            if (inheritedReps !== undefined) {
              reps = inheritedReps as number;

            }
          }
        }
        
        // 5. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // Effort blocks are leaf nodes that complete on first next() call (not on push)
        // This prevents recursion during mount where push -> complete -> pop -> next -> push...
        // TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here
        
        // For generic Effort blocks (no reps), we want them to complete ONLY on user 'next' action
        // NOT on periodic 'tick' (which calls next())
        // So we disable checkOnNext, and rely on triggerEvents=['next']
        behaviors.push(new CompletionBehavior(
            () => true, // Always complete when checked
            ['next'], // Check on 'next' event (User Action)
            false, // Don't check on push
            false  // Don't check on next() (Tick)
        ));

        // 6. Create RuntimeBlock with context
        // Use EffortBlock if reps are specified, otherwise fallback to generic RuntimeBlock
        // This ensures proper rep tracking and completion logic
        if (reps !== undefined) {

            return new EffortBlock(
                runtime,
                code[0]?.id ? [code[0].id] : [],
                {
                    exerciseName: (code[0] as any)?.exerciseName || "Exercise",
                    targetReps: reps
                }
            );
        }

        const block = new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort",
            "Effort"
        );
        
        return block;
    }
}

/**
 * Strategy that creates timer-based parent blocks for time-bound workouts.
 * Matches statements with Timer fragments (e.g., "20:00 AMRAP").
 */
export class TimerStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('TimerStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('TimerStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        return fragments.some(f => f.fragmentType === FragmentType.Timer);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {


        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // 4. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];
        
        // Add timer behavior (Count Up)
        const timerBehavior = new TimerBehavior('up', undefined, 'For Time');
        behaviors.push(timerBehavior);
        behaviors.push(new HistoryBehavior("Timer"));

        // Add LoopCoordinator if children exist (Fixed 1 round)
        const children = code[0]?.children || [];
        let loopCoordinator: LoopCoordinatorBehavior | undefined;
        
        if (children.length > 0) {
             loopCoordinator = new LoopCoordinatorBehavior({
                childGroups: children,
                loopType: LoopType.FIXED,
                totalRounds: 1
            });
            behaviors.push(loopCoordinator);
        }

        // Add CompletionBehavior
        // Complete when children complete (if any), otherwise manual completion?
        // For simple timer, maybe it never completes automatically unless children complete?
        behaviors.push(new CompletionBehavior(
            (_rt, block) => {
                if (loopCoordinator) {
                    return loopCoordinator.isComplete(_rt, block);
                }
                return false; // Simple timer runs until stopped manually
            },
            ['timer:complete', 'children:complete']
        ));

        // 6. Create RuntimeBlock
        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Timer",
            "For Time"
        );
    }
}

// NOTE: Old strategies using RuntimeMetric[] interface - commented out as they have incorrect signatures
// These reference undefined block types and use the old parameter interface

/**
 * A strategy that creates a CountdownParentBlock for countdown timers.
 * DEPRECATED: Uses old RuntimeMetric[] interface
 */
// export class CountdownStrategy implements IRuntimeBlockStrategy {
//     compile(metrics: RuntimeMetric[], _runtime: IScriptRuntime): IRuntimeBlock | undefined {
//         const hasCountdownTimer = metrics.some(m =>
//             m.values.some(v => v.type === 'time' && v.value !== undefined && v.value < 0)
//         );
//
//         console.log(`  🧠 CountdownStrategy - has countdown timer: ${hasCountdownTimer}`);
//
//         if (hasCountdownTimer) {
//             return new CountdownParentBlock(new BlockKey('countdown'), metrics);
//         }
//         return undefined;
//     }
// }

/**
 * Strategy that creates rounds-based parent blocks for multi-round workouts.
 * Matches statements with Rounds fragments but NOT Timer fragments.
 * Timer takes precedence over Rounds.
 */
export class RoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('RoundsStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('RoundsStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);

        // Match rounds BUT NOT timer (timer takes precedence)
        return hasRounds && !hasTimer;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {


        // Extract rounds configuration from fragments
        const fragments = code[0]?.fragments || [];
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
        
        if (!roundsFragment) {
          console.error('RoundsStrategy: No Rounds fragment found');
          throw new Error('RoundsStrategy requires Rounds fragment');
        }

        // Extract rep scheme
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
          repScheme = roundsFragment.value as number[];
          totalRounds = repScheme.length;
        } else if (typeof roundsFragment.value === 'number') {
          totalRounds = roundsFragment.value;
        }

        // Get children IDs
        let children = code[0]?.children || [];
        
        if (children.length === 0 && code.length > 1) {
          const siblingIds = code.slice(1).map(s => s.id as number);
          children = [siblingIds];
        } else if (children.length === 0) {
          throw new Error(`RoundsStrategy requires child statements to execute.`);
        }

        // Create BlockContext
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (code[0] as any)?.exerciseId || '';
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];
        
        const loopType = repScheme ? LoopType.REP_SCHEME : LoopType.FIXED;
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType,
            totalRounds,
            repScheme
        });
        behaviors.push(loopCoordinator);
        behaviors.push(new HistoryBehavior("Rounds"));

        // Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['rounds:complete']
        ));

        // Allocate public reps metric if rep scheme
        if (repScheme && repScheme.length > 0) {
             context.allocate(
                MemoryTypeEnum.METRIC_REPS,
                repScheme[0],
                'public'
            );
            
            // Note: RoundsBlock had logic to update this metric on next().
            // LoopCoordinatorBehavior doesn't inherently update memory.
            // We might need a MetricBehavior or handle it in LoopCoordinator.
            // For now, let's assume LoopCoordinator handles context passing or we add a listener?
            // Actually, RoundsBlock.next() did this.
            // We can add a custom behavior or hook here if needed.
            // But LoopCoordinatorBehavior has getRepsForCurrentRound().
            // Let's add a simple behavior to update the metric on next.
            behaviors.push({
                onNext: (rt, _blk) => {
                    const currentReps = loopCoordinator.getRepsForCurrentRound();
                    if (currentReps !== undefined) {
                         // Find the memory ref we just allocated?
                         // Or just search for it.
                         const refs = rt.memory.search({ 
                             type: MemoryTypeEnum.METRIC_REPS, 
                             ownerId: blockId,
                             id: null,
                             visibility: null
                         });
                         if (refs.length > 0) {
                             rt.memory.set(refs[0] as any, currentReps);
                         }
                    }
                    return [];
                }
            });
        }

        const label = repScheme ? repScheme.join('-') : `${totalRounds} Rounds`;

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Rounds",
            label
        );
    }
}

// DEPRECATED: TimeBoundedRoundsStrategy - Uses old RuntimeMetric[] interface
// export class TimeBoundedRoundsStrategy implements IRuntimeBlockStrategy { ... }

// DEPRECATED: CountdownRoundsStrategy - Uses old RuntimeMetric[] interface
// export class CountdownRoundsStrategy implements IRuntimeBlockStrategy { ... }

// DEPRECATED: TimerStrategy (duplicate) - Uses old RuntimeMetric[] interface
// export class TimerStrategy implements IRuntimeBlockStrategy { ... }

// DEPRECATED: TimeBoundStrategy - Uses old RuntimeMetric[] interface
// export class TimeBoundStrategy implements IRuntimeBlockStrategy { ... }

// DEPRECATED: Legacy compatibility strategies - Use old RuntimeMetric[] interface
// export class BoundedLoopingStrategy implements IRuntimeBlockStrategy { ... }
// export class BoundedLoopingParentStrategy implements IRuntimeBlockStrategy { ... }
// export class TimeBoundedLoopingStrategy implements IRuntimeBlockStrategy { ... }

/**
 * Strategy that creates interval-based parent blocks for EMOM workouts.
 * Matches statements with Timer + Action fragments (e.g., "EMOM 10" or "every 1 minute for 10 minutes").
 * 
 * EMOM = Every Minute On the Minute
 * Example: "EMOM 10\n  5 Pullups\n  10 Pushups"
 * - Executes child exercises at the start of each minute
 * - Continues for specified number of intervals
 * 
 * Implementation Status: PARTIAL - Match logic complete, compile logic needs full implementation
 * 
 * TODO: Full compile() implementation requires:
 * 1. Extract interval duration from Timer fragment (e.g., 60000ms from "1:00")
 * 2. Extract total intervals from Rounds fragment or Action value
 * 3. Extract child statements from code[0].children
 * 4. Create LoopCoordinatorBehavior with:
 *    - loopType: LoopType.INTERVAL
 *    - childGroups: [childStatements]
 *    - totalRounds: totalIntervals
 *    - intervalDurationMs: intervalDuration
 * 5. Create RuntimeBlock with the loop coordinator behavior
 * 6. Block should emit interval:start and interval:complete events
 */
export class IntervalStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('IntervalStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('IntervalStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasEmomAction = fragments.some(f => 
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('EMOM')
        );

        // Match if has Timer AND Action/Effort with "EMOM"
        // This takes precedence over simple TimerStrategy
        return hasTimer && hasEmomAction;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {


        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (code[0] as any)?.exerciseId || '';
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // Extract interval duration and rounds
        // Placeholder values for now
        const intervalDurationMs = 60000; 
        const totalRounds = 10;
        const children = code[0]?.children || [];

        const behaviors: IRuntimeBehavior[] = [];
        
        // Loop Coordinator (Interval)
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType: LoopType.INTERVAL,
            totalRounds,
            intervalDurationMs
        });
        behaviors.push(loopCoordinator);
        behaviors.push(new HistoryBehavior("EMOM"));

        // Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['interval:complete']
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Interval",
            "EMOM"
        );
    }
}

/**
 * Strategy that creates time-bound rounds blocks for AMRAP workouts.
 * Matches statements with Timer + (Rounds OR Action="AMRAP").
 * 
 * AMRAP = As Many Rounds As Possible
 * Example: "20:00 AMRAP\n  5 Pullups\n  10 Pushups"
 * - Executes as many rounds as possible within time limit
 * - Timer runs down, rounds are unlimited
 * 
 * This strategy has higher precedence than TimerStrategy and RoundsStrategy
 * because it combines both concepts.
 * 
 * Implementation Status: PARTIAL - Match logic complete, compile logic needs full implementation
 * 
 * TODO: Full compile() implementation requires:
 * 1. Extract timer duration from Timer fragment (e.g., 1200000ms from "20:00")
 * 2. Extract child statements from code[0].children
 * 3. Create TimerBlock with direction='down' and durationMs
 * 4. Create nested RoundsBlock with:
 *    - loopType: LoopType.TIME_BOUND (infinite until timer expires)
 *    - childGroups: [childStatements]
 *    - totalRounds: Infinity or large number
 * 5. TimerBlock wraps the RoundsBlock as its child
 * 6. Completion: when timer expires
 * 7. Block should track completed rounds for display
 */
export class TimeBoundRoundsStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('TimeBoundRoundsStrategy: No statements provided');
            return false;
        }

        if (!statements[0].fragments) {
            console.warn('TimeBoundRoundsStrategy: Statement missing fragments array');
            return false;
        }

        const fragments = statements[0].fragments;
        const hasTimer = fragments.some(f => f.fragmentType === FragmentType.Timer);
        const hasRounds = fragments.some(f => f.fragmentType === FragmentType.Rounds);
        const hasAmrapAction = fragments.some(f => 
            (f.fragmentType === FragmentType.Action || f.fragmentType === FragmentType.Effort) &&
            (f.value as string)?.toUpperCase().includes('AMRAP')
        );

        // Match if has Timer AND (Rounds OR AMRAP action/effort)
        return hasTimer && (hasRounds || hasAmrapAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {


        const stmt = code[0];
        const fragments = stmt.fragments || [];;

        // Extract timer duration
        const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer);
        let durationMs: number | undefined;
        if (timerFragment && timerFragment.value) {
            const timeStr = String(timerFragment.value);
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                const minutes = parseInt(parts[0], 10);
                const seconds = parseInt(parts[1], 10);
                durationMs = (minutes * 60 + seconds) * 1000;
            }
        }

        if (!durationMs || durationMs <= 0) {
            durationMs = 20 * 60 * 1000; // Default 20 mins
        }

        // Extract children
        const children = stmt.children || [];

        // Create BlockContext
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (stmt as any)?.exerciseId || '';
        const context = new BlockContext(runtime, blockId, exerciseId);

        // Create Behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // 1. Timer Behavior (Countdown)
        const timerBehavior = new TimerBehavior('down', durationMs, 'AMRAP');
        behaviors.push(timerBehavior);
        behaviors.push(new HistoryBehavior("AMRAP"));

        // 2. Loop Coordinator (Time Bound / Infinite)
        const loopCoordinator = new LoopCoordinatorBehavior({
            childGroups: children,
            loopType: LoopType.TIME_BOUND,
            totalRounds: Infinity // Run until timer expires
        });
        behaviors.push(loopCoordinator);

        // 3. Completion Behavior
        behaviors.push(new CompletionBehavior(
            (_rt, block) => loopCoordinator.isComplete(_rt, block),
            ['timer:complete', 'children:complete']
        ));

        const label = `${Math.floor(durationMs / 60000)}:${String(Math.floor((durationMs % 60000) / 1000)).padStart(2, '0')} AMRAP`;

        return new RuntimeBlock(
            runtime,
            stmt.id ? [stmt.id] : [],
            behaviors,
            context,
            blockKey,
            "Timer", // It's technically a Timer block structure
            label
        );
    }
}

/**
 * Strategy that creates group blocks for nested/grouped exercises.
 * Matches statements that have child statements (nested structure).
 * 
 * Example: "(3 rounds)\n  (2 rounds)\n    5 Pullups"
 * - Creates hierarchical block structure
 * - Parent groups contain child blocks
 * - Enables complex workout composition
 * 
 * This strategy should be evaluated after specific strategies (Timer, Rounds, etc.)
 * but before the fallback EffortStrategy.
 * 
 * Implementation Status: PARTIAL - Match logic complete, compile logic needs full implementation
 * 
 * TODO: Full compile() implementation requires:
 * 1. Extract child statements from code[0].children
 * 2. Create container RuntimeBlock with blockType="Group"
 * 3. Set up LoopCoordinatorBehavior to manage child compilation:
 *    - loopType: LoopType.FIXED with totalRounds=1 (execute once)
 *    - childGroups: [childStatements]
 * 4. Pass compilation context to children
 * 5. Handle nested groups recursively
 * 6. Group completes when all children complete
 * 
 * Note: Groups are primarily structural containers. The parent block
 * (e.g., RoundsBlock) typically handles the looping logic, and groups
 * just organize exercises hierarchically.
 */
export class GroupStrategy implements IRuntimeBlockStrategy {
    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) {
            console.warn('GroupStrategy: No statements provided');
            return false;
        }

        // Match if statement has children
        // This indicates a nested/grouped structure
        const hasChildren = statements[0].children && statements[0].children.length > 0;
        
        return hasChildren;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {

        console.warn(`  ⚠️  GroupStrategy.compile() is a placeholder - full implementation pending`);

        // Placeholder implementation - creates a simple block
        // Full implementation will use LoopCoordinatorBehavior to manage children
        
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new CompletionBehavior(
            () => true, // Temporary - should check children completion
            []
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Group"
        );
    }
}

// NOTE: All old strategies using RuntimeMetric[] have been commented out
// They reference undefined block types and have incorrect interface signatures
// The working strategies are: EffortStrategy, TimerStrategy, RoundsStrategy, 
// IntervalStrategy, TimeBoundRoundsStrategy, and GroupStrategy (above)
