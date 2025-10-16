
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BlockKey } from "../BlockKey";
import { ICodeStatement } from "@/CodeStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { FragmentType } from "../CodeFragment";
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { TimerBehavior, TIMER_MEMORY_TYPES } from "./behaviors/TimerBehavior";
import { BlockContext } from "./BlockContext";
import { CompletionBehavior } from "./behaviors/CompletionBehavior";

/**
 * The default strategy that creates a simple EffortBlock for repetition-based workouts.
 * This is the fallback strategy that always matches.
 */
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
    compile(code: ICodeStatement[], runtime: IScriptRuntime, _context?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 EffortStrategy compiling ${code.length} statement(s)`);

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext (may not need memory allocation for simple effort blocks)
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // TODO Phase 2.5: Use _context parameter to inherit reps if not explicitly set
        
        // 4. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // Effort blocks without children are leaf nodes - complete immediately
        // TODO: If we need to support effort blocks with children, add LoopCoordinatorBehavior here
        behaviors.push(new CompletionBehavior(
            () => true, // Always complete (leaf node)
            [] // Check on push
        ));

        // 5. Create RuntimeBlock with context
        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Effort"
        );
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

    compile(code: ICodeStatement[], runtime: IScriptRuntime, _context?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 TimerStrategy compiling ${code.length} statement(s)`);

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // TODO Phase 2.5: Use _context parameter if needed
        
        // 4. Allocate timer memory
        const timeSpansRef = context.allocate(
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

    compile(code: ICodeStatement[], runtime: IScriptRuntime, _parentContext?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 RoundsStrategy compiling ${code.length} statement(s)`);

        // Note: RoundsStrategy should delegate to RoundsBlock which uses LoopCoordinatorBehavior
        // For now, create a simple leaf node. Full RoundsBlock integration requires importing from blocks/
        
        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Extract exerciseId from statement (if available)
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        // 3. Create BlockContext
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        // TODO Phase 2.6: Use RoundsBlock directly instead of manually creating behaviors
        // This strategy should create a RoundsBlock instance which handles LoopCoordinatorBehavior internally
        
        // 4. Create simple completion behavior for now
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new CompletionBehavior(
            () => true, // Temporary - RoundsBlock should manage completion
            [] // Check on push
        ));

        // 5. Create RuntimeBlock with context
        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "Rounds"
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
        const hasAction = fragments.some(f => 
            f.fragmentType === FragmentType.Action && 
            (f.value as string)?.toUpperCase().includes('EMOM')
        );

        // Match if has Timer AND Action with "EMOM"
        // This takes precedence over simple TimerStrategy
        return hasTimer && hasAction;
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime, _context?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 IntervalStrategy compiling ${code.length} statement(s)`);

        // TODO: This is a placeholder implementation
        // Full implementation requires:
        // 1. Extract interval duration from Timer fragment
        // 2. Extract total intervals from Action fragment or child count
        // 3. Create RuntimeBlock with LoopCoordinatorBehavior using LoopType.INTERVAL
        // 4. Configure intervalDurationMs in loop config
        
        // For now, create a simple placeholder block
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
            f.fragmentType === FragmentType.Action && 
            (f.value as string)?.toUpperCase().includes('AMRAP')
        );

        // Match if has Timer AND (Rounds OR AMRAP action)
        return hasTimer && (hasRounds || hasAmrapAction);
    }

    compile(code: ICodeStatement[], runtime: IScriptRuntime, _context?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 TimeBoundRoundsStrategy compiling ${code.length} statement(s)`);

        // TODO: This is a placeholder implementation
        // Full implementation requires:
        // 1. Extract timer duration from Timer fragment
        // 2. Create TimerBlock (countdown)
        // 3. Create child RoundsBlock with LoopType.TIME_BOUND (infinite rounds)
        // 4. TimerBlock wraps the RoundsBlock
        // 5. Completion: when timer expires OR user stops
        
        // For now, create a simple placeholder block
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        const exerciseId = (code[0] as any)?.exerciseId || '';
        
        const context = new BlockContext(runtime, blockId, exerciseId);
        
        const behaviors: IRuntimeBehavior[] = [];
        behaviors.push(new CompletionBehavior(
            () => true, // Temporary - should check timer completion
            []
        ));

        return new RuntimeBlock(
            runtime,
            code[0]?.id ? [code[0].id] : [],
            behaviors,
            context,
            blockKey,
            "TimeBoundRounds"
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

    compile(code: ICodeStatement[], runtime: IScriptRuntime, _context?: import("./CompilationContext").CompilationContext): IRuntimeBlock {
        console.log(`  🧠 GroupStrategy compiling ${code.length} statement(s) with ${code[0].children?.length || 0} children`);

        // TODO: This is a placeholder implementation
        // Full implementation requires:
        // 1. Create container RuntimeBlock with blockType="Group"
        // 2. Set up LoopCoordinatorBehavior to manage child compilation
        // 3. Pass compilation context to children
        // 4. Handle nested groups recursively
        
        // For now, create a simple placeholder block
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
