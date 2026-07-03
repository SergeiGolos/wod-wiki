import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import type { IRuntimeContext } from "../../../contracts/IRuntimeContext";
import { MetricType } from "@/core/models/Metric";
import { compose } from "../../BlockTemplateComposer";
import type { BlockTemplate } from "../../BlockTemplate";

// New aspect-based behaviors
import {
    LabelingBehavior,
    MetricPromotionBehavior,
} from "../../../behaviors";

/**
 * GenericGroupStrategy handles blocks with children but no timer/loop.
 * 
 * Uses aspect-based behaviors:
 * - Display: DisplayInit
 * - Output: HistoryRecord
 */
export class GenericGroupStrategy implements IRuntimeBlockStrategy {
    priority = 50; // Same as GenericTimer/GenericLoop; runs before ChildrenStrategy (same priority, registered earlier)
    readonly id = 'generic-group';

    match(statements: ICodeStatement[], _runtime: IRuntimeContext): boolean {
        if (!statements || statements.length === 0) return false;
        
        // Match if ANY statement has children but NO statement has timer/rounds
        const hasChildren = statements.some(s => s.children && s.children.length > 0);
        const hasTimer = statements.some(s => s.metrics.some(f => f.type === MetricType.Duration && f.origin !== 'runtime'));
        const hasRounds = statements.some(s => s.metrics.some(f => f.type === MetricType.Rounds && f.origin !== 'runtime'));
        
        return hasChildren && !hasTimer && !hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IRuntimeContext): void {
        // If we have a timer or loop behavior, the identity is already set (Timer/Rounds/AMRAP/EMOM).
        if (builder.hasTimerBehavior() || builder.hasRoundConfig()) {
            return;
        }

        // If we are here, it has children but no timer/loop. It is a simple Group.
        const template: BlockTemplate = {
            blockType: 'Group',
            defaultLabel: 'Group',
            statements,
            runtime,
        };

        const label = compose(builder, template);

        // =====================================================================
        // Display Aspect
        // =====================================================================
        builder.addBehavior(new LabelingBehavior({
            mode: 'clock',
            label
        }));

        // =====================================================================
        // Promotion Aspect — cascade resistance/distance to child blocks
        // =====================================================================
        const hasResistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Resistance));
        const hasDistance = statements.some(s => s.metrics.some(m => m.type === MetricType.Distance));
        const promotions = [
            ...(hasResistance ? [{ metricType: MetricType.Resistance, origin: 'compiler' as const }] : []),
            ...(hasDistance ? [{ metricType: MetricType.Distance, origin: 'compiler' as const }] : []),
        ];
        if (promotions.length > 0) {
            builder.addBehavior(new MetricPromotionBehavior({ promotions }));
        }
    }
}
