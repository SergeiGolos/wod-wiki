import { MdTimerParse } from "./timer.parser";
import { Minus } from "./timer.tokens";
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
    if (ctx.timer) {
      statement.timer = this.visit(ctx.timer);
    }

    if (ctx.resistance) {
      statement.resistance = this.visit(ctx.resistance);
    }

    if (ctx.repeater) {
      statement.repeater = this.visit(ctx.repeater);
    }

    if (ctx.Identifier) { 
      statement.effort = ctx.Identifier.map((i: any) => i.image).join(" ");
    }
    
    return statement;
  }

  duration(ctx: any) {
    return ctx.timerLong != null 
      ? this.visit(ctx.timerLong) 
      : this.visit(ctx.timerShort);        
  }
  parseTimer(increment:any, segments: any[]){                    
    const multiplier = increment!= null && increment[0]?.image == "-" ? -1 : 1;
    const digits = segments
      ?.reverse()
      .map((segment: any) => segment.image * 1) ?? [];
    
    while (digits.length < 4) {
      digits.push(0);
    }

    const time = {
      days: digits[3],
      hours: digits[2],
      minutes: digits[1],
      seconds: digits[0],
    };

    return multiplier * (time.seconds * 1 +
      time.minutes * 60 +
      time.hours * 60 * 60 +
      time.days * 60 * 60 * 24);
  }

  timerLong(ctx: any) {
    return this.parseTimer(ctx.CountDirection, ctx.segments);
  }

  timerShort(ctx: any) {
    return this.parseTimer(ctx.CountDirection, ctx.segments);
  }

  resistance(ctx: any): MdTimerBlock[] {
    if (ctx.resistance_kg) {
      return this.visit(ctx.resistance_kg);      
    }
    if (ctx.resistance_lb) {
      return this.visit(ctx.resistance_lb);
    }
    return this.visit(ctx.resistance_default);
  }

  parseWeight(units: string, value: any) {
    return {
      unit: units,
      value: value.Integer[0].image,
    }
  }

  resistance_kg(ctx: any) {
    return this.parseWeight("kg", ctx.Integer); 
  }

  resistance_lb(ctx: any) {
    return this.parseWeight("lb", ctx.Integer); 
  }

  resistance_default(ctx: any) {
     // TODO: pull default from config
    return this.parseWeight("default", ctx.Integer); 
  }

  effort(ctx: any) {
    return "test";
  }

  repeater(ctx: any) {
    return (
      ctx.multiplierValue?.flatMap((value: any) => this.visit(value)) || []
    );
  }  
}
