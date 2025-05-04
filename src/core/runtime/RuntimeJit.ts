import {
  StatementNode,
  IRuntimeBlock,
  ITimerRuntime,
  StatementFragment,
  RuntimeMetric,
  IDuration,
  MetricValue,
  Duration,
  getFragments, // Import the helper function
} from "../timer.types";
import { EffortFragment } from "../fragments/EffortFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { RepFragment } from "../fragments/RepFragment";
import { ResistanceFragment } from "../fragments/ResistanceFragment";
import { DistanceFragment } from "../fragments/DistanceFragment";
import { SingleBlock } from "./blocks/SingleBlock";
import { EventHandler } from "./EventHandler";

import { TickHandler } from "./inputs/TickHandler";
import { IdleRuntimeBlock } from "./blocks/IdleRuntimeBlock";
import { DoneRuntimeBlock } from "./blocks/DoneRuntimeBlock";
import { StartHandler } from "./inputs/StartEvent";
import { StopHandler } from "./inputs/StopEvent";
import { CompleteHandler } from "./inputs/CompleteEvent";
import { ResetHandler } from "./inputs/ResetEvent";
import { EndHandler } from "./inputs/EndEvent";
import { RootBlock } from "./blocks/RootBlock";
import { RunHandler } from "./inputs/RunEvent";
import { NextStatementHandler } from "./inputs/NextStatementEvent";
import { RepeatingBlock } from "./blocks/RepeatingBlock";
import { CompoundBlock } from "./blocks/CompoundBlock";
import { DisplayHandler } from "./inputs/DisplayHandler";
import { PushActionHandler } from "./inputs/PushActionEvent";

export class RuntimeJit {
    
  idle(_runtime: ITimerRuntime): IRuntimeBlock {
    return new IdleRuntimeBlock();
  }
  end(_runtime: ITimerRuntime): IRuntimeBlock {
    return new DoneRuntimeBlock();
  }

  root(runtime : ITimerRuntime) : IRuntimeBlock {
    return new RootBlock(runtime.script.nodes);

  }

  handlers: EventHandler[] = [
    new PushActionHandler(),
    new RunHandler(),
    new TickHandler(),
    new NextStatementHandler(),    
    new StartHandler(),
    new StopHandler(),
    new ResetHandler(),
    new EndHandler(),
    new DisplayHandler(),
  ];

  /**
   * Compile a statement node into an appropriate runtime block based on its type
   * @param runtime Timer runtime context
   * @param node Statement node to compile
   * @returns A runtime block or undefined if compilation fails.
   */
  compile(runtime: ITimerRuntime, node: StatementNode): IRuntimeBlock | undefined {      
    
    const metrics: RuntimeMetric[] = [];
    let duration: IDuration | undefined = undefined;
    let rounds: number | undefined = undefined;
    let effort: string | undefined = undefined;

    // --- Helper function to get or create metric ---
    // Note: Modified to accept metrics array explicitly
    const getOrCreateMetric = (metricsArr: RuntimeMetric[], currentEffort: string | undefined): RuntimeMetric | undefined => {
        if (!currentEffort) return undefined; // Cannot create metric without effort name
        let metric = metricsArr.find(m => m.effort === currentEffort);
        if (!metric) {
            metric = { effort: currentEffort }; // Initialize with effort only
            metricsArr.push(metric);
        }
        return metric;
    };
    // ---

    // Use getFragments to extract specific fragment types
    const effortFrag = getFragments<EffortFragment>(node.fragments, "effort")[0];
    const timerFrag = getFragments<TimerFragment>(node.fragments, "duration")[0];
    const roundsFrag = getFragments<RoundsFragment>(node.fragments, "rounds")[0] ?? 1;
    const repFrag = getFragments<RepFragment>(node.fragments, "rep")[0];
    const resistanceFrag = getFragments<ResistanceFragment>(node.fragments, "resistance")[0];
    const distanceFrag = getFragments<DistanceFragment>(node.fragments, "distance")[0];

    // Process Effort first
    if (effortFrag) {
        effort = effortFrag.effort;
        getOrCreateMetric(metrics, effort); // Ensure metric container exists if effort is found
    }

    // Process Duration
    if (timerFrag) {
        duration = new Duration(timerFrag.original * 1000);
    }

    // Process Rounds
    if (roundsFrag) {
        rounds = roundsFrag.count;
    }

    // Process Reps
    if (repFrag) {
        const metric = getOrCreateMetric(metrics, effort); // Get potentially existing metric
        if (metric) {
            metric.repetitions = { value: repFrag.reps ?? 0, unit: 'reps' };
        } else if (!effort) {
             // Handle case where rep fragment exists without an effort fragment (should ideally not happen?)
             console.warn("RepFragment found without corresponding EffortFragment in node:", node.id);
        }
    }

    // Process Resistance
    if (resistanceFrag) {
        const metric = getOrCreateMetric(metrics, effort);
        if (metric) {
            metric.resistance = { value: parseFloat(resistanceFrag.value), unit: resistanceFrag.units };
        } else if (!effort) {
            console.warn("ResistanceFragment found without corresponding EffortFragment in node:", node.id);
        }
    }

    // Process Distance
    if (distanceFrag) {
        const metric = getOrCreateMetric(metrics, effort);
        if (metric) {
            metric.distance = { value: parseFloat(distanceFrag.value), unit: distanceFrag.units };
        } else if (!effort) {
             console.warn("DistanceFragment found without corresponding EffortFragment in node:", node.id);
        }
    }
    
    // TODO: Implement the logic to create and return the actual IRuntimeBlock 
    // using the extracted metrics, duration, and rounds.
    // Currently just returning undefined.



    
    return undefined; // Placeholder
  }
}
