// import type { IToken, CstNode } from "chevrotain";
import { Lexer } from "chevrotain";
import { MdTimerInterpreter } from "./timer.visitor";
import { MdTimerParse } from "./timer.parser";
import { allTokens } from "./timer.tokens";
import { StatementNode, WodRuntimeScript } from "../timer.types";


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
