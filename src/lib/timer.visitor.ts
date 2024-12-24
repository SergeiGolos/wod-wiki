import { loadEnvFile } from "process";
import { MdTimerParse } from "./timer.parser";
import type { MdTimerBlock } from "./timer.types";

const parser = new MdTimerParse() as any;
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

export class MdTimerInterpreter extends BaseCstVisitor {
  constructor() {
    super();
    // This helper will detect any missing or redundant methods on this visitor

    this.validateVisitor();
  }

  /// High level entry point, contains any number of simple of compound timers.
  wodMarkdown(ctx: any): MdTimerBlock[] {
    const result = ctx.markdown.flatMap(
      (block: any) => block && this.visit(block),
    ) as MdTimerBlock[];
    return result;
  }

  wodBlock(ctx: any) {  
    const statement = {} as any;
    if (ctx.duration) {
      statement.duration = this.visit(ctx.duration);
    }

    if (ctx.resistance) {
      statement.resistance = this.visit(ctx.resistance);
    }

    if (ctx.repeater) {
      statement.repeater = this.visit(ctx.repeater);
    }

    if (ctx.effort) { 
      statement.effort = this.visit(ctx.effort);
    }
    
    return statement;
  }

  duration(ctx: any) {
    const increment =  ctx.CountDirection && ctx.CountDirection[0]?.image || "+";
    const multiplier = increment == "-" ? -1 : 1;

    const digits = ctx.Timer[0].image.split(":")
      .map((segment : any) => 1 * (segment == "" ? 0 : segment))
      .reverse();
    
    while (digits.length < 4) {
      digits.push(0);
    }

    const time = {
      days: digits[3],
      hours: digits[2],
      minutes: digits[1],
      seconds: digits[0],
    };

    return multiplier * (time.seconds +
      time.minutes * 60 +
      time.hours * 60 * 60 +
      time.days * 60 * 60 * 24);
  }

  resistance(ctx: any) {
    let load = ctx.Load[0].image.replace("@", "");    
    let units = "default";
    if (load.includes("kg")) {
      load = load.replace("kg", "");
      units = "kg";
    }

    if (load.includes("lb")) {
      load = load.replace("lb", "");
      units = "lb";
    }

    return {
      "units": units,
      "value": load
    }
  }

  labels(ctx: any) {
    return ctx.label.Map((identifier: any) => identifier.image)
  }

 
  effort(ctx: any) {
      return ctx.Identifier.map((identifier: any) => identifier.image).join(" ");
  }

  repeater(ctx: any) {
    if (ctx.Integer != null) {
          return { count: ctx.Integer[0].image * 1, labels: [] };
    }

    if (ctx.labels == null) {
      return { count: 1, labels: [] };      
    }

    var labels = this.visit(ctx.labels[0]);    
    return  {
      count: labels.length,
      labels: labels
    }    
  }  
}
