import { Lexer, IRecognitionException } from "chevrotain";
import { MdTimerInterpreter } from "./timer.visitor";
import { MdTimerParse } from "./timer.parser";
import { allTokens } from "./timer.tokens";
import { ICodeStatement } from "../core/models/CodeStatement";
import { IScript, WodScript, ParseError } from "./WodScript";

/**
 * Extended parser type for Chevrotain runtime-generated methods
 */
interface ExtendedParser extends MdTimerParse {
  wodMarkdown(): unknown;
  errors: IRecognitionException[];
}

export class MdTimerRuntime {
  lexer: Lexer;
  visitor: MdTimerInterpreter;
  constructor() {
    this.lexer = new Lexer(allTokens);
    this.visitor = new MdTimerInterpreter();
  }

  read(inputText: string): IScript {
    const { tokens } = this.lexer.tokenize(inputText);
    const parser = new MdTimerParse(tokens) as ExtendedParser;

    this.visitor.clearErrors();
    const cst = parser.wodMarkdown();
    const raw = cst != null ? this.visitor.visit(cst) : ([] as ICodeStatement[]);
    
    // Convert Chevrotain errors to ParseError format
    const parserErrors: ParseError[] = (parser.errors || []).map(err => ({
      message: err.message,
      line: err.token?.startLine,
      column: err.token?.startColumn,
      token: err.token
    }));
    
    const errors = [...parserErrors, ...this.visitor.getErrors()];
    return new WodScript(inputText, raw, errors);
  }
}

