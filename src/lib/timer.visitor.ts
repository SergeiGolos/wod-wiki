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

    if (ctx.effort) { 
      statement.effort = this.visit(ctx.effort);
    }
    
    return statement;
  }

  timer(ctx: any) {
    const timer = (ctx.timerLong ?? ctx.timerShort)[0];    
    const segments = timer.children?.segments?.reverse().map((segment: any) => segment.image * 1) ?? [];
    const increment = timer.children?.increment?.value ?? "+";
    while (segments.length < 4) {
      segments.push(0);
    }

    const time = {
      days: segments[3],
      hours: segments[2],
      minutes: segments[1],
      seconds: segments[0],
    };

    return time.seconds * 1 +
      time.minutes * 60 +
      time.hours * 60 * 60 +
      time.days * 60 * 60 * 24;
  }
  

  timerLong(ctx: any) {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  timerShort(ctx: any) {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  resistance(ctx: any): MdTimerBlock[] {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  resistance_kg(ctx: any): MdTimerBlock[] {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  resistance_lb(ctx: any): MdTimerBlock[] {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  resistance_default(ctx: any): MdTimerBlock[] {
    return ctx.blocks.map((block: any) => this.visit(block));
  }

  repeater(ctx: any) {
    return (
      ctx.multiplierValue?.flatMap((value: any) => this.visit(value)) || []
    );
  }  
}
