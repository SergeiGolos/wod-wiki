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
          flex items-center gap-2 py-1 px-2 border-b border-border/40 cursor-pointer transition-colors text-sm
          ${isHighlighted ? 'bg-primary/10' : 'hover:bg-muted/30'}
          ${isActive ? 'bg-muted/50 font-medium' : ''}
        `}
        onMouseEnter={() => onBlockHover?.(block.key, block.lineNumber)}
        onMouseLeave={() => onBlockHover?.(undefined)}
        onClick={() => onBlockClick?.(block.key)}
        data-testid={`block-${block.key}`}
      >
        {/* Indentation */}
        <div
          className="flex-shrink-0 border-l border-border/30 h-4 mr-1"
          style={{ width: `${block.depth * 12}px`, borderColor: block.depth > 0 ? 'currentColor' : 'transparent' }}
        />

        {/* Status indicator */}
        <div
          className={`w-2 h-2 rounded-full flex-shrink-0 ${
            block.status === 'complete' ? 'bg-green-500' :
            block.status === 'active' || block.status === 'running' ? 'bg-primary' :
            'bg-gray-400'
          }`}
        />

        {/* Icon */}
        {showIcons && block.icon && (
          <span className="text-muted-foreground flex-shrink-0 scale-75">
            {block.icon}
          </span>
        )}

        {/* Label */}
        <span className={`flex-1 truncate ${
          block.status === 'complete' ? 'line-through opacity-60' : ''
        }`}>
          {block.label}
        </span>

        {/* Metrics */}
        {showMetrics && block.metrics && Object.keys(block.metrics).length > 0 && (
          <div className="flex gap-1 text-[10px] text-muted-foreground">
            {Object.entries(block.metrics).slice(0, 2).map(([key, value]) => (
              <span key={key} className="bg-muted px-1 rounded-sm">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        )}

        {/* Block type badge */}
        <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground opacity-70">
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
      <div key={blockKey} className="flex flex-col">
        {renderBlock(block)}
        {children}
      </div>
    );
  }, [blockMap, renderBlock]);

  return (
    <div className={`${panelBase} ${className} border-0 shadow-none`} data-testid={testId}>
      {/* Panel Header */}
      <div className={`${panelHeader} py-2 min-h-0`}>
        <h3 className={`${panelHeaderTitle} text-sm`}>Runtime Stack</h3>
        {activeBlockIndex !== undefined && (
          <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">
            {blocks.length} blocks
          </span>
        )}
      </div>

      {/* Panel Content */}
      <div className={`${panelContent} p-0`}>
        {blocks.length === 0 ? (
          <div className="text-center text-muted-foreground py-4 text-xs">
            No runtime blocks
          </div>
        ) : (
          <div className="flex flex-col">
            {rootBlocks.map(block => renderBlockTree(block.key))}
          </div>
        )}
      </div>
    </div>
  );
};
