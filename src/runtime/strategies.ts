
import { IRuntimeBlockStrategy } from "./IRuntimeBlockStrategy";
import { RuntimeMetric } from "./RuntimeMetric";
import { IRuntimeBlock } from "./IRuntimeBlock";
import { IScriptRuntime } from "./IScriptRuntime";
import { BlockKey } from "../BlockKey";
import { ICodeStatement, CodeStatement } from "@/CodeStatement";
import { RuntimeBlock } from "./RuntimeBlock";
import { FragmentType } from "../CodeFragment";
import { ChildAdvancementBehavior } from "./behaviors/ChildAdvancementBehavior";
import { LazyCompilationBehavior } from "./behaviors/LazyCompilationBehavior";
import { IRuntimeBehavior } from "./IRuntimeBehavior";
import { TimerBehavior, TIMER_MEMORY_TYPES } from "./behaviors/TimerBehavior";
import { RoundsBehavior, ROUNDS_MEMORY_TYPES } from "./behaviors/RoundsBehavior";
import { BlockContext } from "./BlockContext";
import { CompletionBehavior } from "./behaviors/CompletionBehavior";
import { BlockCompleteEventHandler } from "./behaviors/BlockCompleteEventHandler";

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
    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        console.log(`  🧠 EffortStrategy compiling ${code.length} statement(s)`);

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Create BlockContext (may not need memory allocation for simple effort blocks)
        const context = new BlockContext(runtime, blockId);
        
        // 3. Create behaviors
        const behaviors: IRuntimeBehavior[] = [];

        // Add child behaviors if statement has children
        if (code[0] && code[0].children && code[0].children.length > 0 && runtime.script) {
            // Resolve child statement IDs to actual statements
            const childIds = code[0].children.flat();
            const childStatements = runtime.script.getIds(childIds);
            behaviors.push(new ChildAdvancementBehavior(childStatements as CodeStatement[]));
            behaviors.push(new LazyCompilationBehavior());
            
            // Register handler to pop completed child blocks
            const handler = new BlockCompleteEventHandler(blockId);
            runtime.memory.allocate('handler', blockId, handler, 'private');
        } else {
            // Leaf node - complete immediately when pushed
            behaviors.push(new CompletionBehavior(
                () => true, // Always complete (leaf node)
                [] // Check on push
            ));
        }

        // 4. Create RuntimeBlock with context
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

    compile(code: ICodeStatement[], runtime: IScriptRuntime): IRuntimeBlock {
        console.log(`  🧠 TimerStrategy compiling ${code.length} statement(s)`);

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Create BlockContext
        const context = new BlockContext(runtime, blockId);
        
        // 3. Allocate timer memory
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
        
        // 4. Create behaviors with injected memory
        const behaviors: IRuntimeBehavior[] = [];
        
        // Add timer behavior with memory injection
        // TODO: Extract timer configuration from fragments (direction, duration)
        behaviors.push(new TimerBehavior('up', undefined, timeSpansRef, isRunningRef));

        // Add child behaviors if statement has children
        if (code[0] && code[0].children && code[0].children.length > 0 && runtime.script) {
            // Resolve child statement IDs to actual statements
            const childIds = code[0].children.flat();
            const childStatements = runtime.script.getIds(childIds);
            behaviors.push(new ChildAdvancementBehavior(childStatements as CodeStatement[]));
            behaviors.push(new LazyCompilationBehavior());
            
            // Register handler to pop completed child blocks
            const handler = new BlockCompleteEventHandler(blockId);
            runtime.memory.allocate('handler', blockId, handler, 'private');
        }

        // 5. Create RuntimeBlock with context
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

        // 1. Generate BlockKey
        const blockKey = new BlockKey();
        const blockId = blockKey.toString();
        
        // 2. Create BlockContext
        const context = new BlockContext(runtime, blockId);
        
        // 3. Extract rounds configuration from fragments
        const fragments = code[0]?.fragments || [];
        const roundsFragment = fragments.find(f => f.fragmentType === FragmentType.Rounds);
        const totalRounds = (roundsFragment?.value as number) || 3; // Default to 3 rounds
        
        // 4. Allocate rounds memory
        const roundsStateRef = context.allocate(
            ROUNDS_MEMORY_TYPES.STATE,
            {
                currentRound: 0,
                totalRounds: totalRounds,
                completedRounds: 0,
            },
            'public'
        );
        
        // 5. Create behaviors with injected memory
        const behaviors: IRuntimeBehavior[] = [];
        
        // Add RoundsBehavior with memory injection
        // TODO: Extract rep scheme if variable reps
        behaviors.push(new RoundsBehavior(totalRounds, undefined, roundsStateRef));

        // Add child behaviors if statement has children
        if (code[0] && code[0].children && code[0].children.length > 0 && runtime.script) {
            // Resolve child statement IDs to actual statements
            const childIds = code[0].children.flat();
            const childStatements = runtime.script.getIds(childIds);
            behaviors.push(new ChildAdvancementBehavior(childStatements as CodeStatement[]));
            behaviors.push(new LazyCompilationBehavior());
            
            // Register handler to pop completed child blocks
            const handler = new BlockCompleteEventHandler(blockId);
            runtime.memory.allocate('handler', blockId, handler, 'private');
        }

        // 6. Create RuntimeBlock with context
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

// NOTE: All old strategies using RuntimeMetric[] have been commented out
// They reference undefined block types and have incorrect interface signatures
// The working strategies are: EffortStrategy, TimerStrategy, and RoundsStrategy (above)
