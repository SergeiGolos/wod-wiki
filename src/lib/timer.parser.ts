import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {
  Trend,
  GroupClose,
  GroupOpen,
  Identifier,
  Return,
  allTokens,
  Timer,
  Weight,
  Number,  
  Minus,
  AllowedSymbol,
  Distance,
  AtSign,
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
        },
      });
    });

    $.RULE("wodBlock", () => {
      $.AT_LEAST_ONE(() => {
        $.OR([          
          { ALT: () => $.SUBRULE($.rounds) },
          { ALT: () => $.SUBRULE($.trend) },          
          { ALT: () => $.SUBRULE($.duration) },
          { ALT: () => $.SUBRULE($.effort) },
          { ALT: () => $.SUBRULE($.resistance) },
          { ALT: () => $.SUBRULE($.reps) },
        ]);
      });
    });

    $.RULE("trend", () => {
      $.CONSUME(Trend);
    });

    $.RULE("reps", () => {
      $.CONSUME(Number);
    });
    
    $.RULE("duration", () => {
      $.CONSUME(Timer);
    });

    $.RULE("rounds", () => {
      $.CONSUME(GroupOpen);
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.CONSUME(Identifier, { LABEL: "label" }) },          
          { ALT: () => $.SUBRULE($.sequence) },
        ]);
      });
      $.CONSUME(GroupClose);
    });    

    $.RULE("sequence", () => {
      $.AT_LEAST_ONE_SEP({
        SEP: Minus,
        DEF: () => {
          $.CONSUME(Number);
        },
      });
    });


    $.RULE("resistance", () => {            
      $.OPTION1(() => $.CONSUME(AtSign));
      $.OPTION(() => $.CONSUME(Number));
      $.OR(
        [
          { ALT: () => $.CONSUME(Weight) },
          { ALT: () => $.CONSUME(Distance) },
        ]);        
    });

    $.RULE("effort", () => {
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.CONSUME(Identifier) },
          { ALT: () => $.CONSUME(AllowedSymbol) },
          { ALT: () => $.CONSUME(Minus) },
        ]);
      });
    });

    $.performSelfAnalysis();

    if (tokens) {
      this.input = tokens;
    }
  }
}
