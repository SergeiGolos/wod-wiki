// import type { IToken, CstNode } from "chevrotain";
import { Lexer } from "chevrotain";
import { MdTimerInterpreter } from "./parser/timer.visitor";
import { MdTimerParse } from "./parser/timer.parser";
import { allTokens } from "./parser/timer.tokens";
import { StatementNode } from "./timer.types";


export type WodRuntimeScript = {
  source: string;
  statements: StatementNode[];  
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
  offSet?: number | undefined;
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
    const raw = cst != null ? this.visitor.visit(cst) : ([] as StatementNode[]);    
    return {
      source: inputText,
      statements: raw,
      
    };
  }
}
