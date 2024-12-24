import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {
  Comma,
  CountDirection,
  GroupClose,
  GroupOpen,
  Identifier,
  Integer,
  Return,
  allTokens,
  Timer,
  Load,
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
          { ALT: () => $.SUBRULE($.repeater) },
          { ALT: () => $.SUBRULE($.duration) },          
          { ALT: () => $.SUBRULE($.effort) },
          { ALT: () => $.SUBRULE($.resistance) },
        ]);
      });
    });
  
    $.RULE("duration", () => {
      $.OPTION(() => {
        $.CONSUME(CountDirection);
      });
      $.CONSUME(Timer);
    });

    $.RULE("repeater", () => {
      $.CONSUME(GroupOpen);
      $.MANY(() => {
        $.CONSUME(Identifier, { LABEL: "blocks" });
      });
      $.CONSUME(GroupClose);
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
