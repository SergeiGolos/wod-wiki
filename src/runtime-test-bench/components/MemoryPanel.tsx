import React, { useMemo, useState } from 'react';
import { MemoryPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent } from '../styles/tailwind-components';
import { MemoryValueDialog, MemoryValueCell, useMemoryValueDialog, MemoryValueData } from './MemoryValuePopover';

/**
 * MemoryPanel component - displays memory entries with filtering and grouping
 * Shows runtime memory allocations with owner, type, and value information
 */
export const MemoryPanel: React.FC<MemoryPanelProps> = ({
  entries,
  filterText = '',
  onFilterChange,
  groupBy,
  onGroupByChange,
  highlightedOwnerKey,
  highlightedMemoryId,
  onEntryHover,
  onEntryClick,
  showMetadata = false,
  expandValues = false,
  className = '',
  testId = 'memory-panel'
}) => {
  const [localFilterText, setLocalFilterText] = useState(filterText);
  
  // Single shared dialog for all memory values
  const { dialogData, isOpen, openDialog, closeDialog } = useMemoryValueDialog();

  // Update local filter when prop changes
  React.useEffect(() => {
    setLocalFilterText(filterText);
  }, [filterText]);

  // Handle filter input changes
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setLocalFilterText(newText);
    onFilterChange?.(newText);
  };

  // Filter entries based on search text
  const filteredEntries = useMemo(() => {
    if (!localFilterText.trim()) return entries;

    const searchTerm = localFilterText.toLowerCase();
    return entries.filter(entry =>
      entry.label.toLowerCase().includes(searchTerm) ||
      entry.ownerLabel?.toLowerCase().includes(searchTerm) ||
      entry.valueFormatted.toLowerCase().includes(searchTerm) ||
      entry.type.toLowerCase().includes(searchTerm)
    );
  }, [entries, localFilterText]);

  // Group entries based on groupBy setting
  const groupedEntries = useMemo(() => {
    if (groupBy === 'none') {
      return { 'All Entries': filteredEntries };
    }

    const groups: Record<string, typeof filteredEntries> = {};

    filteredEntries.forEach(entry => {
      let groupKey: string;

      switch (groupBy) {
        case 'owner':
          groupKey = entry.ownerLabel || entry.ownerId;
          break;
        case 'type':
          groupKey = entry.type;
          break;
        default:
          groupKey = 'Other';
      }

      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(entry);
    });

    return groups;
  }, [filteredEntries, groupBy]);

  // Render a single memory entry as a table row
  const renderEntryRow = (entry: typeof entries[0]) => {
    const isHighlighted = highlightedMemoryId === entry.id ||
                         highlightedOwnerKey === entry.ownerId;

    return (
      <tr
        key={entry.id}
        className={`
          cursor-pointer transition-colors border-b border-border/40 last:border-0
          ${isHighlighted ? 'bg-primary/10' : 'hover:bg-muted/30'}
          ${!entry.isValid ? 'opacity-60' : ''}
        `}
        onMouseEnter={() => onEntryHover?.(entry.id, entry.ownerId)}
        onMouseLeave={() => onEntryHover?.(undefined)}
        onClick={() => onEntryClick?.(entry.id)}
        data-testid={`memory-entry-${entry.id}`}
      >
        {/* Status */}
        <td className="px-3 py-2 w-8">
          <div
            className={`w-2 h-2 rounded-full ${
              entry.isValid ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
        </td>

        {/* Label */}
        <td className="px-3 py-2 font-medium text-foreground truncate max-w-[120px]" title={entry.label}>
          {entry.label}
        </td>

        {/* Type */}
        <td className="px-3 py-2 text-muted-foreground truncate max-w-[80px]" title={entry.type}>
          {entry.type}
        </td>

        {/* Owner */}
        <td className="px-3 py-2 text-muted-foreground truncate max-w-[100px]" title={entry.ownerLabel || entry.ownerId}>
          {entry.ownerLabel || entry.ownerId}
        </td>

        {/* Value - clickable to open dialog with details */}
        <td className="px-3 py-2">
          <MemoryValueCell
            data={{
              value: entry.value,
              displayValue: entry.valueFormatted,
              label: entry.label,
              type: entry.type,
              isValid: entry.isValid,
              ownerId: entry.ownerId,
              ownerLabel: entry.ownerLabel,
            }}
            onClick={openDialog}
          />
        </td>
      </tr>
    );
  };

  // Render a group of entries
  const renderGroup = (groupName: string, groupEntries: typeof entries) => (
    <React.Fragment key={groupName}>
      {groupBy !== 'none' && (
        <tr className="bg-muted/20">
          <td colSpan={5} className="px-3 py-1.5 text-xs font-semibold text-muted-foreground border-b border-border/40">
            {groupName} ({groupEntries.length})
          </td>
        </tr>
      )}
      {groupEntries.map(renderEntryRow)}
    </React.Fragment>
  );

  return (
    <div className={`${panelBase} ${className} border-0 shadow-none`} data-testid={testId}>
      {/* Panel Header */}
      <div className={`${panelHeader} py-2 min-h-0`}>
        <h3 className={`${panelHeaderTitle} text-sm`}>Memory</h3>
        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
          {filteredEntries.length} entries
        </span>
      </div>

      {/* Panel Content */}
      <div className={`${panelContent} p-0`}>
        {/* Controls */}
        <div className="flex gap-2 p-2 border-b border-border/40 bg-muted/10">
          {/* Filter input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter..."
              value={localFilterText}
              onChange={handleFilterChange}
              className="w-full px-2 py-1 text-xs bg-background border border-border rounded text-foreground placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
              data-testid="memory-filter-input"
            />
          </div>

          {/* Group by selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Group:</span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange?.(e.target.value as typeof groupBy)}
              className="px-2 py-1 text-xs bg-background border border-border rounded text-foreground focus:border-primary focus:outline-none"
              data-testid="memory-group-select"
            >
              <option value="none">None</option>
              <option value="owner">Owner</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="text-center text-muted-foreground py-4 text-xs">
              No memory entries
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead className="text-[10px] text-muted-foreground bg-muted/30 uppercase tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-1.5 font-medium w-8"></th>
                  <th className="px-3 py-1.5 font-medium">Label</th>
                  <th className="px-3 py-1.5 font-medium">Type</th>
                  <th className="px-3 py-1.5 font-medium">Owner</th>
                  <th className="px-3 py-1.5 font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {Object.entries(groupedEntries).map(([groupName, groupEntries]) =>
                  renderGroup(groupName, groupEntries)
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Single shared dialog for memory value details */}
      <MemoryValueDialog
        data={dialogData}
        isOpen={isOpen}
        onClose={closeDialog}
      />
    </div>
  );
};
