/**
 * @wod-wiki/engine — Umbrella package for Whiteboard Language & WQL engine
 *
 * Re-exports core data vocabulary, lang parser/compiler/runtime/dialects/analytics,
 * and pure WQL query execution for single-dependency consumers.
 *
 * Implements Language Pack API (defineLanguagePack, registerLanguagePack) and
 * headless CLI execution functions.
 */

// ── 1. Core Data Models & Persistence Shapes ─────────────────────────────────
export {
  MetricType,
} from '@/core/models/Metric';

export type {
  IMetric,
  MetricAction,
  MetricOrigin,
} from '@/core/models/Metric';

export {
  CodeStatement,
  ParsedCodeStatement,
} from '@/core/models/CodeStatement';

export type {
  ICodeStatement,
} from '@/core/models/CodeStatement';

export type {
  CodeMetadata,
} from '@/core/models/CodeMetadata';

export {
  OutputStatement,
} from '@/core/models/OutputStatement';

export type {
  IOutputStatement,
  OutputStatementType,
} from '@/core/models/OutputStatement';

export {
  MetricContainer,
} from '@/core/models/MetricContainer';

export type {
  TimeSpan,
} from '@/core/models/TimeSpan';

export type {
  Segment,
  AnalyticsGroup,
  AnalyticsGraphConfig,
} from '@/core/models/AnalyticsModels';
export {
  ownershipRank,
} from '@/core/metrics/ownership/OwnershipResolver';

export {
  createMetricOwnershipLedger,
} from '@/core/metrics/ownership/ledger';

export type {
  MetricOwnershipLedger,
} from '@/core/metrics/ownership/types';
export {
  CONSUMED_HINTS,
  CONSUMED_HINT_KEYS,
  hintMetric,
  hintsToContainer,
  getHints,
  hasHint,
} from '@/core/metrics/hints';

export { Registry } from '@/core/Registry';

export type {
  AnalyticsDataPoint,
  Note,
  NoteSegment,
  BlockIndexRow,
  WorkoutResult,
  Attachment,
  ResultOrigin,
} from '@/types/storage';

export type {
  StoredOutputStatement,
  WorkoutResults,
  ScriptBlock,
  FenceDialect,
} from '@/components/Editor/types';

export { toStoredOutputStatement, VALID_FENCE_DIALECTS } from '@/components/Editor/types';

// ── 2. Lang (Pure): Parser, Dialects, Runtime, Compiler & Analytics ───────────
export {
  createParser,
  sharedParser,
} from '@/parser/parserInstance';

export { MdTimerRuntime } from '@/parser/md-timer';
export { WhiteboardScript } from '@/parser/WhiteboardScript';
export type { IScript } from '@/parser/WhiteboardScript';
export { extractStatements, extractStatementsRaw } from '@/parser/lezer-mapper';
export { classifyStatements } from '@/parser/semantic-classifier';
export { extractSyntaxFacts } from '@/parser/syntax-parser';

export {
  whiteboardScriptLanguage,
  whiteboardScript,
} from '@/parser/whiteboard-script-language';
export {
  DialectStack,
  dialectStack,
  dialectRegistry,
  createDialectStack,
} from '@/dialects/DialectStack';

export type {
  IDialect,
  DialectAnalysis,
} from '@/core/models/Dialect';

export { UnitsDialect } from '@/dialects/UnitsDialect';
export { CrossFitDialect } from '@/dialects/CrossFitDialect';
export { WodDialect } from '@/dialects/WodDialect';
export { CardioDialect } from '@/dialects/CardioDialect';
export { YogaDialect } from '@/dialects/YogaDialect';
export { HabitsDialect } from '@/dialects/HabitsDialect';
export { ClimbDialect } from '@/dialects/ClimbDialect';
export { fuseUnits } from '@/dialects/units/fuseUnits';

export {
  ScriptRuntime,
} from '@/runtime/ScriptRuntime';
export type { ScriptRuntimeDependencies, RuntimeState } from '@/runtime/ScriptRuntime';

export {
  createCompiler,
  strategyRegistry,
  PRODUCTION_STRATEGIES,
} from '@/runtime/services/runtimeServices';

export { JitCompiler } from '@/runtime/compiler/JitCompiler';
export { RuntimeStack } from '@/runtime/RuntimeStack';
export { RuntimeClock, createMockClock } from '@/runtime/RuntimeClock';
export { EventBus } from '@/runtime/events/EventBus';
export { NextEvent } from '@/runtime/events/NextEvent';
export { StartSessionAction } from '@/runtime/actions/stack/StartSessionAction';
export { OutputEmitter } from '@/runtime/OutputEmitter';

