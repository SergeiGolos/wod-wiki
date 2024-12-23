import type { IToken } from "chevrotain";
import { CstParser } from "chevrotain";
import {
  AtResistance,
  Colon,
  Comma,
  CountDirection,
  GroupClose,
  GroupOpen,
  Identifier,
  Integer,
  Kelos,
  LabelClose,
  LabelOpen,
  Pounds,
  Return,
  allTokens,
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
          { ALT: () => $.SUBRULE($.resistance) },          
          { ALT: () => $.SUBRULE($.timer) },          
          { ALT: () => $.CONSUME(Identifier), LABEL: "effort" },
        ]);
      });
    });

    $.RULE("timer", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.timerShort) },
        { ALT: () => $.SUBRULE($.timerLong) },        
      ]);
    });

    $.RULE("timerLong", () => {
      $.OPTION(() => {
        $.CONSUME(CountDirection, { label: "increment" });
      });
      $.AT_LEAST_ONE_SEP({
        SEP: Colon,
        DEF: () => {
          $.CONSUME(Integer, { LABEL: "segments" });
        },
      });
    });

    $.RULE("timerShort", () => {
      $.OPTION(() => {
        $.CONSUME(CountDirection, { label: "increment" });
      });
      $.CONSUME(Colon, { LABEL: "colon" });
      $.CONSUME(Integer, { LABEL: "segments" });
    });

    $.RULE("resistance", () => {
      $.OR([
        { ALT: () => $.SUBRULE($.resistance_lb) },
        { ALT: () => $.SUBRULE($.resistance_kg) },
        { ALT: () => $.SUBRULE($.resistance_default) },
      ]);
    });

    $.RULE("resistance_kg", () => {
      $.CONSUME(AtResistance);
      $.CONSUME(Integer);
      $.CONSUME(Kelos);
    });

    $.RULE("resistance_lb", () => {
      $.CONSUME(AtResistance);
      $.CONSUME(Integer);
      $.CONSUME(Pounds);
    });

    $.RULE("resistance_default", () => {
      $.CONSUME(AtResistance);
      $.CONSUME(Integer);
    });

    $.RULE("repeater", () => {
      $.CONSUME(GroupOpen);
      $.MANY(() => {
        $.CONSUME(Identifier, { LABEL: "blocks" });
      });
      $.CONSUME(GroupClose);
    });

    $.performSelfAnalysis();

    if (tokens) {
      this.input = tokens;
    }
  }
}
