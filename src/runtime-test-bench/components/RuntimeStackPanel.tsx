import React, { useCallback } from 'react';
import { RuntimeStackPanelProps } from '../types/interfaces';
import { panelBase, panelHeader, panelHeaderTitle, panelContent } from '../styles/tailwind-components';

/**
 * RuntimeStackPanel component - displays hierarchical runtime block execution
 * Shows workout structure with active/complete status, metrics, and highlighting
 */
export const RuntimeStackPanel: React.FC<RuntimeStackPanelProps> = ({
  blocks,
  activeBlockIndex,
  highlightedBlockKey,
  onBlockHover,
  onBlockClick,
  showMetrics = true,
  showIcons = true,
  expandAll = false,
  className = '',
  testId = 'runtime-stack-panel'
}) => {
  // Create a map for quick block lookup
  const blockMap = React.useMemo(() => {
    const map = new Map<string, typeof blocks[0]>();
    blocks.forEach(block => map.set(block.key, block));
    return map;
  }, [blocks]);

  // Get root blocks (those without parents)
  const rootBlocks = React.useMemo(() => {
    return blocks.filter(block => !block.parentKey);
  }, [blocks]);

  // Render a single block
  const renderBlock = useCallback((block: typeof blocks[0]) => {
    const isHighlighted = highlightedBlockKey === block.key;
    const isActive = activeBlockIndex !== undefined && blocks[activeBlockIndex]?.key === block.key;

    return (
      <div
        key={block.key}
        className={`
          flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
          ${isHighlighted ? 'bg-primary/20 border border-primary/50' : 'hover:bg-muted/50'}
          ${isActive ? 'ring-2 ring-primary' : ''}
        `}
        onMouseEnter={() => onBlockHover?.(block.key, block.lineNumber)}
        onMouseLeave={() => onBlockHover?.(undefined)}
        onClick={() => onBlockClick?.(block.key)}
        data-testid={`block-${block.key}`}
      >
        {/* Indentation */}
        <div
          className="flex-shrink-0"
          style={{ width: `${block.depth * 16}px` }}
        />

        {/* Status indicator */}
        <div
          className={`w-3 h-3 rounded-full flex-shrink-0 ${
            block.status === 'complete' ? 'bg-green-500' :
            block.status === 'active' || block.status === 'running' ? 'bg-primary' :
            'bg-gray-400'
          }`}
        />

        {/* Icon */}
        {showIcons && block.icon && (
          <span className="text-muted-foreground flex-shrink-0">
            {block.icon}
          </span>
        )}

        {/* Label */}
        <span className={`flex-1 text-foreground ${
          block.status === 'complete' ? 'line-through opacity-60' : ''
        }`}>
          {block.label}
        </span>

        {/* Metrics */}
        {showMetrics && block.metrics && Object.keys(block.metrics).length > 0 && (
          <div className="flex gap-1 text-xs text-muted-foreground">
            {Object.entries(block.metrics).slice(0, 2).map(([key, value]) => (
              <span key={key} className="bg-muted px-1 rounded">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}

        {/* Block type badge */}
        <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
          {block.blockType}
        </span>
      </div>
    );
  }, [blocks, activeBlockIndex, highlightedBlockKey, onBlockHover, onBlockClick, showIcons, showMetrics]);

  // Render block tree recursively
  const renderBlockTree = useCallback((blockKey: string): React.ReactNode => {
    const block = blockMap.get(blockKey);
    if (!block) return null;

    const children = block.children.map(childKey => renderBlockTree(childKey));

    return (
      <div key={blockKey}>
        {renderBlock(block)}
        {children.length > 0 && (
          <div className="ml-4 border-l border-border">
            {children}
          </div>
        )}
      </div>
    );
  }, [blockMap, renderBlock]);

  return (
    <div className={`${panelBase} ${className}`} data-testid={testId}>
      {/* Panel Header */}
      <div className={panelHeader}>
        <h3 className={panelHeaderTitle}>Runtime Stack</h3>
        {activeBlockIndex !== undefined && (
          <span className="text-xs px-2 py-1 bg-primary text-primary-foreground rounded">
            {blocks.length} blocks
          </span>
        )}
      </div>

      {/* Panel Content */}
      <div className={panelContent}>
        {blocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No runtime blocks to display
          </div>
        ) : (
          <div className="space-y-1">
            {rootBlocks.map(block => renderBlockTree(block.key))}
          </div>
        )}
      </div>
    </div>
  );
};