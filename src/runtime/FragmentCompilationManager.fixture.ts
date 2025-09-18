import { Lexer } from 'chevrotain';
import { allTokens } from '../parser/timer.tokens';
import { MdTimerParse } from '../parser/timer.parser';
import { MdTimerInterpreter } from '../parser/timer.visitor';
import { ICodeStatement } from '../CodeStatement';
import { 
    ActionFragmentCompiler,
    DistanceFragmentCompiler,
    EffortFragmentCompiler,
    IncrementFragmentCompiler,
    LapFragmentCompiler,
    RepFragmentCompiler,
    ResistanceFragmentCompiler,
    RoundsFragmentCompiler,
    TextFragmentCompiler,
    TimerFragmentCompiler
} from './FragmentCompilers';

const lexer = new Lexer(allTokens);
const parser = new MdTimerParse();
const interpreter = new MdTimerInterpreter();

export function parseWodLine(line: string): ICodeStatement[] {
    const lexResult = lexer.tokenize(line);
    parser.input = lexResult.tokens;
    const cst = (parser as any).wodMarkdown();
    if (parser.errors.length > 0) {
        throw new Error(`Parsing errors detected: ${parser.errors[0].message}`);
    }
    return interpreter.visit(cst);
}

export const compilers = [
    new ActionFragmentCompiler(),
    new DistanceFragmentCompiler(),
    new EffortFragmentCompiler(),
    new IncrementFragmentCompiler(),
    new LapFragmentCompiler(),
    new RepFragmentCompiler(),
    new ResistanceFragmentCompiler(),
    new RoundsFragmentCompiler(),
    new TextFragmentCompiler(),
    new TimerFragmentCompiler()
];
