/**
 * PlanPanel - Unified Plan view with Monaco editor and collapsible workout overlay
 * 
 * This component combines the editor with an overlay panel for viewing workout
 * segments. The overlay can be toggled and shows workout details in collapsible
 * sections.
 * 
 * Desktop: Full-width editor with right-side overlay (1/3 width)
 * Mobile: Full-screen index view with collapsible sections (editor hidden)
 * 
 * Key Features:
 * - Click heading to collapse/expand workout details
 * - Partial overlay (right side) on desktop
 * - Full collapsible index on mobile
 * - Smooth transitions between states
 */

import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../markdown-editor/utils/documentStructure';
import { WodBlock } from '../../markdown-editor/types';
import { Timer, Hash, Play, X, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { CollapsibleSection } from './CollapsibleSection';
import { StatementDisplay } from '@/components/fragments/StatementDisplay';

export interface PlanPanelProps {
  /** Monaco editor panel (rendered by parent) */
  editorPanel: React.ReactNode;
  
  /** Document structure items */
  items: DocumentItem[];
  
  /** Currently active block ID (based on cursor position) */
  activeBlockId?: string;
  
  /** Currently expanded block IDs (multiple can be expanded) */
  expandedBlockIds?: Set<string>;
  
  /** Callback when a block is clicked (for navigation) */
  onBlockClick?: (item: DocumentItem) => void;
  
  /** Callback when expand/collapse changes */
  onExpandChange?: (blockId: string, expanded: boolean) => void;
  
  /** Callback when "Start Workout" is clicked */
  onStartWorkout?: (block: WodBlock) => void;

  /** Whether we're in mobile mode */
  isMobile?: boolean;
  
  /** Whether overlay is visible (desktop only) */
  overlayVisible?: boolean;
  
  /** Callback to toggle overlay visibility */
  onOverlayToggle?: (visible: boolean) => void;
  
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
 * Workout Segment Item - Shows a single workout segment with collapsible details
 */
const WorkoutSegmentItem: React.FC<{
  item: DocumentItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onStartWorkout?: (block: WodBlock) => void;
  mobile?: boolean;
}> = ({ item, isActive, isExpanded, onToggle, onStartWorkout, mobile }) => {
  const wodBlock = item.wodBlock;
  if (!wodBlock) return null;

  return (
    <CollapsibleSection
      title={
        <div className="flex items-center justify-between w-full">
          <span className="truncate">{getBlockPreview(item.content)}</span>
          {wodBlock.state && (
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
      }
      icon={<Timer className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />}
      expanded={isExpanded}
      onExpandedChange={onToggle}
      level={mobile ? 1 : 2}
      bordered={true}
      className={cn(
        'transition-all duration-200',
        isActive && 'ring-2 ring-primary',
        'bg-card'
      )}
    >
      {/* Statements List */}
      <div className="space-y-1">
        {wodBlock.statements && wodBlock.statements.length > 0 ? (
          wodBlock.statements.map((statement, index) => (
            <StatementDisplay
              key={index}
              statement={statement}
              compact={!mobile}
            />
          ))
        ) : (
          <div className="text-xs text-muted-foreground italic py-2">
            No statements parsed
          </div>
        )}
      </div>

      {/* Start Workout Button */}
      {onStartWorkout && wodBlock.state === 'parsed' && (
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onStartWorkout(wodBlock);
            }}
            className="w-full gap-2"
            size={mobile ? 'lg' : 'default'}
          >
            <Play className="h-4 w-4" />
            Start Workout
          </Button>
        </div>
      )}
    </CollapsibleSection>
  );
};

/**
 * Document Item - Shows headers and other document structure
 */
const DocumentItemView: React.FC<{
  item: DocumentItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onStartWorkout?: (block: WodBlock) => void;
  mobile?: boolean;
}> = ({ item, isActive, isExpanded, onToggle, onStartWorkout, mobile }) => {
  if (item.type === 'wod') {
    return (
      <WorkoutSegmentItem
        item={item}
        isActive={isActive}
        isExpanded={isExpanded}
        onToggle={onToggle}
        onStartWorkout={onStartWorkout}
        mobile={mobile}
      />
    );
  }

  // Header items
  if (item.type === 'header') {
    const level = item.level || 2;
    const headerClasses = {
      1: 'text-lg font-bold',
      2: 'text-base font-semibold',
      3: 'text-sm font-medium text-muted-foreground',
    };

    return (
      <div
        className={cn(
          'flex items-center gap-2 py-2 px-3',
          headerClasses[level as 1 | 2 | 3] || headerClasses[2],
          isActive && 'bg-primary/10 rounded-md'
        )}
      >
        <Hash className={mobile ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        <span className="truncate">{item.content}</span>
      </div>
    );
  }

  return null;
};

/**
 * Overlay Panel - Shows document structure with collapsible workouts
 */
const OverlayPanel: React.FC<{
  items: DocumentItem[];
  activeBlockId?: string;
  expandedBlockIds: Set<string>;
  onToggle: (blockId: string) => void;
  onStartWorkout?: (block: WodBlock) => void;
  onClose?: () => void;
  mobile?: boolean;
}> = ({ items, activeBlockId, expandedBlockIds, onToggle, onStartWorkout, onClose, mobile }) => {
  // Filter out paragraphs
  const filteredItems = items.filter(item => item.type !== 'paragraph');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between border-b border-border bg-muted/30 flex-shrink-0',
        mobile ? 'p-4' : 'p-3'
      )}>
        <h3 className={cn(
          'font-semibold text-foreground',
          mobile ? 'text-lg' : 'text-sm'
        )}>
          Workout Index
        </h3>
        {onClose && !mobile && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className={cn(
        'flex-1 overflow-y-auto space-y-2',
        mobile ? 'p-4' : 'p-2'
      )}>
        {filteredItems.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center italic">
            Empty document
          </div>
        ) : (
          filteredItems.map((item) => (
            <DocumentItemView
              key={item.id}
              item={item}
              isActive={item.id === activeBlockId}
              isExpanded={expandedBlockIds.has(item.id)}
              onToggle={() => onToggle(item.id)}
              onStartWorkout={onStartWorkout}
              mobile={mobile}
            />
          ))
        )}
      </div>
    </div>
  );
};

