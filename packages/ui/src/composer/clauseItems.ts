/**
 * clauseItems — shared option resolution for clause value editors (the
 * composer's inline editor and the standalone ClausePopover). Static vocab
 * (queryClauses) wins unless a suggestion binding is registered; multi-value
 * clauses keep selected values in the list (toggle semantics) while the
 * popover drops them.
 */
import {
  STATIC_OPTIONS,
  MULTI_VALUE_TYPES,
} from './clauseVocab';
import { useSuggestions } from './useSuggestions';
import type { QueryClause } from './queryClauses';

export interface ClauseItemsResult {
  isMulti: boolean;
  selectedValues: string[];
  /** All options (selected included). */
  items: { value: string; label: string }[];
  /** Options after the typed filter (static closed lists ignore the filter). */
  filteredItems: { value: string; label: string }[];
  /** The typed filter text, trimmed — a verbatim value when the slot is open. */
  typedValue: string;
  canCommitTyped: boolean;
  loading: boolean;
  /** True when the slot accepts typed values not present in the list (#831). */
  openSlot: boolean;
  /** True for suggestion-backed/freetext slots (typed text filters the list). */
  hasFilterInput: boolean;
  /** Empty-state copy for the current filter; null when the list has rows. */
  emptyText: string | null;
}

export function useClauseItems(
  clause: QueryClause | undefined,
  filterQuery: string,
  options?: { dropSelected?: boolean },
): ClauseItemsResult {
  const type = clause?.type ?? '';
  const { items: dynamicItems, loading, binding } = useSuggestions(type);
  const staticItems = STATIC_OPTIONS[type];
  const isMulti = type in MULTI_VALUE_TYPES;
  const selectedValues =
    isMulti && clause?.value
      ? clause.value.split('|').map((v) => v.trim()).filter(Boolean)
      : [];

  // A suggestion binding wins when registered; otherwise static vocab.
  const items: { value: string; label: string }[] = binding
    ? dynamicItems.map((s) => ({ value: s.value, label: s.label ?? s.value }))
    : (staticItems ?? dynamicItems.map((s) => ({ value: s.value, label: s.label ?? s.value })));

  // Free-text filter input: hidden for closed static selects (Up/Down cycles
  // the full list), shown for metric/unit (typed values also accepted) and
  // freetext/suggestion slots so typed values filter or enter verbatim.
  const hasFilterInput = !staticItems || type === 'metric' || type === 'unit';

  const listItems = isMulti && options?.dropSelected
    ? items.filter((item) => !selectedValues.includes(item.value))
    : items;

  const query = hasFilterInput ? filterQuery : '';
  const filteredItems = hasFilterInput
    ? listItems.filter(
        (item) =>
          item.value.toLowerCase().includes(query.toLowerCase()) ||
          item.label.toLowerCase().includes(query.toLowerCase()),
      )
    : listItems;

  // Visible commit affordance for typed free text (#854).
  const typedValue = query.trim();
  const canCommitTyped =
    hasFilterInput &&
    typedValue.length > 0 &&
    (binding?.open ?? true) &&
    !selectedValues.some((v) => v.toLowerCase() === typedValue.toLowerCase()) &&
    !filteredItems.some((item) => item.value.toLowerCase() === typedValue.toLowerCase());

  let emptyText: string | null = null;
  if (filteredItems.length === 0 && !canCommitTyped) {
    if (loading) emptyText = 'Loading…';
    else if (listItems.length === 0) emptyText = binding?.emptyText ?? 'Nothing here yet';
    else if (!query.trim()) emptyText = 'No options';
    else emptyText = (binding?.open ?? true)
      ? 'No matches — press Enter to use the typed value'
      : 'No matches — no such option';
  }

  return {
    isMulti,
    selectedValues,
    items,
    filteredItems,
    typedValue,
    canCommitTyped,
    loading,
    openSlot: binding?.open ?? true,
    hasFilterInput,
    emptyText,
  };
}
