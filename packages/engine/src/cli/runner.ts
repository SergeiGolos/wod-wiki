/**
 * Unified `wod` CLI Runner
 *
 * Implements CLI command routing, argument parsing, pipe handling,
 * and exit code conventions per wayfinder #962 and issue #967.
 *
 * Exit Codes:
 *   0 - OK / Success (including empty query results)
 *   1 - Runtime error (file missing, bad arguments, execution error)
 *   2 - Parse / Syntax error (invalid Whiteboard Script or malformed WQL)
 *   3 - Pack load error (failed to import or register --pack)
 */

function getFs() {
  if (typeof globalThis.process?.versions?.node === 'undefined' && typeof (globalThis as any).Bun === 'undefined') {
    throw new Error('File system operations are only supported in Node / Bun environments');
  }
  return require('fs');
}
import { loadLanguagePack, PackLoadError } from './loader';
import { runParse, ParseSyntaxError } from './parse';
import { runExecution } from './run';
import { runQueryCli, WqlSyntaxError } from './query';
import {
  formatParseOutput,
  formatExecutionOutput,
  formatQueryOutput,
  type OutputFormat,
} from './formatters';

const VERSION = '0.6.0';

export interface CliParsedArgs {
  subcommand?: 'parse' | 'run' | 'query' | 'help' | 'version';
  target?: string;
  corpus?: string;
  stdinLog?: boolean;
  stdinFacts?: boolean;
  format: OutputFormat;
  output?: string;
  packs: string[];
  sport?: string;
  unit?: string;
  help?: boolean;
  version?: boolean;
}

export function parseCliArgs(args: string[]): CliParsedArgs {
  const result: CliParsedArgs = {
    format: 'json',
    packs: [],
  };

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
      i++;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
      i++;
    } else if (arg === '--corpus' || arg === '-c') {
      result.corpus = args[++i];
      i++;
    } else if (arg === '--stdin-log') {
      result.stdinLog = true;
      i++;
    } else if (arg === '--stdin-facts') {
      result.stdinFacts = true;
      i++;
    } else if (arg === '--format') {
      const fmt = args[++i] as OutputFormat;
      if (fmt === 'json' || fmt === 'table' || fmt === 'csv') {
        result.format = fmt;
      }
      i++;
    } else if (arg.startsWith('--format=')) {
      const fmt = arg.slice('--format='.length) as OutputFormat;
      if (fmt === 'json' || fmt === 'table' || fmt === 'csv') {
        result.format = fmt;
      }
      i++;
    } else if (arg === '-o' || arg === '--output') {
      result.output = args[++i];
      i++;
    } else if (arg.startsWith('--output=')) {
      result.output = arg.slice('--output='.length);
      i++;
    } else if (arg === '--pack') {
      const packSpec = args[++i];
      if (packSpec) result.packs.push(packSpec);
      i++;
    } else if (arg.startsWith('--pack=')) {
      result.packs.push(arg.slice('--pack='.length));
      i++;
    } else if (arg === '--sport') {
      result.sport = args[++i];
      i++;
    } else if (arg === '--unit') {
      result.unit = args[++i];
      i++;
    } else if (!result.subcommand) {
      if (arg === 'parse' || arg === 'run' || arg === 'query' || arg === 'help' || arg === 'version') {
        result.subcommand = arg;
      } else {
        result.target = arg;
      }
      i++;
    } else if (!result.target) {
      result.target = arg;
      i++;
    } else {
      i++;
    }
  }

  return result;
}

export async function readStdin(): Promise<string> {
  if (typeof (globalThis as any).Bun?.stdin?.text === 'function') {
    return (globalThis as any).Bun.stdin.text();
  }
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  const chunks: Buffer[] = [];
  process.stdin.on('data', (chunk) => {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  });
  process.stdin.on('end', () => {
    resolve(Buffer.concat(chunks).toString('utf-8'));
  });
  process.stdin.on('error', (err) => {
    reject(err);
  });
  return promise;
}

function getUsageText(): string {
  return `
wod CLI — Headless Whiteboard Language & WQL Engine runner (v${VERSION})

USAGE:
  wod parse <file | -> [options]
  wod run <file | -> [options]
  wod query '<wql-string>' [options]

SUBCOMMANDS:
  parse <file | ->    Parse Whiteboard Script into AST StatementNode IR (kind: 'parse-tree')
  run <file | ->      Execute Whiteboard Script state machine and emit ExecutionLog IR (kind: 'execution-log')
  query '<wql>'       Evaluate WQL query and emit QueryResult / RowsQueryResult / FindQueryResult IR

INPUT SOURCING (for 'query'):
  -c, --corpus <path> Load historical corpus dataset from a versioned JSON file
  --stdin-log         Read kind: 'execution-log' JSON payload from stdin
  --stdin-facts       Read raw kind: 'fact-set' JSON payload from stdin

OPTIONS:
  --format <fmt>      Output format: json (default), table, csv
  -o, --output <path> Write output to a file instead of stdout
  --pack <module>     Dynamically load and register a Language Pack (repeatable)
  --sport <sport>     Target sport fence dialect (e.g. climbing, crossfit)
  --unit <unit>       Preferred display unit for queries (e.g. lb, kg)
  -h, --help          Show help message
  -v, --version       Show version number

EXIT CODES:
  0 - OK / Success
  1 - General / Runtime error
  2 - Parse / Syntax error
  3 - Language Pack load error
`;
}

