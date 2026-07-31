export { WqlComposer, type WqlComposerProps, type WqlValidationState } from './WqlComposer'
export { TokenSlotPill, ClausePopover, CustomSlotPopover, AddFilterDropdown, type TokenSlotPillProps } from './QueryPalette'
export {
  ComposerRegistry,
  composerRegistry,
  useComposerSlots,
  type CustomSlotDefinition,
  type CustomSlotEditorProps,
} from './ComposerRegistry'
export { dateRangeSlot, type DateRange } from './dateRangeSlot'
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
} from './suggestionSources'
export { useSuggestions, type ClauseSuggestions } from './useSuggestions'
export { diagnoseClauses, summarizeFind, type WqlDiagnostics, type WqlFindSummary } from './diagnostics'
export { WqlDiagnosticsStrip, type WqlDiagnosticsStripProps } from './WqlDiagnosticsStrip'
export {
  useWqlStageCounts,
  DEFAULT_DIAGNOSTICS_DEBOUNCE_MS,
  type FindExecutor,
  type WqlStageCounts,
} from './useWqlStageCounts'
export {
  type ClauseType,
  type ClauseMeta,
  type QueryClause,
  CLAUSE_META,
  TARGET_OPTIONS,
  SCOPE_OPTIONS,
  TIME_OPTIONS,
  WHERE_AGGREGATORS,
  WHERE_METRICS,
  WHERE_OPERATORS,
  getClauseMeta,
  clauseToWql,
  clausesToWql,
  defaultClauses,
} from './queryClauses'
