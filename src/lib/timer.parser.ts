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
  Load,
  Number,  
  Minus,
  AllowedSymbol,
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
          { ALT: () => $.SUBRULE($.reps) },
          { ALT: () => $.SUBRULE($.duration) },
          { ALT: () => $.SUBRULE($.effort) },
          { ALT: () => $.SUBRULE($.resistance) },
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
      $.CONSUME(Load);
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
