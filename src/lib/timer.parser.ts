import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {  
  CountDirection,
  GroupClose,
  GroupOpen,
  Identifier,
  Return,
  allTokens,
  Timer,
  Load,
  Integer,
  Heading,
  Paragraph,
  AllowedSymbol,
  QuestionSymbol,
} from "./timer.tokens";

export class MdTimerParse extends CstParser {
  constructor(tokens?: IToken[]) {
    super(allTokens);
    const $ = this as any;

    $.RULE("wodMarkdown", () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Return, // Separator for entries
        DEF: () => {
            $.SUBRULE($.wodBlock, { LABEL: "markdown" });
        }
      });
    });
    
    $.RULE("wodBlock", () => {
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.SUBRULE($.heading) },
          { ALT: () => $.SUBRULE($.paragraph) },
          { ALT: () => $.SUBRULE($.repeater) },
          { ALT: () => $.SUBRULE($.duration) },          
          { ALT: () => $.SUBRULE($.effort) },
          { ALT: () => $.SUBRULE($.resistance) },
        ]);
      });
    });
  
    $.RULE("heading", () => {
      $.CONSUME(Heading);
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.CONSUME(Identifier, { LABEL: "text" }) },
          { ALT: () => $.CONSUME(Integer, { LABEL: "text" }) },
          { ALT: () => $.CONSUME(AllowedSymbol, { LABEL: "text" }) },  
          { ALT: () => $.CONSUME(QuestionSymbol, { LABEL: "text" }) },                    
        ]);
      });
    })

    $.RULE("paragraph", () => {
      $.CONSUME(Paragraph);
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.CONSUME(Identifier, { LABEL: "text" }) },
          { ALT: () => $.CONSUME(Integer, { LABEL: "text" }) },
        { ALT: () => $.CONSUME(AllowedSymbol, { LABEL: "text" }) },
          { ALT: () => $.CONSUME(QuestionSymbol, { LABEL: "text" }) },        
        ]);
      });
    })


    $.RULE("duration", () => {
      $.OPTION(() => {
        $.CONSUME(CountDirection);
      });
      $.CONSUME(Timer);
    });

    $.RULE("repeater", () => {
      $.CONSUME(GroupOpen);
      $.OR([
        { 
          GATE: () => this.LA(1).tokenType === Identifier,
          ALT: () => $.SUBRULE($.labels) 
        },
        { 
          GATE: () => this.LA(1).tokenType === Integer,
          ALT: () => $.CONSUME(Integer)
        },        
      ]);
      $.CONSUME(GroupClose);
    });

    $.RULE("labels", () => {
      $.MANY(() => {
        $.CONSUME(Identifier, { LABEL: "label" });
      });
    });

    $.RULE("resistance", () => {
      $.CONSUME(Load);
    });

    $.RULE("effort", () => {
      $.AT_LEAST_ONE(() => {
        $.CONSUME(Identifier);
      });
    });

    $.performSelfAnalysis();

    if (tokens) {
      this.input = tokens;
    }
  }
}
