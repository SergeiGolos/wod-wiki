import { IRuntimeBlockStrategy } from "../../../contracts/IRuntimeBlockStrategy";
import { BlockBuilder } from "../../BlockBuilder";
import { ICodeStatement } from "@/core/models/CodeStatement";
import { IScriptRuntime } from "../../../contracts/IScriptRuntime";
import { BlockContext } from "../../../BlockContext";
import { BlockKey } from "@/core/models/BlockKey";
import { PassthroughMetricDistributor } from "../../../contracts/IDistributedMetrics";
import { MetricContainer } from "@/core/models/MetricContainer";
import { MetricType } from "@/core/models/Metric";
import { LabelComposer } from "../../utils/LabelComposer";

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

    match(statements: ICodeStatement[], _runtime: IScriptRuntime): boolean {
        if (!statements || statements.length === 0) return false;
        
        // Match if ANY statement has children but NO statement has timer/rounds
        const hasChildren = statements.some(s => s.children && s.children.length > 0);
        const hasTimer = statements.some(s => s.metrics.some(f => f.type === MetricType.Duration && f.origin !== 'runtime'));
        const hasRounds = statements.some(s => s.metrics.some(f => f.type === MetricType.Rounds && f.origin !== 'runtime'));
        
        return hasChildren && !hasTimer && !hasRounds;
    }

    apply(builder: BlockBuilder, statements: ICodeStatement[], runtime: IScriptRuntime): void {
        // If we have a timer or loop behavior, the identity is already set (Timer/Rounds/AMRAP/EMOM).
        if (builder.hasTimerBehavior() || builder.hasRoundConfig()) {
            return;
        }

        // If we are here, it has children but no timer/loop. It is a simple Group.
        const firstStatement = statements[0];
        const blockKey = new BlockKey();
        const context = new BlockContext(runtime, blockKey.toString(), firstStatement.exerciseId || '');
        
        // Use LabelComposer for a standardized, descriptive label
        const label = LabelComposer.build(statements, {
            defaultLabel: "Group"
        });

        builder.setContext(context)
               .setKey(blockKey)
               .setBlockType("Group")
               .setLabel(label)
               .setSourceIds(statements.map(s => s.id));

        const distributor = new PassthroughMetricDistributor();
        const metricGroups = statements.flatMap(s => 
            distributor.distribute(MetricContainer.from(s.metrics), "Group")
        ).filter(group => group.length > 0);
        
        builder.setFragments(metricGroups);

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
