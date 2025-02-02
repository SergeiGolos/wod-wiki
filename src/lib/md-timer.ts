import type { IToken, CstNode } from "chevrotain";
import { Lexer } from "chevrotain";
import { allTokens } from "./timer.tokens";
import { MdTimerParse } from "./timer.parser";
import type { StatementBlock } from "./StatementBlock";
import { MdTimerInterpreter } from "./timer.visitor";

export type WodRuntimeScript = {
  source: string;
  tokens: IToken[];
  parser: any;
  syntax: CstNode;
  outcome: StatementBlock[];
};

export interface WodWikiInitializer {
  code?: string;
  syntax: string;
}

export interface WodWikiToken {
  token: string;
  foreground: string;
  fontStyle?: string;
  hints: WodWikiTokenHint[];
}

export interface WodWikiTokenHint {
  hint: string;
  position: "after" | "before";
}


export class MdTimerRuntime {
  lexer: Lexer;
  visitor: MdTimerInterpreter;
  constructor() {
    this.lexer = new Lexer(allTokens);
    this.visitor = new MdTimerInterpreter();
  }

  read(inputText: string): WodRuntimeScript {    
    const { tokens } = this.lexer.tokenize(inputText);
    const parser = new MdTimerParse(tokens) as any;

    const cst = parser.wodMarkdown();    
    const raw = cst != null ? this.visitor.visit(cst) : ([] as StatementBlock[]);    
    return {
      source: inputText,
      tokens,
      parser,
      syntax: cst,
      outcome: raw,
    };
  }
}
