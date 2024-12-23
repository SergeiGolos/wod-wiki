import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {
  Colon,
  Comma,
  CountDirection,
  GroupClose,
  GroupOpen,
  Identifier,
  Integer,
  LabelClose,
  LabelOpen,
  allTokens,
} from "./timer.tokens";

export class MdTimerParse extends CstParser {
  constructor(tokens?: IToken[]) {
    super(allTokens);
    const $ = this as any;

    $.RULE("wodMarkdown", () => {
      $.MANY(() => {
        $.SUBRULE($.wodBlock, { LABEL: "markdown" });
      });
    });

    $.RULE("wodBlock", () => {
      $.MANY(() => {
        $.SUBRULE($.wodBlock, { LABEL: "blocks" });
      });      
    });

    $.RULE("wodPart", () => {      
      $.OR([        
        { ALT: () => $.SUBRULE($.timer) },                
        { ALT: () => $.SUBRULE($.resistance) },
        { ALT: () => $.SUBRULE($.repeater) },
        { ALT: () => $.SUBRULE($.effort) },
      ]);      
    });
    
    $.RULE("timer", () => {
      $.OPTION(() => {
        $.CONSUME(CountDirection, { label: "directionValue" });
      });
      $.AT_LEAST_ONE_SEP({
        SEP: Colon,
        DEF: () => {
          $.SUBRULE($.numericValue, { LABEL: "segments" });
        },
      });
    });


//
    $.RULE("repeater", () => {
      $.CONSUME(GroupOpen);
      $.MANY(() => {
        $.SUBRULE($.wodBlock, { LABEL: "blocks" });
      });
      $.CONSUME(GroupClose);
    });

    $.RULE("timerMultiplier", () => {
      $.CONSUME(LabelOpen);
      $.MANY_SEP({
        SEP: Comma,
        DEF: () => {
          $.SUBRULE($.multiplierValue, { label: "values" });
        },
      });
      $.CONSUME(LabelClose);
    });

    $.RULE("multiplierValue", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.numericValue) },
        { ALT: () => $.SUBRULE($.stringValue) },
      ]);
    });

    $.RULE("numericValue", () => {
      $.CONSUME(Integer);
    });

    $.RULE("stringValue", () => {
      $.CONSUME(Identifier);
    });

    $.performSelfAnalysis();

    if (tokens) {
      this.input = tokens;
    }
  }
}