function printUsage(writer?: (text: string) => void): void {
  const text = getUsageText();
  if (writer) {
    writer(text);
  } else {
    console.log(text);
  }
}

/**
 * Main CLI entry point. Returns numeric exit code.
 */
export async function cliMain(
  argv: string[] = process.argv.slice(2),
  io: {
    stdout?: (text: string) => void;
    stderr?: (text: string) => void;
    readStdinFn?: () => Promise<string>;
  } = {},
): Promise<number> {
  const writeOut = io.stdout ?? ((t: string) => process.stdout.write(t + '\n'));
  const writeErr = io.stderr ?? ((t: string) => process.stderr.write(t + '\n'));
  const getStdin = io.readStdinFn ?? readStdin;

  const parsed = parseCliArgs(argv);

  if (parsed.version || parsed.subcommand === 'version') {
    writeOut(`wod v${VERSION}`);
    return 0;
  }

  if (parsed.help || parsed.subcommand === 'help') {
    printUsage(writeOut);
    return 0;
  }

  if (!parsed.subcommand) {
    printUsage(writeErr);
    return 1;
  }
  // 1. Load any requested Language Packs (Exit code 3 on failure)
  for (const packSpec of parsed.packs) {
    try {
      await loadLanguagePack(packSpec);
    } catch (err) {
      if (err instanceof PackLoadError) {
        writeErr(err.message);
      } else {
        writeErr(`[wod] Language pack load error: ${err instanceof Error ? err.message : String(err)}`);
      }
      return 3;
    }
  }

  // Output destination helper
  const deliverOutput = (formattedText: string) => {
    if (parsed.output) {
      getFs().writeFileSync(parsed.output, formattedText, 'utf-8');
    } else {
      writeOut(formattedText);
    }
  };

  // 2. Dispatch subcommands
  try {
    if (parsed.subcommand === 'parse') {
      if (!parsed.target) {
        writeErr('[wod parse] Error: Missing input file or "-" for stdin');
        return 1;
      }

      let source: string;
      if (parsed.target === '-') {
        source = await getStdin();
      } else {
        const fs = getFs();
        if (!fs.existsSync(parsed.target)) {
          writeErr(`[wod parse] File not found: ${parsed.target}`);
          return 1;
        }
        source = fs.readFileSync(parsed.target, 'utf-8');
      }

      const ir = runParse(source, { sport: parsed.sport, sourceLabel: `cli:wod parse ${parsed.target}` });
      const pretty = !parsed.output && Boolean(process.stdout.isTTY);
      const formatted = formatParseOutput(ir, parsed.format, pretty);
      deliverOutput(formatted);
      return 0;
    }

    if (parsed.subcommand === 'run') {
      if (!parsed.target) {
        writeErr('[wod run] Error: Missing input file or "-" for stdin');
        return 1;
      }

      let source: string;
      if (parsed.target === '-') {
        source = await getStdin();
      } else {
        const fs = getFs();
        if (!fs.existsSync(parsed.target)) {
          writeErr(`[wod run] File not found: ${parsed.target}`);
          return 1;
        }
        source = fs.readFileSync(parsed.target, 'utf-8');
      }

      const ir = await runExecution(source, { sport: parsed.sport, sourceLabel: `cli:wod run ${parsed.target}` });
      const pretty = !parsed.output && Boolean(process.stdout.isTTY);
      const formatted = formatExecutionOutput(ir, parsed.format, pretty);
      deliverOutput(formatted);
      return 0;
    }

    if (parsed.subcommand === 'query') {
      if (!parsed.target) {
        writeErr('[wod query] Error: Missing WQL query argument');
        return 1;
      }

      let stdinLogContent: string | undefined;
      let stdinFactsContent: string | undefined;

      if (parsed.stdinLog) {
        stdinLogContent = await getStdin();
      } else if (parsed.stdinFacts) {
        stdinFactsContent = await getStdin();
      } else if (!parsed.corpus) {
        writeErr('[wod query] Error: Query requires input data. Specify --corpus <file>, --stdin-log, or --stdin-facts.');
        return 1;
      }

      const ir = await runQueryCli(parsed.target, {
        corpusPath: parsed.corpus,
        stdinLog: stdinLogContent,
        stdinFacts: stdinFactsContent,
        preferredUnit: parsed.unit,
        sourceLabel: `cli:wod query "${parsed.target}"`,
      });

      const pretty = !parsed.output && Boolean(process.stdout.isTTY);
      const formatted = formatQueryOutput(ir, parsed.format, pretty);
      deliverOutput(formatted);
      return 0;
    }

    writeErr(`[wod] Unknown subcommand "${parsed.subcommand}"`);
    return 1;
  } catch (error) {
    if (error instanceof ParseSyntaxError || error instanceof WqlSyntaxError) {
      writeErr(error.message);
      return 2;
    }
    if (error instanceof PackLoadError) {
      writeErr(error.message);
      return 3;
    }
    writeErr(`[wod] Error: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}
