/**
 * WQL scenario catalog driver (spec: wayfinder test-validation-harness
 * asset 006). Discovers `packages/wql/tests/fixtures/scenarios/*.md` — one
 * file = one scenario test, zero TS changes to add a scenario — executes
 * the query over the referenced corpus journal, and validates the output.
 */

import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { QueryService } from '../src/QueryService';
import { parseQuery, isRowsQuery, isFindQuery } from '../src/wql';
import { loadJournal, journalStores } from './harness/corpus';
import { parseScenarioFile } from './harness/scenarioFixture/scenarioFile';
import { compareScenarioResult, type ActualScenarioResult } from './harness/scenarioFixture/compare';

const SCENARIOS_DIR = join(__dirname, 'fixtures/scenarios');
const FILES = existsSync(SCENARIOS_DIR)
  ? readdirSync(SCENARIOS_DIR).filter((f) => f.endsWith('.md'))
  : [];

describe('wql scenario catalog', () => {
  if (FILES.length === 0) {
    it.skip('no scenarios discovered', () => {});
    return;
  }

  describe.each(FILES)('%s', (file) => {
    const raw = readFileSync(join(SCENARIOS_DIR, file), 'utf-8');
    const scenario = parseScenarioFile(raw, `fixtures/scenarios/${file}`);

    it(scenario.title, async () => {
      const corpusFile = scenario.corpus.endsWith('.json') ? scenario.corpus : `${scenario.corpus}.json`;
      const journal = loadJournal(corpusFile);
      const stores = journalStores(journal);
      const service = new QueryService(stores);

      let actual: ActualScenarioResult;
      try {
        const parsed = parseQuery(scenario.query);
        if (parsed.error) {
          actual = { error: parsed.error };
        } else if (isRowsQuery(parsed)) {
          actual = await service.runRows(parsed);
        } else if (isFindQuery(parsed)) {
          actual = await service.runFind(parsed) as any;
        } else {
          actual = await service.run(parsed, {
            preferredUnit: scenario.preferredUnit,
            rangeEnd: scenario.rangeEnd,
          });
        }
      } catch (err) {
        actual = { error: err instanceof Error ? err.message : String(err) };
      }

      const diffs = compareScenarioResult(scenario, actual);
      for (const diff of diffs) {
        expect.fail(diff);
      }
    });
  });
});
