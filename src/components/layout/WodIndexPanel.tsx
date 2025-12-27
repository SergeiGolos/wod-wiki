import React, { useRef } from 'react';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { Timer, Hash } from 'lucide-react';

export interface WodIndexPanelProps {
  /** Document structure items */
  items: DocumentItem[];
  
  /** Currently active block ID (based on cursor position) */
  activeBlockId?: string;
  
  /** Highlighted block ID (from hover) */
  highlightedBlockId?: string | null;
  
  /** Callback when a block is clicked */
  onBlockClick: (item: DocumentItem) => void;
  
  /** Callback when a block is hovered */
  onBlockHover: (blockId: string | null) => void;

  /** Whether to render in mobile mode */
  mobile?: boolean;
}

/**
 * Extracts a preview title from WOD block content
 */
const getBlockPreview = (content: string): string => {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return 'Empty WOD';
  
  // Look for Timer: or first non-empty line
  const firstLine = lines.find(line => line.trim().length > 0);
  if (!firstLine) return 'Empty WOD';
  
  // Truncate long lines
  const preview = firstLine.trim();
  return preview.length > 40 ? preview.substring(0, 40) + '...' : preview;
};

/**
 * WodIndexPanel - Unified "Index" view
 */
export const WodIndexPanel: React.FC<WodIndexPanelProps> = ({
  items,
  activeBlockId,
  highlightedBlockId,
  onBlockClick,
  onBlockHover,
  mobile = false
}) => {
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter out paragraphs as requested
  const filteredItems = items.filter(item => item.type !== 'paragraph');

  return (
    <div className={`h-full bg-background flex flex-col overflow-hidden ${mobile ? '' : 'border-l border-border'}`}>
      {/* Header */}
      <div className={`border-b border-border flex-shrink-0 bg-muted/30 ${mobile ? 'p-6' : 'p-4'}`}>
        <h3 className={`${mobile ? 'text-lg' : 'text-sm'} font-semibold text-foreground`}>Index</h3>
      </div>

      {/* Document Items List */}
      <div className={`flex-1 overflow-y-auto space-y-1 ${mobile ? 'p-4' : 'p-2'}`}>
        {filteredItems.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center italic">
            Empty document
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === activeBlockId;
            const isHighlighted = item.id === highlightedBlockId;
            const isWod = item.type === 'wod';

            return (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className={`
                  rounded-md transition-all duration-200
                  ${isActive ? 'ring-1 ring-primary' : ''}
                  ${isHighlighted && !isActive ? 'bg-muted/50' : ''}
                  ${isWod ? 'border border-border bg-card' : 'hover:bg-muted/30'}
                `}
                onClick={() => onBlockClick(item)}
                onMouseEnter={() => onBlockHover(item.id)}
                onMouseLeave={() => onBlockHover(null)}
              >
                {/* Item Header / Summary */}
                <div className={`
                  flex items-center gap-2 cursor-pointer
                  ${mobile ? 'p-4' : 'p-2'}
                  ${isWod ? (mobile ? 'min-h-[60px]' : 'min-h-[40px]') : 'min-h-[28px]'}
                `}>
                  {/* Icon based on type */}
                  <div className="flex-shrink-0 text-muted-foreground">
                    {item.type === 'header' && <Hash className={`${mobile ? 'h-5 w-5' : 'h-3.5 w-3.5'}`} />}
                    {item.type === 'wod' && <Timer className={`${mobile ? 'h-5 w-5' : 'h-3.5 w-3.5'}`} />}
                  </div>

                  {/* Content Preview */}
                  <div className="flex-1 min-w-0">
                    {item.type === 'header' && (
                      <div className={`font-medium truncate ${
                        item.level === 1 ? (mobile ? 'text-base' : 'text-sm') : (mobile ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground')
                      }`}>
                        {item.content}
                      </div>
                    )}

                    {item.type === 'wod' && (
                      <div className="flex items-center justify-between">
                        <span className={`${mobile ? 'text-base' : 'text-sm'} font-medium truncate`}>
                          {getBlockPreview(item.content)}
                        </span>
                        {item.wodBlock?.state && (
                          <span className={`
                            text-[10px] px-1.5 py-0.5 rounded-full ml-2
                            ${item.wodBlock.state === 'parsed' 
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                              : 'bg-muted text-muted-foreground'}
                          `}>
                            {item.wodBlock.state}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
