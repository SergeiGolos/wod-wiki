/**
 * EditorIndexPanel - Unified document index with expandable WOD blocks
 * 
 * This panel merges the functionality of WodIndexPanel and WorkoutContextPanel
 * into a single expandable interface. Clicking a WOD block expands it in-place
 * to show details and a "Start Workout" button.
 * 
 * Key Features:
 * - Document structure browsing
 * - In-place expand/collapse for WOD blocks
 * - "Start Workout" button in expanded view
 * - Only one block can be expanded at a time
 * - Uses unified FragmentVisualizer for consistent statement display
 */

import React, { useState, useRef, useEffect } from 'react';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { WodBlock } from '../../markdown-editor/types';
import { Timer, Hash, ChevronDown, ChevronRight, Play, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';

export interface EditorIndexPanelProps {
  /** Document structure items */
  items: DocumentItem[];
  
  /** Currently active block ID (based on cursor position) */
  activeBlockId?: string;
  
  /** Currently expanded block ID */
  expandedBlockId?: string | null;
  
  /** Callback when a block is clicked (for navigation) */
  onBlockClick?: (item: DocumentItem) => void;
  
  /** Callback when expand/collapse changes */
  onExpandChange?: (blockId: string | null) => void;
  
  /** Callback when "Start Workout" is clicked */
  onStartWorkout?: (block: WodBlock) => void;
  
  /** Callback to edit a statement */
  onEditStatement?: (blockId: string, index: number, text: string) => void;
  
  /** Callback to delete a statement */
  onDeleteStatement?: (blockId: string, index: number) => void;

  /** Whether to render in mobile mode */
  mobile?: boolean;
  
  /** Additional CSS classes */
  className?: string;
}

/**
 * Extracts a preview title from WOD block content
 */
const getBlockPreview = (content: string): string => {
  const lines = content.trim().split('\n');
  if (lines.length === 0) return 'Empty WOD';
  
  const firstLine = lines.find(line => line.trim().length > 0);
  if (!firstLine) return 'Empty WOD';
  
  const preview = firstLine.trim();
  return preview.length > 40 ? preview.substring(0, 40) + '...' : preview;
};

/**
 * EditorIndexPanel Component
 */
export const EditorIndexPanel: React.FC<EditorIndexPanelProps> = ({
  items,
  activeBlockId,
  expandedBlockId: controlledExpandedId,
  onBlockClick,
  onExpandChange,
  onStartWorkout,
  onEditStatement,
  onDeleteStatement,
  mobile = false,
  className,
}) => {
  // Internal state for uncontrolled mode
  const [internalExpandedId, setInternalExpandedId] = useState<string | null>(null);
  
  // Use controlled or uncontrolled expansion
  const expandedBlockId = controlledExpandedId !== undefined ? controlledExpandedId : internalExpandedId;
  
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Filter out paragraphs
  const filteredItems = items.filter(item => item.type !== 'paragraph');

  // Handle block click - toggle expansion for WOD blocks
  const handleBlockClick = (item: DocumentItem) => {
    if (item.type === 'wod') {
      const newExpandedId = expandedBlockId === item.id ? null : item.id;
      
      if (onExpandChange) {
        onExpandChange(newExpandedId);
      } else {
        setInternalExpandedId(newExpandedId);
      }
    }
    
    // Also trigger navigation callback
    onBlockClick?.(item);
  };

  // Handle start workout
  const handleStartWorkout = (item: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.wodBlock) {
      onStartWorkout?.(item.wodBlock);
    }
  };

  // Scroll expanded block into view
  useEffect(() => {
    if (expandedBlockId && itemRefs.current[expandedBlockId]) {
      itemRefs.current[expandedBlockId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [expandedBlockId]);

  return (
    <div className={cn(
      'h-full bg-background flex flex-col overflow-hidden',
      !mobile && 'border-l border-border',
      className
    )}>
      {/* Header */}
      <div className={cn(
        'border-b border-border flex-shrink-0 bg-muted/30',
        mobile ? 'p-6' : 'p-4'
      )}>
        <h3 className={cn(
          'font-semibold text-foreground',
          mobile ? 'text-lg' : 'text-sm'
        )}>
          Index
        </h3>
      </div>

      {/* Document Items List */}
      <div className={cn(
        'flex-1 overflow-y-auto space-y-1',
        mobile ? 'p-4' : 'p-2'
      )}>
        {filteredItems.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center italic">
            Empty document
          </div>
        ) : (
          filteredItems.map((item) => {
            const isActive = item.id === activeBlockId;
            const isExpanded = item.id === expandedBlockId;
            const isWod = item.type === 'wod';
            const wodBlock = item.wodBlock;

            return (
              <div
                key={item.id}
                ref={(el) => { itemRefs.current[item.id] = el; }}
                className={cn(
                  'rounded-md transition-all duration-200',
                  isActive && 'ring-1 ring-primary',
                  isWod ? 'border border-border bg-card' : 'hover:bg-muted/30',
                )}
              >
                {/* Item Header / Summary */}
                <div
                  className={cn(
                    'flex items-center gap-2 cursor-pointer',
                    mobile ? 'p-4' : 'p-2',
                    isWod ? (mobile ? 'min-h-[60px]' : 'min-h-[40px]') : 'min-h-[28px]',
                  )}
                  onClick={() => handleBlockClick(item)}
                >
                  {/* Expand/Collapse Icon for WOD blocks */}
                  {isWod && (
                    <div className="flex-shrink-0 text-muted-foreground">
                      {isExpanded ? (
                        <ChevronDown className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
                      ) : (
                        <ChevronRight className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
                      )}
                    </div>
                  )}

                  {/* Type Icon */}
                  <div className="flex-shrink-0 text-muted-foreground">
                    {item.type === 'header' && <Hash className={mobile ? 'h-5 w-5' : 'h-3.5 w-3.5'} />}
                    {item.type === 'wod' && <Timer className={mobile ? 'h-5 w-5' : 'h-3.5 w-3.5'} />}
                  </div>

                  {/* Content Preview */}
                  <div className="flex-1 min-w-0">
                    {item.type === 'header' && (
                      <div className={cn(
                        'font-medium truncate',
                        item.level === 1
                          ? (mobile ? 'text-base' : 'text-sm')
                          : (mobile ? 'text-sm text-muted-foreground' : 'text-xs text-muted-foreground')
                      )}>
                        {item.content}
                      </div>
                    )}

                    {item.type === 'wod' && (
                      <div className="flex items-center justify-between">
                        <span className={cn('font-medium truncate', mobile ? 'text-base' : 'text-sm')}>
                          {getBlockPreview(item.content)}
                        </span>
                        {wodBlock?.state && (
                          <span className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded-full ml-2',
                            wodBlock.state === 'parsed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          )}>
                            {wodBlock.state}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Content for WOD blocks */}
                {isWod && isExpanded && wodBlock && (
                  <div className="border-t border-border">
                    {/* Statements List */}
                    <div className={cn('space-y-1', mobile ? 'p-4' : 'p-3')}>
                      {wodBlock.statements && wodBlock.statements.length > 0 ? (
                        wodBlock.statements.map((statement, index) => {
                          // Extract text from fragments for edit callback
                          const text = statement.fragments
                            ?.map((f: any) => f.image)
                            .join('') || `Statement ${index + 1}`;

                          const editActions = (onEditStatement || onDeleteStatement) ? (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {onEditStatement && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEditStatement(item.id, index, text);
                                  }}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              )}
                              {onDeleteStatement && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteStatement(item.id, index);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ) : undefined;

                          return (
                            <div key={index} className="group">
                              <StatementDisplay
                                statement={statement}
                                compact={!mobile}
                                actions={editActions}
                              />
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground italic p-2">
                          No statements parsed
                        </div>
                      )}
                    </div>

                    {/* Start Workout Button */}
                    {onStartWorkout && wodBlock.state === 'parsed' && (
                      <div className={cn('border-t border-border', mobile ? 'p-4' : 'p-3')}>
                        <Button
                          onClick={(e) => handleStartWorkout(item, e)}
                          className="w-full gap-2"
                          size={mobile ? 'lg' : 'default'}
                        >
                          <Play className="h-4 w-4" />
                          Start Workout
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EditorIndexPanel;
