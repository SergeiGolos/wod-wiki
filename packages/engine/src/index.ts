/**
 * @bitcobblers/wod-wiki-engine — Umbrella package for Whiteboard Language & WQL engine
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
} from './core/models/Metric';

export type {
  IMetric,
  MetricAction,
  MetricOrigin,
} from './core/models/Metric';

export {
  CodeStatement,
  ParsedCodeStatement,
} from './core/models/CodeStatement';

export type {
  ICodeStatement,
} from './core/models/CodeStatement';

export {
  CodeMetadata,
} from './core/models/CodeMetadata';

export type {
  ICodeMetadata,
} from './core/models/CodeMetadata';

export {
  OutputStatement,
} from './core/models/OutputStatement';

export type {
  IOutputStatement,
  OutputStatementType,
} from './core/models/OutputStatement';

export {
  MetricContainer,
} from './core/models/MetricContainer';

export {
  TimeSpan,
} from './runtime/models/TimeSpan';

export type {
  Segment,
  AnalyticsGroup,
  AnalyticsGraphConfig,
} from './core/models/AnalyticsModels';
export {
  ownershipRank,
} from './core/metrics/ownership/OwnershipResolver';

export {
  createMetricOwnershipLedger,
} from './core/metrics/ownership/ledger';

export type {
  MetricOwnershipLedger,
} from './core/metrics/ownership/types';
export {
  CONSUMED_HINTS,
  CONSUMED_HINT_KEYS,
  hintMetric,
  hintsToContainer,
  getHints,
  hasHint,
} from './core/metrics/hints';

export { Registry } from './core/Registry';

export type {
  AnalyticsDataPoint,
  Note,
  NoteSegment,
  BlockIndexRow,
  WorkoutResult,
  Attachment,
  ResultOrigin,
} from './types/storage';

export type {
  StoredOutputStatement,
  WorkoutResults,
  ScriptBlock,
  FenceDialect,
} from './types';

export { toStoredOutputStatement, VALID_FENCE_DIALECTS } from './types';

export { Duration } from './core/models/Duration';
export { DEFAULT_RUNTIME_OPTIONS } from './runtime/contracts-direct';
export { ExecutionContext } from './runtime/ExecutionContext';
export {
  compileLineForm,
  outputNodeId,
  type CompiledLineForm,
  type LineFormScope,
} from './core/analytics/calc/lineform';
export { compoundName, type DimVector } from './core/analytics/calc/dimensions';
export { BlockKey } from './core/models/BlockKey';
export type { IMetricSource } from './core/contracts/IMetricSource';
export type { IMetricContainer } from './core/contracts/IMetricContainer';
export type { IMetricOwnershipResolver } from './core/contracts/IMetricOwnershipResolver';
export type { VisualizerSize, VisualizerFilter, DisplayStatus } from './core/models/DisplayItem';
export { metricPresentation, computeColumnLabel, computeLabel, buildTooltip, isTimeLikeMetric } from './core/metrics/presentation';
export type { MetricPresentationToken, MetricPresentationSurface, IMetricPresentationPolicy } from './core/metrics/presentation';
export {
  CompositeEffortRegistry,
  InMemoryEffortRegistry,
  EffortResolver,
} from './effort-registry';
export type {
  IEffort,
  IEffortRegistry,
  IEffortResolver,
  EffortDiscipline,
  EffortRegistrySource,
  IntensityTier,
} from './effort-registry';

export {
  STORE_CALCS,
  BUILTIN_CALCS,
} from './core/analytics/calc/seeds';
export { CalculationRegistry } from './core/analytics/calc/registry';
export { LookupRegistry } from './core/analytics/calc/lookup';
export { createCalcEngine } from './core/analytics/calc/factory';
export { evaluate } from './core/analytics/calc/evaluator';
export { DIM_ZERO } from './core/analytics/calc/dimensions';
export { ABSENT, truthy } from './core/analytics/calc/values';
export type { Val } from './core/analytics/calc/values';
export type { CalculationDefinition, CalcOrigin, CalcScope, CalcNode, CalcVariant } from './core/analytics/calc/types';
export type { ExprNode } from './core/analytics/calc/ast';
export type { ParseError } from './core/types/core';


// ── 2. Lang (Pure): Parser, Dialects, Runtime, Compiler & Analytics ───────────
export {
  createParser,
  sharedParser,
} from './parser/parserInstance';

export { MdTimerRuntime } from './parser/md-timer';
export { WhiteboardScript } from './parser/WhiteboardScript';
export type { IScript } from './parser/WhiteboardScript';
export { extractStatements, extractStatementsRaw } from './parser/lezer-mapper';
export { classifyStatements } from './parser/semantic-classifier';
export { extractSyntaxFacts } from './parser/syntax-parser';

export {
  whiteboardScriptLanguage,
  whiteboardScript,
} from './parser/whiteboard-script-language';
export {
  DialectStack,
  dialectStack,
  dialectRegistry,
  createDialectStack,
} from './dialects/DialectStack';

export type {
  IDialect,
  DialectAnalysis,
} from './core/models/Dialect';

export { UnitsDialect } from './dialects/UnitsDialect';
export { CrossFitDialect } from './dialects/CrossFitDialect';
export { WodDialect } from './dialects/WodDialect';
export { RuntimeFactory } from './runtime/compiler/RuntimeFactory';
export { RuntimeBuilder } from './runtime/compiler/RuntimeBuilder';
export { BlockBuilder } from './runtime/compiler/BlockBuilder';
export type { BlockTemplate } from './runtime/compiler/BlockTemplate';
export { compose as composeBlockTemplate } from './runtime/compiler/BlockTemplateComposer';
export type { IRuntimeFactory } from './runtime/compiler/RuntimeFactory';

export { CardioDialect } from './dialects/CardioDialect';
export { YogaDialect } from './dialects/YogaDialect';
export { HabitsDialect } from './dialects/HabitsDialect';
export { ClimbDialect } from './dialects/ClimbDialect';
export { fuseUnits } from './dialects/units/fuseUnits';

export {
  ScriptRuntime,
} from './runtime/ScriptRuntime';
export type { ScriptRuntimeDependencies, RuntimeState } from './runtime/ScriptRuntime';


export {
  createCompiler,
  strategyRegistry,
  PRODUCTION_STRATEGIES,
} from './runtime/services/runtimeServices';

export { JitCompiler } from './runtime/compiler/JitCompiler';
export { RuntimeStack } from './runtime/RuntimeStack';
export { RuntimeClock, createMockClock } from './runtime/RuntimeClock';
export { EventBus } from './runtime/events/EventBus';
export { TickEvent } from './runtime/events/TickEvent';
export { NextEvent } from './runtime/events/NextEvent';
export { StartSessionAction } from './runtime/actions/stack/StartSessionAction';
export {
  RegisterEventHandlerAction,
  UnregisterEventHandlerAction,
  EmitEventAction,
} from './runtime/actions/events';
export {
  StartWorkoutAction,
  PushRestBlockAction,
  PushBlockAction,
  PopBlockAction,
  NextAction,
  EmitSystemOutputAction,
  CompileAndPushBlockAction,
  ClearChildrenAction,
  AbortSessionAction,
  UpdateNextPreviewAction,
} from './runtime/actions/stack';
export { PlaySoundAction } from './runtime/actions/audio';
export { ErrorAction } from './runtime/actions';

export { OutputEmitter } from './runtime/OutputEmitter';
export { SnapshotClock } from './runtime/RuntimeClock';
export type {
  IScriptRuntime,
  IRuntimeBehavior,
  IRuntimeAction,
  IRuntimeBlock,
  IRuntimeClock,
  IRuntimeStack,
  StackSnapshot,
  IBlockContext,
  IEventBus,
  IEvent,
  IJitCompiler,
  IMemoryReference,
  IRuntimeBlockStrategy,
} from './runtime/contracts';
export type {
  IBehaviorContext,
  IRuntimeContext,
  RuntimeError,
  IRuntimeMemory,
  IRuntimeOptions,
  RuntimeStackOptions,
  IRuntimeSubscription,
  InterceptMode,
  TestableBlockConfig,
  IDisplayStackState,
  IDistributedMetrics,
  IRuntimeEventProvider,
} from './runtime/contracts-direct';
export type { IBlockRef } from './runtime/contracts/primitives/IBlockRef';
export type { BlockLifecycleOptions } from './runtime/contracts/primitives/IBlockLifecycle';
export type { IEventHandler } from './runtime/contracts/events/IEventHandler';
export type {
  ITimerSource,
  IRoundSource,
  IRepSource,
  IMetricPromoter,
  ICompletionSource,
  IChildIndexSource,
} from './runtime/contracts/behaviors';
export { TypedMemoryReference } from './runtime/impl/TypedMemoryReference';
export { MemoryLocation } from './runtime/memory/MemoryLocation';

export { useTimerElapsed } from './runtime/hooks/useTimerElapsed';
export { useStackSnapshot, useSnapshotBlocks, useSnapshotCurrentBlock } from './runtime/hooks/useStackSnapshot';
export { useOutputStatements, useLiveAnalytics, useOutputStatement, useBlockOutputs, useOutputHierarchy } from './runtime/hooks/useOutputStatements';
export { useNextPreview, type NextPreview } from './runtime/hooks/useNextPreview';
export {
  useStackTimers,
  usePrimaryTimer,
  useSecondaryTimers,
  useActiveControls,
  useStackFragmentSources,
  useStackDisplayRows,
  type StackTimerEntry,
  type StackFragmentEntry,
  type StackDisplayEntry,
} from './runtime/hooks/useStackDisplay';
export { useMemorySubscription } from './runtime/hooks/useMemorySubscription';
export {
  useBlockMemory,
  useTimerState,
  useRoundState,
  useDisplayState,
  useTimerDisplay,
  useRoundDisplay,
  useFragmentSource,
  type TimerDisplayValues,
  type RoundDisplayValues,
} from './runtime/hooks/useBlockMemory';
export { RuntimeLogger } from './runtime/RuntimeLogger';
export { RuntimeAdapter } from './runtime/adapters/RuntimeAdapter';
export { RuntimeMemory } from './runtime/RuntimeMemory';
export { RuntimeObservers } from './runtime/RuntimeObservers';
export type { MemoryEntry, ExecutionSnapshot, RuntimeStackBlock, MemoryGrouping, BlockType, BlockStatus, MemoryType } from './runtime/types/executionSnapshot';
export { useRuntimeExecution, type UseRuntimeExecutionReturn, type ExecutionStatus } from './runtime/hooks/useRuntimeExecution';
export { useScriptRuntime, ScriptRuntimeProvider, useScriptRuntimeOptional } from './runtime/context/RuntimeContext';
export { isCastSubscription } from './runtime/contracts/ICastSubscription';
export type { MetricVisibility } from './runtime/memory/MetricVisibility';
export { VISIBILITY_LABELS, VISIBILITY_ICONS, getMetricVisibility } from './runtime/memory/MetricVisibility';
export { SubscriptionManager } from './runtime/subscriptions/SubscriptionManager';
export { LocalRuntimeSubscription } from './runtime/subscriptions/LocalRuntimeSubscription';

export { PassthroughMetricDistributor } from './runtime/impl/PassthroughMetricDistributor';

export {
  CountdownTimerBehavior,
  CountupTimerBehavior,
  ExitBehavior,
  LabelingBehavior,
  SoundCueBehavior,
  ReportOutputBehavior,
  MetricPromotionBehavior,
  CompletionTimestampBehavior,
  ButtonBehavior,
  ChildSelectionBehavior,
  SpanTrackingBehavior,
  WaitingToStartInjectorBehavior,
} from './runtime/behaviors';

// ── Supplemental exports consumed by the app (restored during #970 cutover) ──
export { AGGREGATE_BUILTINS, CONTEXT_ATOMS, STREAM_ATOMS } from './core/analytics/calc/atoms';
export { UNITS } from './core/analytics/calc/units';
export { EFFORT_DATA_METRIC_TYPE } from './core/analytics/effortResolution';
export type { ProjectionResult } from './core/analytics/ProjectionResult';
export { TwoPassEffortResolutionProcess } from './core/analytics/TwoPassEffortResolutionProcess';
export type { IRealtimeProcessor } from './core/analytics/IRealtimeProcessor';
export type { ISummaryProcessor } from './core/analytics/ISummaryProcessor';
export type { IAnalyticsProfile, AnalyticsProfileContext } from './core/analytics/IAnalyticsProfile';
export type { IAnalyticsEngine } from './core/contracts/IAnalyticsEngine';
export type { ExerciseDataProvider, ExercisePathIndex } from './core/types/providers';
export type { ILookupTable } from './core/analytics/calc/lookup';
export type { MemoryTag, IMemoryLocation } from './runtime/memory/MemoryLocation';
export { MemoryTypeEnum } from './runtime/models/MemoryTypeEnum';
export type { IAnchorValue } from './runtime/contracts/IAnchorValue';
export type { CompletionDecision } from './runtime/contracts/IRuntimeBlock';
export type {
  BehaviorEventType,
  BehaviorEventListener,
  SubscribeOptions,
} from './runtime/contracts/IBehaviorContext';
export type {
  StackListener,
  StackObserver,
  StackEvent,
  Unsubscribe,
} from './runtime/contracts/IRuntimeStack';
export type { EventCallback, EventHandlerOptions } from './runtime/contracts/events/IEventBus';
export type { IRuntimeActionable } from './runtime/contracts/primitives/IRuntimeActionable';
export type { OutputListener } from './runtime/contracts/IScriptRuntime';
export type { ICastSubscription } from './runtime/contracts/ICastSubscription';
export { RuntimeBlock } from './runtime/RuntimeBlock';
export { BlockContext } from './runtime/BlockContext';
export type { MockClock } from './runtime/RuntimeClock';
export type { TimerState, RoundState } from './runtime/memory/MemoryTypes';
export { calculateElapsed } from './runtime/time/calculateElapsed';
export { getRuntimeNowMs } from './runtime/browserRuntimeNow';

export { SpanDuration } from './core/models/Duration';
export type { IAnalyticsProcessorDescriptor } from './core/analytics/IAnalyticsProcessorDescriptor';
export type { MetricFilter } from './core/contracts/IMetricSource';
export {
  METRIC_OWNERSHIP_LAYER_CHAIN,
  LEGACY_ORIGIN_TO_OWNERSHIP_LAYER,
  getMetricOwnershipLayer,
} from './core/metrics/ownership/types';
export type {
  MetricOwnershipLayer,
  MetricOwnershipPromotionCandidate,
  MetricOwnershipQuery,
  MetricOwnershipResolvedContribution,
  MetricOwnershipTypeExplanation,
} from './core/metrics/ownership/types';
export { OwnershipResolver } from './core/metrics/ownership/OwnershipResolver';

export {
  writeChoiceSelection,
  isChoiceResolved,
  collapseUnresolvedChoices,
} from './runtime/compiler/metrics/ChoiceResolution';

export {
  AmrapLogicStrategy,
  EffortFallbackStrategy,
  IntervalLogicStrategy,
  SessionRootStrategy,
  IdleBlockStrategy,
  SoundStrategy,
  ReportOutputStrategy,
  ChildrenStrategy,
  GenericTimerStrategy,
  GenericLoopStrategy,
  GenericGroupStrategy,
} from './runtime/compiler/strategies';

export { DurationMetric } from './runtime/compiler/metrics/DurationMetric';
export { ChoiceGroupMetric } from './runtime/compiler/metrics/ChoiceGroupMetric';
export { ResistanceMetric } from './runtime/compiler/metrics/ResistanceMetric';
export { RepMetric } from './runtime/compiler/metrics/RepMetric';
export { ElapsedMetric } from './runtime/compiler/metrics/ElapsedMetric';
export { DistanceMetric } from './runtime/compiler/metrics/DistanceMetric';
export { CurrentRoundMetric } from './runtime/compiler/metrics/CurrentRoundMetric';
export { EffortMetric } from './runtime/compiler/metrics/EffortMetric';
export { IncrementMetric } from './runtime/compiler/metrics/IncrementMetric';
export { MeasuredMetric } from './runtime/compiler/metrics/MeasuredMetric';
export { PropertyMetric } from './runtime/compiler/metrics/PropertyMetric';
export { RoundsMetric } from './runtime/compiler/metrics/RoundsMetric';
export { SoundMetric } from './runtime/compiler/metrics/SoundMetric';
export { SpansMetric } from './runtime/compiler/metrics/SpansMetric';
export { SystemTimeMetric } from './runtime/compiler/metrics/SystemTimeMetric';
export { TextMetric } from './runtime/compiler/metrics/TextMetric';
export { TotalMetric } from './runtime/compiler/metrics/TotalMetric';
export { GroupMetric } from './runtime/compiler/metrics/GroupMetric';
export { ActionMetric } from './runtime/compiler/metrics/ActionMetric';


export {
  type INowProvider,
  wallClockNow,
  frozenNow,
} from './runtime/INowProvider';

export {
  createAnalyticsEngineForBlock,
  type CreateAnalyticsEngineResult,
  type CreateAnalyticsEngineOptions,
} from './core/analytics/createAnalyticsEngineForBlock';

export { AnalyticsEngine } from './core/analytics/AnalyticsEngine';
export {
  StandardAnalyticsProfile,
  realtimeProcessorRegistry,
  summaryProcessorRegistry,
} from './core/analytics/StandardAnalyticsProfile';

export { buildWorkoutResults, countSegmentOutputs } from './app/editor/runtimeTimerModel';

export { getAnalyticsFromLogs } from './services/AnalyticsTransformer';
export { queryResultToGridRows } from './query/gridAdapter';


// ── 3. WQL (Pure): Grammar, Parser, Vocabulary, QueryService & Dashboard ──────
export {
  QueryService,
  parseQuery,
  isFindQuery,
  isRowsQuery,
} from './query';
export { parseWqlSuffixes, splitAtWhere } from './query/wqlSuffix';
export type { ParsedWqlSuffixes } from './query/wqlSuffix';


export { inMemoryFactStore } from './store';

export {
  wql,
  wqlLanguage,
  wqlCompletion,
} from './parser/wql-language';
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
} from './query';

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
} from './parser/wql-vocabulary';

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
} from './lib/dashboard/model';

export type {
  DashboardDocument,
  DashboardWidget,
  DashboardSectionInput,
  DashboardToken,
  DashboardWidgetType,
} from './lib/dashboard/model';


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
