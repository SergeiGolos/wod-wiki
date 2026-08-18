#!/usr/bin/env node
/**
 * Whiteboard CLI runner
 * Usage: wod <command> [options]
 */

import { parseScript, RuntimeFactory, JitCompiler } from '@wod-wiki/lang';
import { parseQuery, QueryService } from '@wod-wiki/wql';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
WOD Wiki CLI Engine

Commands:
  parse <text>     Parse whiteboard script
  run <text>       Execute whiteboard script
  query <wql>      Run WQL query
    `);
    process.exit(0);
  }

  if (command === 'parse') {
    const input = args.slice(1).join(' ');
    const parsed = parseScript(input);
    console.log(JSON.stringify(parsed, null, 2));
    process.exit(0);
  }

  if (command === 'run') {
    const input = args.slice(1).join(' ');
    const parsed = parseScript(input);
    const factory = new RuntimeFactory(new JitCompiler());
    const runtime = factory.createRuntime({
      id: 'cli-block',
      startLine: 1,
      endLine: parsed.statements.length,
      content: input,
      state: 'idle',
      statements: parsed.statements,
      version: 1,
      createdAt: Date.now(),
    });
    console.log(JSON.stringify({ statements: parsed.statements, runtime: runtime ? 'initialized' : 'null' }, null, 2));
    process.exit(0);
  }

  if (command === 'query') {
    const query = args.slice(1).join(' ');
    const ast = parseQuery(query);
    const service = new QueryService();
    const result = await service.runQuery(query);
    console.log(JSON.stringify({ ast, result }, null, 2));
    process.exit(0);
  }

  console.error(`Unknown command: ${command}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
