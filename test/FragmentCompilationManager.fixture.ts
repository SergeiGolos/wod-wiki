import { Lexer } from 'chevrotain';
import { allTokens } from '../src/parser/timer.tokens';
import { MdTimerParse } from '../src/parser/timer.parser';
import { MdTimerInterpreter } from '../src/parser/timer.visitor';
import { ICodeStatement } from '../src/CodeStatement';
import { IFragmentCompiler } from '../src/runtime/FragmentCompilationManager';
import { MetricValue } from '../src/runtime/RuntimeMetric';
import { ICodeFragment } from '../src/CodeFragment';
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
} from '../src/runtime/FragmentCompilers';

const lexer = new Lexer(allTokens);
const parser = new MdTimerParse();
const interpreter = new MdTimerInterpreter();

export function parseWodLine(line: string): ICodeStatement[] {
    const lexResult = lexer.tokenize(line);
    parser.input = lexResult.tokens;
    const cst = parser.wodMarkdown();
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
