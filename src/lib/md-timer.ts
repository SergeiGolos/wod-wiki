import type { IToken, CstNode } from "chevrotain";
import { Lexer } from "chevrotain";
import { allTokens } from "./timer.tokens";
import { MdTimerParse } from "./timer.parser";
import type { MdTimerBlock } from "./timer.types";
import { MdTimerInterpreter } from "./timer.visitor";

export type MdTimeRuntimeResult = {
  
  source: string;
  tokens: IToken[];
  parser: any;
  syntax: CstNode;
  outcome: MdTimerBlock[];
};

export class MdTimerRuntime {
  lexer: Lexer;
  visitor: MdTimerInterpreter;
  constructor() {
    this.lexer = new Lexer(allTokens);
    this.visitor = new MdTimerInterpreter();
  }

  read(inputText: string): MdTimeRuntimeResult {
    // console.log("INPUT: ", inputText);
    const { tokens } = this.lexer.tokenize(inputText);
    const parser = new MdTimerParse(tokens) as any;

    const cst = parser.wodMarkdown();
    const raw = cst != null ? this.visitor.visit(cst) : ([] as MdTimerBlock[]);
    // console.log("Raw: ", raw);
    return {
      source: inputText,
      tokens,
      parser,
      syntax: cst,
      outcome: raw,
    };
  }
}
