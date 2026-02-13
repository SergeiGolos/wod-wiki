import React, { useRef, useEffect, useMemo } from 'react';
import { DocumentItem, parseDocumentStructure } from '../../markdown-editor/utils/documentStructure';
import { detectWodBlocks } from '../../markdown-editor/utils/blockDetection';
import { Hash, Play } from 'lucide-react';
import { usePanelSize } from '../layout/panel-system/PanelSizeContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HistoryEntry } from '@/types/history';

export interface NotePreviewProps {
    /** The workout entry to preview */
    entry?: HistoryEntry;

    /** Manual document structure items (optional fallback/override) */
    items?: DocumentItem[];

    /** Currently active block ID (for sync) */
    activeBlockId?: string;

    /** Highlighted block ID (from hover) */
    highlightedBlockId?: string | null;

    /** Callback when a block is clicked */
    onBlockClick?: (item: DocumentItem) => void;

    /** Callback when a block is hovered */
    onBlockHover?: (blockId: string | null) => void;

    /** Action to start a specific workout block */
    onStartWorkout?: (blockId: string) => void;

    /** Title of the note (optional - defaults to entry.title) */
    title?: string;

    /** Whether to auto-scroll to the active block */
    autoScroll?: boolean;
}

const getBlockPreview = (content: string): string => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return 'Empty WOD';
    const firstLine = lines.find(line => line.trim().length > 0);
    if (!firstLine) return 'Empty WOD';
    const preview = firstLine.trim();
    return preview.length > 40 ? preview.substring(0, 40) + '...' : preview;
};

export const NotePreview: React.FC<NotePreviewProps> = ({
    entry,
    items: propItems,
    activeBlockId,
    highlightedBlockId,
    onBlockClick,
    onBlockHover,
    onStartWorkout,
    title,
    autoScroll = true
}) => {
    const { isCompact: mobile } = usePanelSize();
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Derive document structure if entry is provided
    const items = useMemo(() => {
        if (propItems) return propItems;
        if (!entry) return [];
        const content = entry.rawContent;
        const blocks = detectWodBlocks(content);
        return parseDocumentStructure(content, blocks);
    }, [entry, propItems]);

    // Filter out paragraphs to keep it clean like an index
    const filteredItems = items.filter(item => item.type !== 'paragraph');

    // Scroll to active block
    useEffect(() => {
        if (autoScroll && activeBlockId && itemRefs.current[activeBlockId]) {
            itemRefs.current[activeBlockId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [activeBlockId, autoScroll]);

    const handleItemClick = (item: DocumentItem) => {
        onBlockClick?.(item);
    };

    const handleStartClick = (e: React.MouseEvent, blockId: string) => {
        e.stopPropagation();
        onStartWorkout?.(blockId);
    };

    const displayTitle = title || entry?.title || 'Preview';

    return (
        <div className={cn("h-full bg-background flex flex-col overflow-hidden", !mobile && "border-l border-border")}>
            {/* Header */}
            <div className={cn("border-b border-border flex-shrink-0 bg-muted/30 flex justify-between items-center", mobile ? "p-4" : "p-3")}>
                <h3 className="font-semibold text-foreground truncate">{displayTitle}</h3>
            </div>

            {/* Document Items List */}
            <div className={cn("flex-1 overflow-y-auto space-y-1", mobile ? "p-4" : "p-2")}>
                {filteredItems.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center italic">
                        {!entry && items.length === 0 ? "No workout selected" : "Empty document"}
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
                                className={cn(
                                    "rounded-md transition-all duration-200 cursor-pointer border-l-2 group",
                                    isActive
                                        ? "bg-accent/10 border-primary text-foreground ring-1 ring-primary/20"
                                        : "border-transparent text-muted-foreground hover:bg-accent/5 hover:text-foreground",
                                    isHighlighted && !isActive ? "bg-muted/50" : "",
                                    isWod ? "bg-card relative" : ""
                                )}
                                onClick={() => handleItemClick(item)}
                                onMouseEnter={() => onBlockHover?.(item.id)}
                                onMouseLeave={() => onBlockHover?.(null)}
                            >
                                <div className={cn(
                                    "flex items-center gap-2",
                                    mobile ? "p-3" : "p-2",
                                    isWod ? "min-h-[40px]" : "min-h-[28px]"
                                )}>
                                    <div className="flex-shrink-0 text-muted-foreground opacity-70">
                                        {item.type === 'header' && <Hash className="h-3.5 w-3.5" />}
                                        {item.type === 'wod' && <Hash className="h-4 w-4" />}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        {item.type === 'header' && (
                                            <div className={cn(
                                                "font-medium truncate",
                                                item.level === 1 ? "text-sm" : "text-xs text-muted-foreground"
                                            )}>
                                                {item.content}
                                            </div>
                                        )}

                                        {item.type === 'wod' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium truncate">
                                                    {getBlockPreview(item.content)}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {isWod && onStartWorkout && (
                                        <div className="pl-2">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary hover:text-primary-foreground"
                                                onClick={(e) => handleStartClick(e, item.id)}
                                                title="Run this workout"
                                            >
                                                <Play className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

