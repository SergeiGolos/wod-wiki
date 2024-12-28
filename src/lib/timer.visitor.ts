import { MdTimerParse } from "./timer.parser";
import type { StatementBlock } from "./timer.types";

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
        }) as StatementBlock[];
        

      let stack = [] as any[];
      for (var block of blocks) {        
        stack = stack.filter((item: any) => item.columnStart < block.meta.columnStart);        
        if (block.parents == undefined) {
          block.parents = [];
        }
        block.id = block.meta.startOffset;
        if (block.children == undefined) {
          block.children = [];
        }

        if (block.type === "header" || block.type === "paragraph") {
          continue;
        }

        if (stack.length > 0) {
          for (let parent of stack) {
            parent.block.children.push(block.id);
            block.parents.push(parent.block.id);
          }          
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

  wodBlock(ctx: any) : StatementBlock {
    if (ctx.heading) {
      return this.visit(ctx.heading);
    }

    if (ctx.paragraph) {
      return this.visit(ctx.paragraph);
    }
    let meta = [];
    let statement = { type: "block" } as StatementBlock;
    if (ctx.duration) {
      const [durationValue, durationMeta] = this.visit(ctx.duration);
      statement.duration = durationValue;
      meta.push(durationMeta);
    }

    if (ctx.resistance) {
      const [resistance, resistanceMeta] = this.visit(ctx.resistance);
      statement.resistance = resistance;
      meta.push(resistanceMeta);
    }

    if (ctx.rounds) {
      const [rounds, repeaterMeta] = this.visit(ctx.rounds);
      statement.rounds = rounds;
      meta.push(repeaterMeta);
    }

    if (ctx.reps) {
      const [reps, roundsMeta] = this.visit(ctx.reps);
      statement.reps = reps;
      meta.push(roundsMeta);
    }

    if (ctx.effort) {
      const [effort, effortMeta] = this.visit(ctx.effort);
      statement.effort = effort;
      meta.push(effortMeta);
    }

    statement.meta = this.combineMeta(meta.filter((meta: any) => meta != null));
    return statement;
  }

  reps(ctx: any) {
    return [ctx.Integer[0].image * 1, this.getMeta([ctx.Integer[0]])];
  }

  heading(ctx: any) : StatementBlock {
    const meta = this.getMeta([ctx.Heading[0], ...ctx.text]);
    const outcome = {      
      id :meta.startOffset,
      parents: [],
      children: [], 
      type: "header",
      level: ctx.Heading[0].image,
      text: ctx.text.map((identifier: any) => identifier.image).join(" "),
      meta: meta,
    };

    return outcome;
  }
  

  paragraph(ctx: any) : StatementBlock {   
    const meta = this.getMeta([ctx.Paragraph[0], ...ctx.text]);
    return {
      id : meta.startOffset,
      parents: [],
      children: [],
      type: "paragraph",
      text: ctx.text.map((identifier: any) => identifier.image).join(" "),
      meta: meta,
    };
  }

  duration(ctx: any) {
    const tokens = [];
    let multiplier = 1;
    if (ctx.Trend) {
      tokens.push(ctx.Trend[0]);
      multiplier = ctx.Trend[0]?.image == "-" ? -1 : 1;
    }

    const digits = ctx.Timer[0].image
      .split(":")
      .map((segment: any) => 1 * (segment == "" ? 0 : segment))
      .reverse();

    tokens.push(ctx.Timer[0]);

    while (digits.length < 4) {
      digits.push(0);
    }

    const time = {
      days: digits[3],
      hours: digits[2],
      minutes: digits[1],
      seconds: digits[0],
    };

    return [
      multiplier *
        (time.seconds +
          time.minutes * 60 +
          time.hours * 60 * 60 +
          time.days * 60 * 60 * 24),
      this.getMeta(tokens),
    ];
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

    return [
      {
        units: units,
        value: load,
      },
      this.getMeta([ctx.Load[0]]),
    ];
  }

  labels(ctx: any) {
    return [ctx.label.Map((identifier: any) => identifier.image), ctx.label];
  }

  effort(ctx: any) {
    return [
      ctx.Identifier.map((identifier: any) => identifier.image).join(" "),
      this.getMeta(ctx.Identifier),
    ];
  }

  rounds(ctx: any) {
    var meta = this.getMeta([ctx.GroupOpen[0], ctx.GroupClose[0]]);
    if (ctx.Integer != null) {
      return [{ count: ctx.Integer[0].image * 1, labels: [] }, meta];
    }

    if (ctx.labels == null) {
      return [{ count: 1, labels: [] }, meta];
    }

    var [labels, tokens] = this.visit(ctx.labels[0]);
    return [
      {
        count: labels.length,
        labels: labels,
      },
      meta,
    ];
  }

  combineMeta(meta: any[])  {
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
    const sorted = meta.sort((a: any, b: any) => a.startOffset - b.startOffset);
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
