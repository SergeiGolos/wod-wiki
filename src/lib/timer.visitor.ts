import { MdTimerParse } from "./timer.parser";
import { EffortFragment, IncrementFragment, RepFragment, ResistanceFragment, RoundsFragment, StatementBlock, StatementFragment, TextFragment } from "./timer.types";
import { TimerFragment } from "./fragments/TimerFragment";

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

  trend(ctx: any) : IncrementFragment {
    return new IncrementFragment(ctx.Trend[0].image, this.getMeta([ctx.Trend[0]]));
  }

  wodBlock(ctx: any) : StatementBlock {
    if (ctx.heading) {
      return this.visit(ctx.heading);
    }

    if (ctx.paragraph) {
      return this.visit(ctx.paragraph);
    }    
    let statement = { type: "block", fragments: [] as StatementFragment[] } as StatementBlock;
    
    if (ctx.rounds) {
     statement.fragments.push(this.visit(ctx.rounds));   
     statement.type = "rounds";
    }
    ctx.trend && statement.fragments.push( this.visit(ctx.trend));    
    (ctx.trend == undefined) && ctx.duration && statement.fragments.push(new IncrementFragment("", this.getMeta([ctx.duration[0]])));
    ctx.duration && statement.fragments.push( this.visit(ctx.duration));         
    ctx.reps && statement.fragments.push( this.visit(ctx.reps));      
    ctx.effort && statement.fragments.push( this.visit(ctx.effort));         
    ctx.resistance && statement.fragments.push( this.visit(ctx.resistance));      

    

    statement.meta = this.combineMeta(statement.fragments.map((fragment: any) => fragment.meta));
    return statement;
  }

  reps(ctx: any) : RepFragment {
    return {
      type: "reps",      
      reps: ctx.Integer[0].image * 1,        
      meta: this.getMeta([ctx.Integer[0]]),
      toPart: () => `${ctx.Integer[0].image}`
    };
  }

  heading(ctx: any) : StatementBlock {
    const meta = this.getMeta([ctx.Heading[0], ...ctx.text]);
    const outcome = {      
      id :meta.startOffset,
      parents: [],
      children: [], 
      type: "header",
      fragments: [{
        type: "text",
        level: ctx.Heading[0].image,
        text: ctx.text.map((identifier: any) => identifier.image).join(" "),
        toPart: () => "",
        meta: meta
      }],
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
      fragments: [{  
        type: "text",
        text: ctx.text.map((identifier: any) => identifier.image).join(" "),
        meta: meta
      } as TextFragment],
      meta: meta,
    };
  }

  duration(ctx: any) : TimerFragment {    
    const meta = this.getMeta([ctx.Timer[0]]);
    const outcome = new TimerFragment(ctx.Timer[0].image, meta);    
    return outcome;
  }

  resistance(ctx: any): ResistanceFragment { 
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
      type: "resistance",      
      units: units,
      value: load,      
      meta: this.getMeta([ctx.Load[0]]),
      toPart: () => `${units}:${load}`
    };
  }

  labels(ctx: any) {
    return [ctx.label.Map((identifier: any) => identifier.image), ctx.label];
  }

  effort(ctx: any): EffortFragment {
    var effort = ctx.Identifier.map((identifier: any) => identifier.image).join(" ");
    return {
      type: "effort",
      effort: effort,
      meta: this.getMeta(ctx.Identifier),
      toPart: () => effort
    };
  }

  rounds(ctx: any) : RoundsFragment { 
    var meta = this.getMeta([ctx.GroupOpen[0], ctx.GroupClose[0]]);
    if (ctx.Integer != null) {
      return {
        type: "rounds",
        count: ctx.Integer[0].image * 1,        
        meta: meta,
        toPart: () => `${ctx.Integer[0].image}x`
      };
    }
    
    return {
      type: "rounds",
      count: 1,        
      meta: meta,
      toPart: () => `1x`
    };      
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
