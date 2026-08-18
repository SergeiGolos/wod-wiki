import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { cliMain, dialectRegistry, unregisterLanguagePack } from '../src/index';

const FIXTURE_PATH = join(process.cwd(), 'stories/fixtures/golden/multi-week-journal.json');
const TEMP_SCRIPT_FILE = join(process.cwd(), 'temp-test-workout.txt');
const TEMP_OUTPUT_FILE = join(process.cwd(), 'temp-test-out.json');
const TEMP_PACK_FILE = join(process.cwd(), 'temp-test-pack.mjs');

describe('wod CLI runner', () => {
  beforeEach(() => {
    writeFileSync(TEMP_SCRIPT_FILE, '(21-15-9)\n  Thrusters @95lb\n  Pull-ups', 'utf-8');
  });

  afterEach(() => {
    if (existsSync(TEMP_SCRIPT_FILE)) unlinkSync(TEMP_SCRIPT_FILE);
    if (existsSync(TEMP_OUTPUT_FILE)) unlinkSync(TEMP_OUTPUT_FILE);
    if (existsSync(TEMP_PACK_FILE)) unlinkSync(TEMP_PACK_FILE);
    unregisterLanguagePack('cli-dynamic-pack');
    dialectRegistry.unregister('cli-dynamic-dialect');
  });

  it('prints help and version with exit code 0', async () => {
    let out = '';
    const codeHelp = await cliMain(['--help'], { stdout: (t) => { out += t; } });
    expect(codeHelp).toBe(0);
    expect(out).toContain('wod CLI');

    let verOut = '';
    const codeVer = await cliMain(['--version'], { stdout: (t) => { verOut += t; } });
    expect(codeVer).toBe(0);
    expect(verOut).toContain('wod v');
  });

  describe('wod parse', () => {
    it('parses workout file and outputs JSON IR (exit code 0)', async () => {
      let stdout = '';
      const code = await cliMain(['parse', TEMP_SCRIPT_FILE, '--format', 'json'], {
        stdout: (t) => { stdout += t; },
      });

      expect(code).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.$schema).toBe('https://wod-wiki.dev/ir/v1.json');
      expect(parsed.kind).toBe('parse-tree');
      expect(parsed.data).toBeDefined();
    });

    it('parses from stdin ("-") (exit code 0)', async () => {
      let stdout = '';
      const code = await cliMain(['parse', '-', '--format', 'json'], {
        stdout: (t) => { stdout += t; },
        readStdinFn: async () => '5 RFT:\n  10 Box Jumps',
      });

      expect(code).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.kind).toBe('parse-tree');
    });

    it('formats parse tree as table and csv', async () => {
      let tableOut = '';
      const codeTable = await cliMain(['parse', TEMP_SCRIPT_FILE, '--format', 'table'], {
        stdout: (t) => { tableOut += t; },
      });
      expect(codeTable).toBe(0);
      expect(tableOut).toContain('Parse Tree');

      let csvOut = '';
      const codeCsv = await cliMain(['parse', TEMP_SCRIPT_FILE, '--format', 'csv'], {
        stdout: (t) => { csvOut += t; },
      });
      expect(codeCsv).toBe(0);
      expect(csvOut).toContain('id,type,from,to,raw,metrics,hints');
    });

    it('writes output to file via -o flag', async () => {
      const code = await cliMain(['parse', TEMP_SCRIPT_FILE, '-o', TEMP_OUTPUT_FILE]);
      expect(code).toBe(0);
      expect(existsSync(TEMP_OUTPUT_FILE)).toBe(true);
      const content = JSON.parse(readFileSync(TEMP_OUTPUT_FILE, 'utf-8'));
      expect(content.kind).toBe('parse-tree');
    });

    it('returns exit code 1 when input file is missing', async () => {
      let stderr = '';
      const code = await cliMain(['parse', 'non-existent-file-12345.txt'], {
        stderr: (t) => { stderr += t; },
      });
      expect(code).toBe(1);
      expect(stderr).toContain('File not found');
    });
  });

  describe('wod run', () => {
    it('executes workout script and emits execution-log IR (exit code 0)', async () => {
      let stdout = '';
      const code = await cliMain(['run', TEMP_SCRIPT_FILE, '--format', 'json'], {
        stdout: (t) => { stdout += t; },
      });

      expect(code).toBe(0);
      const ir = JSON.parse(stdout);
      expect(ir.$schema).toBe('https://wod-wiki.dev/ir/v1.json');
      expect(ir.kind).toBe('execution-log');
      expect(ir.data.results).toBeDefined();
      expect(ir.data.results.completed).toBe(true);
      expect(ir.data.statements.length).toBeGreaterThan(0);
    });

    it('formats run output as table and csv', async () => {
      let tableOut = '';
      const codeTable = await cliMain(['run', TEMP_SCRIPT_FILE, '--format', 'table'], {
        stdout: (t) => { tableOut += t; },
      });
      expect(codeTable).toBe(0);
      expect(tableOut).toContain('Workout Execution Results:');

      let csvOut = '';
      const codeCsv = await cliMain(['run', TEMP_SCRIPT_FILE, '--format', 'csv'], {
        stdout: (t) => { csvOut += t; },
      });
      expect(codeCsv).toBe(0);
      expect(csvOut).toContain('id,outputType,started,ended');
    });
  });

  describe('wod query', () => {
    it('evaluates WQL against --corpus and returns query-result IR (exit code 0)', async () => {
      let stdout = '';
      const code = await cliMain(
        ['query', 'sum:totalVolume{} by {week}', '--corpus', FIXTURE_PATH, '--format', 'json'],
        { stdout: (t) => { stdout += t; } },
      );

      expect(code).toBe(0);
      const ir = JSON.parse(stdout);
      expect(ir.$schema).toBe('https://wod-wiki.dev/ir/v1.json');
      expect(ir.kind).toBe('query-result');
      expect(ir.data.series.length).toBe(1);
      expect(ir.data.series[0].points.length).toBe(5);
    });

    it('evaluates WQL against --stdin-facts (exit code 0)', async () => {
      const sampleFacts = [
        {
          id: 'f1',
          timestamp: 1783357200000,
          metricKey: 'totalVolume',
          type: 'totalVolume',
          value: 1000,
          grain: 'summary',
        },
      ];

      let stdout = '';
      const code = await cliMain(
        ['query', 'sum:totalVolume{}', '--stdin-facts', '--format', 'json'],
        {
          stdout: (t) => { stdout += t; },
          readStdinFn: async () => JSON.stringify(sampleFacts),
        },
      );

      expect(code).toBe(0);
      const ir = JSON.parse(stdout);
      expect(ir.kind).toBe('query-result');
      expect(ir.data.series[0].points[0].value).toBe(1000);
    });

    it('evaluates rows query against --stdin-log (exit code 0)', async () => {
      const sampleLog = {
        results: {
          startTime: 1783357200000,
          endTime: 1783357260000,
          duration: 60000,
          completed: true,
        },
        statements: [
          {
            id: 1,
            outputType: 'segment',
            timeSpan: { started: 1783357200000, ended: 1783357260000 },
            metrics: [{ type: 'round', value: 1 }],
            sourceBlockKey: 'test-block',
            stackLevel: 1,
          },
        ],
      };

      let stdout = '';
      const code = await cliMain(
        ['query', 'rows:{result:stdin-result-1}', '--stdin-log', '--format', 'json'],
        {
          stdout: (t) => { stdout += t; },
          readStdinFn: async () => JSON.stringify(sampleLog),
        },
      );

      expect(code).toBe(0);
      const ir = JSON.parse(stdout);
      expect(ir.kind).toBe('rows-result');
      expect(ir.data.runs.length).toBe(1);
    });

    it('returns exit code 1 when no dataset is provided', async () => {
      let stderr = '';
      const code = await cliMain(['query', 'sum:totalVolume{}'], {
        stderr: (t) => { stderr += t; },
      });
      expect(code).toBe(1);
      expect(stderr).toContain('Query requires input data');
    });

    it('returns exit code 2 on malformed WQL query syntax error', async () => {
      let stderr = '';
      const code = await cliMain(
        ['query', 'invalid query clause ???', '--corpus', FIXTURE_PATH],
        { stderr: (t) => { stderr += t; } },
      );
      expect(code).toBe(2);
      expect(stderr).toContain('WQL Syntax Error');
    });
  });

  describe('--pack dynamic loading', () => {
    it('dynamically loads a Language Pack module and registers it', async () => {
      writeFileSync(
        TEMP_PACK_FILE,
        `
export default {
  identity: { id: 'cli-dynamic-pack', name: 'CLI Dynamic Pack' },
  lang: {
    analyzer: class CliDynamicDialect {
      id = 'cli-dynamic-dialect';
      name = 'CLI Dynamic Dialect';
      priority = 20;
      analyze(statement) {
        if (/thrusters/i.test(statement.meta?.raw ?? '')) {
          return { metrics: [{ type: 'hint', value: 'pack.thruster_found', image: 'pack.thruster_found', origin: 'dialect' }] };
        }
        return {};
      }
    }
  }
};
`,
        'utf-8',
      );

      let stdout = '';
      const code = await cliMain(
        ['parse', TEMP_SCRIPT_FILE, '--pack', TEMP_PACK_FILE, '--format', 'json'],
        { stdout: (t) => { stdout += t; } },
      );

      expect(code).toBe(0);
      const ir = JSON.parse(stdout);
      const hints = JSON.stringify(ir);
      expect(hints).toContain('pack.thruster_found');
    });

    it('returns exit code 3 when Language Pack fails to load', async () => {
      let stderr = '';
      const code = await cliMain(
        ['parse', TEMP_SCRIPT_FILE, '--pack', './non-existent-pack-file-999.mjs'],
        { stderr: (t) => { stderr += t; } },
      );
      expect(code).toBe(3);
      expect(stderr).toContain('Failed to load Language Pack');
    });
  });
});
