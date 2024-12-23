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

    $.RULE("resistance", () => {            
      $.OR([
        { ALT: () => $.SUBRULE($.resitance_lb) },
        { ALT: () => $.SUBRULE($.resitance_kg) },
        { ALT: () => $.SUBRULE($.resitance_default) },
      ]);            
    });

    $.RULE("resitance_kg", () => {                
      $.OPTION(() => {
        $.CONSUME(AtResistance);
      });            
      $.CONSUME(Integer);      
      $.CONSUME(Kelos);      
    });

    $.RULE("resitance_lb", () => {                
      $.OPTION(() => {
        $.CONSUME(AtResistance);
      });            
      $.CONSUME(Integer);      
      $.CONSUME(Kelos);      
    });
  
    $.RULE("resitance_default", () => {                      
      $.CONSUME(AtResistance);      
      $.CONSUME(Integer);      
    });


    $.RULE("repeater", () => {
      $.CONSUME(GroupOpen);
      $.MANY(() => {
        $.SUBRULE($.stringValue, { LABEL: "blocks" });
      });
      $.CONSUME(GroupClose);
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
