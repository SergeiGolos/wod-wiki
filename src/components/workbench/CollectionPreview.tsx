/**
 * CollectionPreview — Preview of a selected WOD collection item.
 * Shows the raw markdown content using SectionEditor.
 */
import React from 'react';
import { Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePanelSize } from '@/components/layout/panel-system/PanelSizeContext';
import { SectionEditor } from '@/markdown-editor/SectionEditor';
import type { WodCollectionItem } from '@/app/wod-collections';

export interface CollectionPreviewProps {
    item: WodCollectionItem;
    collectionName?: string;
    onStartWorkout?: (blockId: string) => void;
}

export const CollectionPreview: React.FC<CollectionPreviewProps> = ({
    item,
    collectionName,
    onStartWorkout,
}) => {
    const { isCompact: mobile } = usePanelSize();

    return (
        <div className={cn("h-full bg-background flex flex-col overflow-hidden", !mobile && "border-l border-border")}>
            <div className={cn("flex-1 flex flex-col gap-4 overflow-hidden", mobile ? "p-4" : "p-6")}>
                {/* Header */}
                <div className="flex items-center gap-3 text-foreground flex-shrink-0">
                    <Dumbbell className="h-6 w-6" />
                    <div className="flex flex-col min-w-0">
                        <h2 className="text-xl font-semibold truncate">
                            {item.name}
                        </h2>
                        {collectionName && (
                            <span className="text-xs text-muted-foreground">
                                {collectionName}
                            </span>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-h-0">
                    <SectionEditor
                        value={item.content}
                        onStartWorkout={onStartWorkout ? (block) => onStartWorkout(block.id) : undefined}
                        height="100%"
                        showLineNumbers={!mobile}
                        editable={false}
                    />
                </div>
            </div>
        </div>
    );
};
