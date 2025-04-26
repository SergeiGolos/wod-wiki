import {
  StatementNode,
  IRuntimeBlock,
  IRuntimeLogger,
  RuntimeMetric,
  ITimerRuntime,
} from "../timer.types";
import { RuntimeTrace } from "../RuntimeTrace";
import { RuntimeBlock } from "./blocks/RuntimeBlock";
import { EventHandler } from "./EventHandler";
import { StartHandler } from "./handlers/StartHandler";
import { TickHandler } from "./handlers/TickHandler";

import { StopHandler } from "./handlers/StopHandler";
import { ResetHandler } from "./handlers/ResetHandler";
import { CompleteHandler } from "./handlers/CompleteHandler";
import { EndHandler } from "./handlers/EndHandler";
import { DefaultResultLogger } from "./logger/DefaultResultLogger";
import { fragmentsTo, fragmentsToMany } from "../utils";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { WorkRestLogger } from "./logger/WorkRestLogger";
import { RepFragment } from "../fragments/RepFragment";
import { EffortFragment } from "../fragments/EffortFragment";
import { DistanceFragment, ResistanceFragment } from "../fragments/ResistanceFragment";
import { IdleRuntimeBlock } from "./blocks/IdleRuntimeBlock";


export class RuntimeJit {
  handlers: EventHandler[] = [
    new TickHandler(),
    new StartHandler(),
    new StopHandler(),
    new CompleteHandler(),
    new ResetHandler(),
    new EndHandler(),
  ];

  compile(runtime: ITimerRuntime, nodes: StatementNode[], trace?: RuntimeTrace): IRuntimeBlock {
    if (!trace || !nodes || nodes.length === 0) {      
      return new IdleRuntimeBlock(runtime.script.nodes[0].id);
    }
    
    let key = trace.set(nodes);
    console.log("Compiling block:", key.toString());

    const efforts = fragmentsTo<EffortFragment>(nodes, "effort");
    const rounds = fragmentsTo<RoundsFragment>(nodes, "rounds");
    const repetitions = fragmentsToMany<RepFragment>(nodes, "rep");
    const resistance = fragmentsTo<ResistanceFragment>(nodes, "resistance");
    const distance = fragmentsTo<DistanceFragment>(nodes, "distance");       

    const currentIndex = trace.getTotal(nodes[0].id) ;
    const currentRep = repetitions[(currentIndex- 1) % repetitions.length] 

    let logger: IRuntimeLogger = new DefaultResultLogger();
    if (repetitions && rounds) {
      logger = new WorkRestLogger();
    }

    const block = new RuntimeBlock(key.toString(), nodes, logger, this.handlers);
    
    // Create metrics for the block with the new structure
    block.metrics = this.createBlockMetrics(efforts, currentRep, resistance, distance);
    
    return block;
  }
  
  private createBlockMetrics(
    efforts?: EffortFragment,
    repetitions?: RepFragment,
    resistance?: ResistanceFragment,
    distance?: DistanceFragment
  ): RuntimeMetric[] {
    const metrics: RuntimeMetric[] = [];
    
    // Basic metrics compilation
    const effort = efforts?.effort ?? '';
    const reps = repetitions?.reps ?? 
      ((resistance || distance) ? 1 : 0);
    
    // Create the metric with the new structure
    const metric: RuntimeMetric = {
      effort: effort,
      repetitions: { value: reps, unit: "" },
    };
    
    // Add resistance if available
    if (resistance) {
      const resistanceValue = parseFloat(resistance.value);
      if (!isNaN(resistanceValue)) {
        metric.resistance = {
          value: resistanceValue,
          unit: resistance.units ?? ''
        };
      }
    }
    
    // Add distance if available
    if (distance) {
      const distanceValue = parseFloat(distance.value);
      if (!isNaN(distanceValue)) {
        metric.distance = {
          value: distanceValue,
          unit: distance.units ?? ''
        };      
      }
    }
    
    metrics.push(metric);
    return metrics;
  }
}
