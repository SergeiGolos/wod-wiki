import { describe, it, expect } from 'vitest';
import * as engine from '../src/index';

describe('@bitcobblers/wod-wiki-engine re-exports', () => {
  it('re-exports core data models and shapes', () => {
    expect(engine.MetricType).toBeDefined();
    expect(engine.CodeStatement).toBeDefined();
    expect(engine.ParsedCodeStatement).toBeDefined();
    expect(engine.OutputStatement).toBeDefined();
    expect(engine.MetricContainer).toBeDefined();
    expect(engine.ownershipRank).toBeDefined();
    expect(engine.createMetricOwnershipLedger).toBeDefined();
    expect(engine.Registry).toBeDefined();
    expect(engine.CONSUMED_HINTS).toBeDefined();
    expect(engine.toStoredOutputStatement).toBeDefined();
  });

  it('re-exports pure lang parser, compiler, runtime, dialects, and analytics', () => {
    expect(engine.createParser).toBeDefined();
    expect(engine.WhiteboardScript).toBeDefined();
    expect(engine.extractStatements).toBeDefined();
    expect(engine.DialectStack).toBeDefined();
    expect(engine.dialectStack).toBeDefined();
    expect(engine.dialectRegistry).toBeDefined();
    expect(engine.UnitsDialect).toBeDefined();
    expect(engine.CrossFitDialect).toBeDefined();
    expect(engine.WodDialect).toBeDefined();
    expect(engine.CardioDialect).toBeDefined();
    expect(engine.YogaDialect).toBeDefined();
    expect(engine.HabitsDialect).toBeDefined();
    expect(engine.ClimbDialect).toBeDefined();
    expect(engine.ScriptRuntime).toBeDefined();
    expect(engine.createCompiler).toBeDefined();
    expect(engine.strategyRegistry).toBeDefined();
    expect(engine.RuntimeStack).toBeDefined();
    expect(engine.RuntimeClock).toBeDefined();
    expect(engine.EventBus).toBeDefined();
    expect(engine.NextEvent).toBeDefined();
    expect(engine.StartSessionAction).toBeDefined();
    expect(engine.createAnalyticsEngineForBlock).toBeDefined();
    expect(engine.AnalyticsEngine).toBeDefined();
    expect(engine.StandardAnalyticsProfile).toBeDefined();
    expect(engine.buildWorkoutResults).toBeDefined();
  });

  it('re-exports pure wql query execution, grammar, and vocabulary', () => {
    expect(engine.QueryService).toBeDefined();
    expect(engine.parseQuery).toBeDefined();
    expect(engine.isFindQuery).toBeDefined();
    expect(engine.isRowsQuery).toBeDefined();
    expect(engine.WQL_AGGREGATORS).toBeDefined();
    expect(engine.WQL_TAG_KEYS).toBeDefined();
    expect(engine.WQL_CALC_TARGETS).toBeDefined();
    expect(engine.buildDashboardDocument).toBeDefined();
  });

  it('exports Language Pack API', () => {
    expect(engine.defineLanguagePack).toBeDefined();
    expect(engine.registerLanguagePack).toBeDefined();
    expect(engine.unregisterLanguagePack).toBeDefined();
    expect(engine.listLanguagePacks).toBeDefined();
  });

  it('exports IR envelope and helpers', () => {
    expect(engine.createIRFile).toBeDefined();
    expect(engine.isIRFile).toBeDefined();
    expect(engine.statementToNode).toBeDefined();
    expect(engine.buildStatementTree).toBeDefined();
  });

  it('exports CLI runners and formatters', () => {
    expect(engine.runParse).toBeDefined();
    expect(engine.runExecution).toBeDefined();
    expect(engine.runQueryCli).toBeDefined();
    expect(engine.loadLanguagePack).toBeDefined();
    expect(engine.formatParseOutput).toBeDefined();
    expect(engine.formatExecutionOutput).toBeDefined();
    expect(engine.formatQueryOutput).toBeDefined();
    expect(engine.cliMain).toBeDefined();
    expect(engine.parseCliArgs).toBeDefined();
  });
});
