import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { FragmentType } from "@/core/models/CodeFragment";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";

// New aspect-based behaviors
import { PopOnNextBehavior } from "../../../behaviors/PopOnNextBehavior";
import { SegmentOutputBehavior } from "../../../behaviors/SegmentOutputBehavior";
import { TimerInitBehavior } from "../../../behaviors/TimerInitBehavior";
import { TimerTickBehavior } from "../../../behaviors/TimerTickBehavior";
import { TimerPauseBehavior } from "../../../behaviors/TimerPauseBehavior";
import { TimerOutputBehavior } from "../../../behaviors/TimerOutputBehavior";



/**
 * Helper to extract optional content from code statement.
 */
function getContent(statement: ICodeStatement, defaultContent: string): string {
    const stmt = statement as ICodeStatement & { content?: string };
    if (stmt.content) return stmt.content;

    // Fallback: Construct content from fragments
    if (statement.fragments && statement.fragments.length > 0) {
        return statement.fragments
            .filter(f => f.origin !== 'runtime' && f.image)
            .map(f => f.image)
            .join(' ');
    }

    return defaultContent;
}

/**
 * EffortFallbackStrategy handles simple leaf effort blocks (e.g., "10 Push-ups").
 * 
 * These blocks have no timer, no rounds, and no children — they complete when
 * the user advances. They track elapsed time via a secondary countup timer so
 * the stack display can show how long each effort takes.
 * 
 * Blocks WITH children are excluded from this strategy and handled by
 * GenericGroupStrategy + ChildrenStrategy instead, which properly push child
 * blocks onto the stack via ChildRunnerBehavior.
 * 
 * ## Behaviors Applied:
 * - **TimerInitBehavior** (Time): Countup timer with 'secondary' role
 * - **TimerTickBehavior** (Time): Manages timer spans
 * - **TimerPauseBehavior** (Time): Supports pause/resume
 * - **TimerOutputBehavior** (Output): Emits elapsed time on completion
 * - **PopOnNextBehavior** (Completion): Marks block complete on next()
 * - **SegmentOutputBehavior** (Output): Emits segment/completion outputs
 */
export class EffortFallbackStrategy implements IRuntimeBlockStrategy {
    priority = 0;

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        const statement = statements[0];
        // Ignore runtime-generated fragments when checking for match
        const hasTimer = statement.fragments.some(f => f.fragmentType === FragmentType.Timer && f.origin !== 'runtime');
        const hasRounds = statement.fragments.some(f => f.fragmentType === FragmentType.Rounds && f.origin !== 'runtime');
        // Exclude blocks with children — those are parent blocks handled by
        // GenericGroupStrategy + ChildrenStrategy, not simple leaf efforts
        const hasChildren = statement.children && statement.children.length > 0;
        return !hasTimer && !hasRounds && !hasChildren;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        const statement = statements[0];
        const label = getContent(statement, 'Effort');

        // Create block context
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString());

        // Filter out runtime-generated fragments
        const userFragments = statement.fragments.filter(f => f.origin !== 'runtime');

        // Configure block
        builder
            .setSourceIds(statements.map(s => s.id))
            .setContext(context)
            .setKey(blockKey)
            .setBlockType('effort')
            .setLabel(label);

        // Set fragments to ensure fragment:display memory is allocated
        if (userFragments.length > 0) {
            builder.setFragments([userFragments]);
        }

        // Add behaviors
        // Time Aspect: track elapsed time with a secondary countup timer
        // Role is 'secondary' so effort timers don't steal primary display from parent
        builder.addBehavior(new TimerInitBehavior({
            direction: 'up',
            role: 'secondary',
            label
        }));
        builder.addBehavior(new TimerTickBehavior());
        builder.addBehavior(new TimerPauseBehavior());

        // Completion Aspect: complete on user advance
        builder.addBehavior(new PopOnNextBehavior());

        // Output Aspect: emit elapsed time and segment/completion outputs
        builder.addBehavior(new TimerOutputBehavior());
        builder.addBehavior(new SegmentOutputBehavior({ label }));
    }
}

