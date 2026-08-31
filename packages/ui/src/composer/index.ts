export { WqlComposer, type WqlComposerProps, type WqlValidationState } from './WqlComposer';
export {
  TokenSlotPill,
  ClausePopover,
  CustomSlotPopover,
  AddFilterDropdown,
  AddCalcDropdown,
  MULTI_VALUE_TYPES,
  type TokenSlotPillProps,
} from './QueryPalette';
export {
  ComposerRegistry,
  composerRegistry,
  useComposerSlots,
  type CustomSlotDefinition,
  type CustomSlotEditorProps,
} from './ComposerRegistry';
export { dateRangeSlot, type DateRange } from './dateRangeSlot';
export {
  SUGGESTION_BINDINGS,
  blockTypesFromBlocks,
  catalogIdsFromBlocks,
  getSuggestionBinding,
  invalidateSuggestions,
  loadSuggestions,
  mergeTagSuggestions,
  setSuggestionBinding,
  tagsFromStaticBlocks,
  type SuggestionBinding,
  type SuggestionCachePolicy,
  type SuggestionItem,
} from './suggestionSources';
export { useSuggestions, type ClauseSuggestions } from './useSuggestions';
export {
  summarizeAggregate,
  summarizeFind,
  type WqlAggregateSummary,
  type WqlDiagnostics,
  type WqlFindSummary,
} from './diagnostics';
export { WqlDiagnosticsStrip, type WqlDiagnosticsStripProps } from './WqlDiagnosticsStrip';
export {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type WqlExecutor,
  type WqlStageCounts,
} from './useWqlStageCounts';
// Pill vocabulary — types and option lists for hosts rendering custom slot
// editors and menus. The clause compiler/restore are retired (ticket 013):
// composer state is the AST; strings go through the engine serializer.
export {
  type ClauseType,
  type ClauseMeta,
  type QueryClause,
  CONTENT_SOURCES,
  SOURCE_OPTIONS,
  TIME_OPTIONS,
  AGG_OPTIONS,
  ROLLUP_OPTIONS,
  GROUPBY_OPTIONS,
  METRIC_OPTIONS,
  UNIT_OPTIONS,
  WHERE_AGGREGATORS,
  WHERE_METRICS,
  sourcePlane,
} from './queryClauses';
export { wqlToPills, pillsToWql } from './queryAst';
