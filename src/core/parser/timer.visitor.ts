import { StatementFragment, StatementNode } from "../timer.types";
import { EffortFragment } from "../fragments/EffortFragment";
import { IncrementFragment } from "../fragments/IncrementFragment";
import { LapFragment } from "../fragments/LapFragment";
import { RepFragment } from "../fragments/RepFragment";
import { DistanceFragment, ResistanceFragment } from "../fragments/ResistanceFragment";
import { RoundsFragment } from "../fragments/RoundsFragment";
import { TimerFragment } from "../fragments/TimerFragment";
import { MdTimerParse } from "./timer.parser";

const parser = new MdTimerParse() as any;
const BaseCstVisitor = parser.getBaseCstVisitorConstructor();

export class MdTimerInterpreter extends BaseCstVisitor {
  constructor() {
    super();
    // This helper will detect any missing or redundant methods on this visitor
    this.validateVisitor();
  }

  /// High level entry point, contains any number of simple of compound timers.
  wodMarkdown(ctx: any) {
    try {
      if (!ctx || !Array.isArray(ctx.markdown)) {
        return [{ SyntaxError: "Invalid context: markdown array is required" }];
      }

      let blocks = ctx.markdown
        .filter((block: any) => block !== null && block !== undefined)
        .flatMap((block: any) => {
          try {
            return this.visit(block) || [];
          } catch (blockError) {
            return [
              { SyntaxError: "Error processing markdown block:", blockError },
            ];
          }
        }) as StatementNode[];
     
      let stack: { columnStart: number; block: StatementNode }[] = []; 
      for (let block of blocks) {
        const history = stack.filter(
          (item: any) => item.columnStart == block.meta.columnStart
        );

        stack = stack.filter(
          (item: any) => item.columnStart < block.meta.columnStart
        );

        block.id = block.meta.startOffset;
        if (block.children == undefined) {
          block.children = [];
        }

        if (stack.length > 0) {
          for (let parent of stack) {
            parent.block.children.push(block.id);
            block.parent = parent.block.id;
          }
        }
        
        if(history.length > 0){
          history[history.length - 1].block.next = block.id;
        }         
        stack.push({ columnStart: block.meta.columnStart, block });
      }

      return blocks;
    } catch (error) {
      return [
        {
          SyntaxError: `Error in wodMarkdown: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ];
    }
  }

  wodBlock(ctx: any): StatementNode {
    let statement = { fragments: [] as StatementFragment[] } as StatementNode;
    ctx.lap && statement.fragments.push(...this.visit(ctx.lap));

    if (ctx.rounds) {
      statement.fragments.push(...this.visit(ctx.rounds));
    }

    // Trend Parsing
    if (ctx.trend) {
      statement.fragments.push(...this.visit(ctx.trend));
    } else if (ctx.duration) {
      statement.fragments.push(
        new IncrementFragment(
          "",
          this.getMeta([ctx.duration[0].children.Timer[0]])
        )
      );
    }

    ctx.duration && statement.fragments.push(...this.visit(ctx.duration));
    ctx.reps && statement.fragments.push(...this.visit(ctx.reps));
    ctx.effort && statement.fragments.push(...this.visit(ctx.effort));
    ctx.resistance && statement.fragments.push(...this.visit(ctx.resistance));
    ctx.distance && statement.fragments.push(...this.visit(ctx.distance));

    statement.meta = this.combineMeta(
      statement.fragments.map((fragment: any) => fragment.meta)
    );
    statement.id = statement.meta.startOffset;
    return statement;
  }

  lap(ctx: any): LapFragment[] {
    if (ctx.Plus) {
      const meta = this.getMeta([ctx.Plus[0]]);
      return [new LapFragment("+", meta)];
    }

    if (ctx.Minus) {
      const meta = this.getMeta([ctx.Minus[0]]);
      return [new LapFragment("-", meta)];
    }

    return [];
  }

  trend(ctx: any): IncrementFragment[] {
    const meta = this.getMeta([ctx.Trend[0]]);
    return [new IncrementFragment(ctx.Trend[0].image, meta)];
  }

  reps(ctx: any): RepFragment[] {
    const meta = this.getMeta([ctx.Number[0]]);
    return [new RepFragment(ctx.Number[0].image * 1, meta)];
  }

  duration(ctx: any): TimerFragment[] {
    const meta = this.getMeta([ctx.Timer[0]]);
    return [new TimerFragment(ctx.Timer[0].image, meta)];
  }

  distance(ctx: any): DistanceFragment[] {
    let load =
      (ctx.Number && ctx.Number.length > 0 && ctx.Number[0].image) || "1";
    let units = (ctx.Distance && ctx.Distance[0].image) || "";
    let meta = [ctx.Number[0], ctx.Distance[0]];
    return [new DistanceFragment(load, units, this.getMeta(meta))];
  }

  resistance(ctx: any): ResistanceFragment[] {
    let load =
      (ctx.Number && ctx.Number.length > 0 && ctx.Number[0].image) || "1";
    let units = (ctx.Weight && ctx.Weight[0].image) || "";

    let meta = [ctx.Number[0], ctx.Weight[0]];
    return [new ResistanceFragment(load, units, this.getMeta(meta))];
  }

  labels(ctx: any) {
    return [ctx.label.Map((identifier: any) => identifier.image), ctx.label];
  }

  effort(ctx: any): EffortFragment[] {
    const effort = ctx.Identifier.map(
      (identifier: any) => identifier.image
    ).join(" ");
    return [new EffortFragment(effort, this.getMeta(ctx.Identifier))];
  }

  rounds(ctx: any): StatementFragment[] {
    const meta = this.getMeta([ctx.GroupOpen[0], ctx.GroupClose[0]]);
    const groups = this.visit(ctx.sequence[0]);
    const labels =
      ctx?.Identifier?.map((identifier: any) => identifier.image) ?? [];

    if (groups.length == 1) {
      return [new RoundsFragment(groups[0], meta)];
    }

    return [
      new RoundsFragment(groups.length, meta),
      ...groups.map((group: any) => new RepFragment(group, meta)),
    ];
  }

  sequence(ctx: any): number[] {
    return ctx.Number.map((identifier: any) => identifier.image * 1);
  }

  combineMeta(meta: any[]) {
    if (meta.length == 0) {
      return {
        line: 0,
        startOffset: 0,
        endOffset: 0,
        columnStart: 0,
        columnEnd: 0,
        length: 0,
      };
    }
    const sorted = meta
      .filter((item: any) => item != undefined)
      .map((item: any) => ({ ...item, ...item.meta }))
      .sort((a: any, b: any) => a.startOffset - b.startOffset);
    const columnEnd = sorted[sorted.length - 1].columnEnd;
    const columnStart = sorted[0].columnStart;
    return {
      line: sorted[0].line,
      startOffset: sorted[0].startOffset,
      endOffset: sorted[sorted.length - 1].endOffset,
      columnStart: columnStart,
      columnEnd: columnEnd,
      length: columnEnd - columnStart,
    };
  }

  getMeta(tokens: any[]) {
    const endToken = tokens[tokens.length - 1];
    return {
      line: tokens[0].startLine,
      startOffset: tokens[0].startOffset,
      endOffset: endToken.endOffset,
      columnStart: tokens[0].startColumn,
      columnEnd: endToken.endColumn,
      length: endToken.endColumn - tokens[0].startColumn,
    };
  }
}