export {
  type INowProvider,
  wallClockNow,
  frozenNow,
} from '@/runtime/INowProvider';

export {
  createAnalyticsEngineForBlock,
  type CreateAnalyticsEngineResult,
  type CreateAnalyticsEngineOptions,
} from '@/core/analytics/createAnalyticsEngineForBlock';

export { AnalyticsEngine } from '@/core/analytics/AnalyticsEngine';
export {
  StandardAnalyticsProfile,
  realtimeProcessorRegistry,
  summaryProcessorRegistry,
} from '@/core/analytics/StandardAnalyticsProfile';

export { buildWorkoutResults, countSegmentOutputs } from '@/app/editor/runtimeTimerModel';

export { getAnalyticsFromLogs } from '@/services/AnalyticsTransformer';
// ── 3. WQL (Pure): Grammar, Parser, Vocabulary, QueryService & Dashboard ──────
export {
  QueryService,
  parseQuery,
  isFindQuery,
  isRowsQuery,
} from '@/services/analytics/query';

export { inMemoryFactStore } from './store';

export {
  wql,
  wqlLanguage,
  wqlCompletion,
} from '@/parser/wql-language';
export type {
  QueryResult,
  RowsQueryResult,
  FindQueryResult,
  RowsRun,
  QueryOptions,
  FindOptions,
  FactQueryStore,
  NoteQueryStore,
  BlockQueryStore,
  ResultLogStore,
  EffortQueryStore,
  Series,
  SeriesPoint,
  Aggregator,
  ComparisonOp,
  ParsedQuery,
  ParsedFindQuery,
  ParsedRowsQuery,
  TagFilter,
} from '@/services/analytics/query';

export {
  WQL_METRIC_FAMILIES,
  WQL_METRIC_AGGREGATES,
  WQL_AGGREGATORS,
  WQL_COMPARISON_OPS,
  WQL_TAG_KEYS,
  WQL_VIRTUAL_DIMS,
  WQL_CALC_TARGETS,
  WQL_INTENSITY_TIERS,
  WQL_GRAINS,
  WQL_FIND_TARGETS,
  WQL_SCOPES,
  WQL_CONTENT_FILTER_KEYS,
  WQL_SOURCES,
  WQL_ROLLUP_PERIODS,
  WQL_DISPLAY_UNITS,
} from '@/parser/wql-vocabulary';

export {
  buildDashboardDocument,
  parseQueryWidgetSuffix,
  substituteTokens,
  referencedTokens,
  splitWidgetBody,
  isDashboardWidgetType,
  resolveWidgetType,
  unknownWidgetTypeMessage,
  unknownTokensMessage,
  PLANNED_WIDGET_TYPES,
  defaultTokenValues,
  extractDashboardTokens,
} from '@/lib/dashboard/model';

export type {
  DashboardDocument,
  DashboardWidget,
  DashboardSectionInput,
  DashboardToken,
  DashboardWidgetType,
} from '@/lib/dashboard/model';

// ── 4. Language Pack API ──────────────────────────────────────────────────────
export {
  defineLanguagePack,
  registerLanguagePack,
  unregisterLanguagePack,
  listLanguagePacks,
} from './pack';

export type {
  LanguagePack,
  LanguagePackIdentity,
  LanguagePackLangSlice,
  LanguagePackUiSlice,
} from './pack';

// ── 5. Pure JSON Intermediate Representation (IR) ────────────────────────────
export {
  createIRFile,
  isIRFile,
  statementToNode,
  buildStatementTree,
} from './ir';

export type {
  WodWikiIRFile,
  IrKind,
  StatementNode,
  ExecutionLog,
  CorpusIRData,
  FactSetIRData,
  ResultSetIRData,
  NoteSetIRData,
} from './ir';

// ── 6. CLI Runners & Formatters ───────────────────────────────────────────────
export { runParse, ParseSyntaxError, type ParseOptions } from './cli/parse';
export { runExecution, type RunOptions } from './cli/run';
export { runQueryCli, WqlSyntaxError, loadQueryData, type QueryCliOptions } from './cli/query';
export { loadLanguagePack, PackLoadError } from './cli/loader';
export {
  formatParseOutput,
  formatExecutionOutput,
  formatQueryOutput,
  type OutputFormat,
} from './cli/formatters';
export { cliMain, parseCliArgs, readStdin, type CliParsedArgs } from './cli/runner';
