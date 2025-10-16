import React, { useMemo, useState } from 'react';
import { MemoryPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent } from '../styles/tailwind-components';

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

  // Render a single memory entry
  const renderEntry = (entry: typeof entries[0]) => {
    const isHighlighted = highlightedMemoryId === entry.id ||
                         highlightedOwnerKey === entry.ownerId;

    return (
      <div
        key={entry.id}
        className={`
          flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors
          ${isHighlighted ? 'bg-primary/20 border-primary' : 'bg-card border-border hover:border-primary/50'}
          ${!entry.isValid ? 'opacity-60' : ''}
        `}
        onMouseEnter={() => onEntryHover?.(entry.id, entry.ownerId)}
        onMouseLeave={() => onEntryHover?.(undefined)}
        onClick={() => onEntryClick?.(entry.id)}
        data-testid={`memory-entry-${entry.id}`}
      >
        {/* Status indicator */}
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            entry.isValid ? 'bg-green-500' : 'bg-red-500'
          }`}
        />

        {/* Icon */}
        {entry.icon && (
          <span className="text-muted-foreground flex-shrink-0">
            {entry.icon}
          </span>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-foreground truncate">
              {entry.label}
            </span>
            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
              {entry.type}
            </span>
          </div>

          <div className="text-sm text-muted-foreground mb-1">
            Owner: {entry.ownerLabel || entry.ownerId}
          </div>

          <div className={`text-sm font-mono ${
            expandValues ? 'whitespace-pre-wrap' : 'truncate'
          }`}>
            {entry.valueFormatted}
          </div>

          {/* Metadata */}
          {showMetadata && entry.metadata && (
            <div className="text-xs text-muted-foreground/80 mt-2 space-y-1">
              {entry.metadata.createdAt && (
                <div>Created: {new Date(entry.metadata.createdAt).toLocaleString()}</div>
              )}
              {entry.metadata.lastModified && (
                <div>Modified: {new Date(entry.metadata.lastModified).toLocaleString()}</div>
              )}
              {entry.metadata.accessCount !== undefined && (
                <div>Access count: {entry.metadata.accessCount}</div>
              )}
            </div>
          )}

          {/* References */}
          {(entry.references?.length || entry.referencedBy?.length) && (
            <div className="text-xs text-muted-foreground/80 mt-2">
              {entry.references?.length && (
                <div>References: {entry.references.length} items</div>
              )}
              {entry.referencedBy?.length && (
                <div>Referenced by: {entry.referencedBy.length} items</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render a group of entries
  const renderGroup = (groupName: string, groupEntries: typeof entries) => (
    <div key={groupName} className="mb-6">
      <h4 className="text-foreground font-medium mb-3 pb-2 border-b border-border">
        {groupName} ({groupEntries.length})
      </h4>
      <div className="space-y-2">
        {groupEntries.map(renderEntry)}
      </div>
    </div>
  );

  return (
    <div className={`${panelBase} ${className}`} data-testid={testId}>
      {/* Panel Header */}
      <div className={panelHeader}>
        <h3 className={panelHeaderTitle}>Memory</h3>
        <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
          {filteredEntries.length} entries
        </span>
      </div>

      {/* Panel Content */}
      <div className={panelContent}>
        {/* Controls */}
        <div className="flex gap-4 mb-4">
          {/* Filter input */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter memory entries..."
              value={localFilterText}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 bg-card border border-border rounded text-foreground placeholder-muted-foreground/50 focus:border-primary focus:outline-none"
              data-testid="memory-filter-input"
            />
          </div>

          {/* Group by selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange?.(e.target.value as typeof groupBy)}
              className="px-3 py-2 bg-card border border-border rounded text-foreground focus:border-primary focus:outline-none"
              data-testid="memory-group-select"
            >
              <option value="none">None</option>
              <option value="owner">Owner</option>
              <option value="type">Type</option>
            </select>
          </div>
        </div>

        {/* Entries */}
        {Object.keys(groupedEntries).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No memory entries to display
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedEntries).map(([groupName, groupEntries]) =>
              renderGroup(groupName, groupEntries)
            )}
          </div>
        )}
      </div>
    </div>
  );
};