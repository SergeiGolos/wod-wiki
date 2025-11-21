import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BlockKey } from "../core/models/BlockKey";
import { ICodeStatement, CodeStatement } from "../core/models/CodeStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { FragmentType } from "../core/models/CodeFragment";
import { TimerBehavior, TIMER_MEMORY_TYPES, TimeSpan } from "./behaviors/TimerBehavior";
import { BlockContext } from "./BlockContext";
import { CompletionBehavior } from "./behaviors/CompletionBehavior";
import { TimerBlock } from "./blocks/TimerBlock";
import { RoundsBlock } from "./blocks/RoundsBlock";
import { MemoryTypeEnum } from "./MemoryTypeEnum";
import { HistoryBehavior } from "./behaviors/HistoryBehavior";


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
        console.log(`  🧠 EffortStrategy compiling ${code.length} statement(s)`);

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
          console.log(`  📊 EffortStrategy: Using explicit reps from fragment: ${reps}`);
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
              console.log(`  📊 EffortStrategy: Inherited reps from parent: ${reps} (from ${latestRepsRef.ownerId})`);
            }
          }
        }
        
        // 5. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // Effort blocks are leaf nodes that complete on first next() call (not on push)
        // This prevents recursion during mount where push -> complete -> pop -> next -> push...
        // TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here
        behaviors.push(new CompletionBehavior(
            () => true, // Always complete when checked
            [], // No event triggers
            false // Don't check on push - only check on next()
        ));

        // 6. Create RuntimeBlock with context
        const block = new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort"
        );

        // 7. Store reps in block for inspection/debugging
        if (reps !== undefined) {
          (block as any).reps = reps;
          console.log(`  ✅ EffortStrategy: Created EffortBlock with ${reps} reps`);
        } else {
          console.log(`  ⚠️  EffortStrategy: Created EffortBlock with no reps specified`);
        }

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
        console.log(`  🧠 TimerStrategy compiling ${code.length} statement(s)`);

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // 4. Allocate timer memory
        const timeSpansRef = context.allocate<TimeSpan[]>(
            TIMER_MEMORY_TYPES.TIME_SPANS,
            [{ start: new Date(), stop: undefined }],
            'public'
        );
        const isRunningRef = context.allocate<boolean>(
            TIMER_MEMORY_TYPES.IS_RUNNING,
            true,
            'public'
        );
        
        // 5. Create behaviors with injected memory
        const behaviors: IRuntimeBehavior[] = [];
        
        // Add timer behavior with memory injection
        // TODO: Extract timer configuration from fragments (direction, duration)
        behaviors.push(new TimerBehavior('up', undefined, timeSpansRef, isRunningRef));

        // TODO: If we need to support timer blocks with children, add LoopCoordinatorBehavior here
        // For now, timer blocks are leaf nodes

        // 6. Create RuntimeBlock with context
        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Timer"
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
        console.log(`  🧠 RoundsStrategy compiling ${code.length} statement(s)`);

        // Extract rounds configuration from fragments
        const fragments = code[0]?.fragments || [];
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
        
        if (!roundsFragment) {
          console.error('RoundsStrategy: No Rounds fragment found');
          throw new Error('RoundsStrategy requires Rounds fragment');
        }

        // Extract rep scheme from fragment value
        // Example: "(21-15-9)" -> [21, 15, 9]
        let totalRounds = 1;
        let repScheme: number[] | undefined = undefined;

        if (Array.isArray(roundsFragment.value)) {
          // Value is already an array of numbers (rep scheme)
          repScheme = roundsFragment.value as number[];
          totalRounds = repScheme.length;
          console.log(`  📊 RoundsStrategy: Rep scheme detected: [${repScheme.join(', ')}]`);
        } else if (typeof roundsFragment.value === 'number') {
          // Value is a single number (fixed rounds)
          totalRounds = roundsFragment.value;
          console.log(`  📊 RoundsStrategy: Fixed rounds detected: ${totalRounds}`);
        }

        // Get children IDs from statement - these are child statement IDs to JIT-compile per round
        let children = code[0]?.children || [];
        
        if (children.length === 0 && code.length > 1) {
          // Parser passed multiple statements: first is rounds, rest are children (siblings)
          // This is a workaround for parsers that don't create parent-child tree structure
          // Wrap sibling statements in a single group
          const siblingIds = code.slice(1).map(s => s.id as number);
          children = [siblingIds]; // Single group containing all siblings
          console.log(`  📊 RoundsStrategy: Using ${siblingIds.length} sibling statements as children`);
        } else if (children.length === 0) {
          // No children available - this is an error condition
          console.error('RoundsStrategy: No children found for rounds block!');
          throw new Error(`RoundsStrategy requires child statements to execute. Statement has no children.`);
        }

        console.log(`  📊 RoundsStrategy: Creating RoundsBlock with ${totalRounds} rounds, ${children.flat().length} child statement IDs`);

        // Create RoundsBlock instance with child IDs (will be JIT-compiled by LoopCoordinator)
        return new RoundsBlock(runtime, code[0]?.id ? [code[0].id] : [], {
          totalRounds,
          repScheme,
          children // Pass number[][] directly - no type casting needed
        });
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
        console.log(`  🧠 IntervalStrategy compiling ${code.length} statement(s)`);
        console.warn(`  ⚠️  IntervalStrategy.compile() is a placeholder - full implementation pending`);

        // Placeholder implementation - creates a simple block
        // Full implementation will use LoopCoordinatorBehavior with LoopType.INTERVAL
        
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new CompletionBehavior(
            () => true, // Temporary - should check interval completion
            []
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Interval"
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
        console.log(`  🧠 TimeBoundRoundsStrategy compiling ${code.length} statement(s)`);

        const stmt = code[0];
        const fragments = stmt.fragments || [];;

        // Extract timer duration from Timer fragment
        const timerFragment = fragments.find(f => f.fragmentType === FragmentType.Timer);
        let durationMs: number | undefined;
        if (timerFragment && timerFragment.value) {
            // Parse duration from fragment value (e.g., "20:00" -> 1200000ms)
            const timeStr = String(timerFragment.value);
            const parts = timeStr.split(':');
            if (parts.length === 2) {
                const minutes = parseInt(parts[0], 10);
                const seconds = parseInt(parts[1], 10);
                durationMs = (minutes * 60 + seconds) * 1000;
            }
        }

        // Extract rounds and rep scheme from Rounds fragment
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
        let totalRounds = 3; // Default
        let repScheme: number[] | undefined;
        
        if (roundsFragment && roundsFragment.value) {
            const roundsValue = String(roundsFragment.value);
            // Check if it's a rep scheme like "(21-15-9)" or simple rounds like "(3)"
            if (roundsValue.includes('-')) {
                // Variable rep scheme
                const repsStr = roundsValue.replace(/[()]/g, '');
                repScheme = repsStr.split('-').map(r => parseInt(r.trim(), 10));
                totalRounds = repScheme.length;
            } else {
                // Fixed rounds
                const roundsStr = roundsValue.replace(/[()]/g, '');
                totalRounds = parseInt(roundsStr, 10) || 3;
            }
        }

        // Extract children IDs (exercises to perform each round)
        const children = stmt.children || [];

        // If no valid timer duration found, use a default (for testing)
        if (!durationMs || durationMs <= 0) {
            console.warn(`TimeBoundRoundsStrategy: Invalid or missing timer duration, using default 20 minutes`);
            durationMs = 20 * 60 * 1000; // Default to 20 minutes
        }

        // TODO: ARCHITECTURAL ISSUE - Need to support nested block compilation
        // Current problem: TimerBlock expects children: number[][] (statement IDs),
        // but we want to wrap a RoundsBlock (pre-compiled block) inside it.
        // 
        // Possible solutions:
        // 1. Create a synthetic "wrapper statement" that RoundsStrategy can compile
        // 2. Add TimerBlock.compiledChildren: IRuntimeBlock[] config option
        // 3. Change JIT compiler to support pre-compiled block insertion
        // 4. Use TimerBehavior + RoundsBehavior in single composite block
        //
        // For now, create RoundsBlock directly (bypasses TimerBlock wrapping)
        console.warn(`TimeBoundRoundsStrategy: Creating RoundsBlock without TimerBlock wrapper (architectural limitation)`);
        
        const roundsBlock = new RoundsBlock(
            runtime,
            stmt.id ? [stmt.id] : [],
            {
                totalRounds,
                repScheme,
                children // Pass number[][] directly - no type casting needed
            }
        );

        return roundsBlock;
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
        console.log(`  🧠 GroupStrategy compiling ${code.length} statement(s) with ${code[0].children?.length || 0} children`);
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