/**
 * PlanPanel Component
 */
export const PlanPanel: React.FC<PlanPanelProps> = ({
  editorPanel,
  items,
  activeBlockId,
  expandedBlockIds: controlledExpanded,
  onBlockClick,
  onExpandChange,
  onStartWorkout,
  isMobile = false,
  overlayVisible: controlledOverlayVisible,
  onOverlayToggle,
  className,
}) => {
  // Internal state for expanded blocks
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set());
  const [internalOverlayVisible, setInternalOverlayVisible] = useState(true);
  
  // Use controlled or uncontrolled states
  const expandedBlockIds = controlledExpanded ?? internalExpanded;
  const overlayVisible = controlledOverlayVisible ?? internalOverlayVisible;

  // Auto-expand active WOD block
  useEffect(() => {
    if (activeBlockId) {
      const activeItem = items.find(item => item.id === activeBlockId);
      if (activeItem?.type === 'wod' && !expandedBlockIds.has(activeBlockId)) {
        handleToggle(activeBlockId);
      }
    }
  }, [activeBlockId]);

  const handleToggle = (blockId: string) => {
    // Find the item for optional navigation callback
    const item = items.find(i => i.id === blockId);
    if (item) {
      onBlockClick?.(item);
    }
    
    if (onExpandChange) {
      onExpandChange(blockId, !expandedBlockIds.has(blockId));
    } else {
      setInternalExpanded(prev => {
        const next = new Set(prev);
        if (next.has(blockId)) {
          next.delete(blockId);
        } else {
          next.add(blockId);
        }
        return next;
      });
    }
  };

  const handleOverlayToggle = (visible: boolean) => {
    if (onOverlayToggle) {
      onOverlayToggle(visible);
    } else {
      setInternalOverlayVisible(visible);
    }
  };

  // Mobile: Full-screen overlay panel (editor hidden but still rendered for parsing)
  if (isMobile) {
    return (
      <div className={cn('h-full w-full relative', className)}>
        {/* Hidden editor for parsing to work */}
        <div className="absolute w-0 h-0 overflow-hidden" aria-hidden="true">
          {editorPanel}
        </div>
        
        {/* Full-screen overlay panel */}
        <OverlayPanel
          items={items}
          activeBlockId={activeBlockId}
          expandedBlockIds={expandedBlockIds}
          onToggle={handleToggle}
          onStartWorkout={onStartWorkout}
          mobile={true}
        />
      </div>
    );
  }

  // Desktop: Editor with side overlay
  return (
    <div className={cn('h-full w-full relative flex', className)}>
      {/* Monaco Editor - Takes full width or 2/3 when overlay visible */}
      <div className={cn(
        'h-full transition-all duration-300 ease-in-out overflow-hidden',
        overlayVisible ? 'w-2/3' : 'w-full'
      )}>
        {editorPanel}
      </div>

      {/* Overlay Toggle Button - Visible when overlay is hidden */}
      {!overlayVisible && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-2 top-2 z-10 gap-1"
          onClick={() => handleOverlayToggle(true)}
        >
          <ChevronLeft className="h-4 w-4" />
          Index
        </Button>
      )}

      {/* Overlay Panel - Right side */}
      <div className={cn(
        'h-full border-l border-border transition-all duration-300 ease-in-out overflow-hidden',
        overlayVisible ? 'w-1/3 opacity-100' : 'w-0 opacity-0'
      )}>
        {overlayVisible && (
          <OverlayPanel
            items={items}
            activeBlockId={activeBlockId}
            expandedBlockIds={expandedBlockIds}
            onToggle={handleToggle}
            onStartWorkout={onStartWorkout}
            onClose={() => handleOverlayToggle(false)}
          />
        )}
      </div>
    </div>
  );
};

export default PlanPanel;
