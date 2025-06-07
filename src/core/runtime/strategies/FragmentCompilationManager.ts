import { CodeFragment, FragmentType } from "../../CodeFragment";
import { RuntimeMetric } from "../../RuntimeMetric";
import { JitStatement } from "../../JitStatement";
import { IFragmentCompilationStrategy, FragmentCompilationContext } from "./IFragmentCompilationStrategy";
import { RepMetricStrategy } from "./RepMetricStrategy";
import { EffortMetricStrategy } from "./EffortMetricStrategy";
import { DistanceMetricStrategy } from "./DistanceMetricStrategy";
import { RoundsMetricStrategy } from "./RoundsMetricStrategy";
import { ResistanceMetricStrategy } from "./ResistanceMetricStrategy";

export class FragmentCompilationManager {
  private strategies = new Map<FragmentType, IFragmentCompilationStrategy<any>>();

  constructor() {
    this.registerDefaultStrategies();
  }

  private registerDefaultStrategies(): void {
    this.register(new RepMetricStrategy());
    this.register(new EffortMetricStrategy());
    this.register(new DistanceMetricStrategy());
    this.register(new RoundsMetricStrategy());
    this.register(new ResistanceMetricStrategy());
    // Note: ActionFragment, IncrementFragment, LapFragment, TextFragment, TimerFragment
    // currently have no-op or empty applyToMetric implementations, so no strategies needed
  }

  register<T extends CodeFragment>(strategy: IFragmentCompilationStrategy<T>): void {
    this.strategies.set(strategy.fragmentType, strategy);
  }

  compile(
    fragment: CodeFragment,
    context: FragmentCompilationContext
  ): RuntimeMetric[] {
    const strategy = this.strategies.get(fragment.fragmentType);
    if (!strategy) {
      // Handle fragments with no metric impact (TextFragment, ActionFragment, etc.)
      return [];
    }

    return strategy.compile(fragment, context);
  }

  compileStatementFragments(
    statement: JitStatement,
    context: FragmentCompilationContext
  ): RuntimeMetric {
    // Replicate current RuntimeBlockMetrics.extractMetricValues logic
    // Original: statement.fragments.forEach(fragment => fragment.applyToMetric(metric, currentRound))
      const baseMetric: RuntimeMetric = {
      sourceId: context.blockContext.blockKey.toString(),
      effort: "",
      values: []
    };

    // Compile each fragment and merge results
    statement.fragments.forEach(fragment => {
      const compiledMetrics = this.compile(fragment, context);
      compiledMetrics.forEach(compiled => {
        this.mergeMetrics(baseMetric, compiled);
      });
    });

    return baseMetric;
  }
  private mergeMetrics(target: RuntimeMetric, source: RuntimeMetric): void {
    // Merge effort (EffortFragment sets this)
    if (source.effort && source.effort !== "") {
      target.effort = source.effort;
    }

    // Merge values (RepFragment, DistanceFragment, etc. add to this)
    target.values.push(...source.values);
  }
}
