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
    const result = ctx.blocks.flatMap(
      (block: any) => block && this.visit(block),
    ) as MdTimerBlock[];
    return result;
  }

  wodBlock(ctx: any) {
    const blocks = [];
    if (ctx.compoundTimer || ctx.simpleTimer) {
      const outcome = this.visit(ctx.compoundTimer || ctx.simpleTimer).flat(
        Infinity,
      );
      const labels = ctx.timerMultiplier
        ? this.visit(ctx.timerMultiplier)
        : [{ round: 1, label: "" }];
      for (const label of labels) {
        for (const index of outcome) {
          if (index != null) {
            blocks.push({
              ...index,
              label: index.label
                ? label.label + " - " + index.label
                : label.label,
            });
          }
        }
      }
    }

    return blocks;
  }

  timer(ctx: any) {
    return ctx.blocks.map((block: any) => this.visit(block));
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
