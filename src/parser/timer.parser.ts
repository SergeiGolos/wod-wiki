import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {
  Trend,
  ActionOpen,
  ActionClose,
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
  Plus,
  Up,
  Collon,
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
        },
      });
    });

    $.RULE("wodBlock", () => {
      $.OPTION(() => $.SUBRULE($.lap));
      $.AT_LEAST_ONE(() => {
        $.OR([          
          { ALT: () => $.SUBRULE($.rounds) },
          { ALT: () => $.SUBRULE($.trend) },          
          { ALT: () => $.SUBRULE($.duration) },
          { ALT: () => $.SUBRULE($.effort) },
          { ALT: () => $.SUBRULE($.resistance) },
          { ALT: () => $.SUBRULE($.distance) },
          { ALT: () => $.SUBRULE($.reps) },
          { ALT: () => $.SUBRULE($.action) },
        ]);
      });
    });

    $.RULE("action", () => {
      $.CONSUME(ActionOpen);
      $.CONSUME(Collon)
      $.AT_LEAST_ONE(() => {
        $.OR([
          { ALT: () => $.CONSUME(Identifier) },          
          { ALT: () => $.CONSUME(AllowedSymbol) },
          { ALT: () => $.CONSUME(Minus) },
        ]);
      });
      $.CONSUME(ActionClose);
    });

    $.RULE("lap", () => {
      $.OR([
        { ALT: () => $.CONSUME(Minus) },
        { ALT: () => $.CONSUME(Plus) },
      ]);
    });

    $.RULE("trend", () => {
      $.CONSUME(Trend);
    });

    $.RULE("reps", () => {
      $.OR([
        { ALT: () => $.CONSUME(QuestionSymbol) },  // NEW: ? placeholder for collectible reps
        { ALT: () => $.CONSUME(Number) }
      ]);
    });
    
    $.RULE("duration", () => {
      $.OPTION(() => $.CONSUME(Up, { LABEL: "countUpModifier" }));
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

    $.RULE("distance", () => {
      $.OPTION(() => {
        $.OR([
          { ALT: () => $.CONSUME(QuestionSymbol) },  // NEW: ? placeholder for collectible distance
          { ALT: () => $.CONSUME(Number) }
        ]);
      });
      $.CONSUME(Distance);        
    });


    $.RULE("resistance", () => {            
      $.OPTION1(() => $.CONSUME(AtSign));
      $.OR([
        { ALT: () => $.CONSUME(QuestionSymbol) },  // NEW: ? placeholder for collectible resistance
        { ALT: () => $.CONSUME(Number) }
      ]);
      $.CONSUME(Weight);
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
