import React from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Lock, LayoutTemplate } from 'lucide-react';
import { HistoryEntry } from '../../types/history';
import { cn } from '../../lib/utils';

interface NoteActionsProps {
    entry: HistoryEntry | null;
    onClone: () => void;
    className?: string;
    showLabel?: boolean;
    variant?: 'default' | 'primary';
}

export const NoteActions: React.FC<NoteActionsProps> = ({
    entry,
    onClone,
    className,
    showLabel,
    variant = 'default'
}) => {
    if (!entry) return null;

    const isTemplate = entry.type === 'template';
    const isClosed = entry.type === 'note' && isPastDate(entry.targetDate);

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {isTemplate && !showLabel && (
                <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                    <LayoutTemplate className="h-3 w-3" />
                    <span>Template</span>
                </div>
            )}

            {isClosed && (
                <div className="flex items-center gap-2 mr-2 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-xs font-medium">
                    <Lock className="h-3 w-3" />
                    <span>Closed</span>
                </div>
            )}

            <Button
                variant={variant === 'primary' ? 'default' : 'ghost'}
                size={showLabel ? 'sm' : 'icon'}
                onClick={onClone}
                className={cn(
                    variant === 'default' ? "h-8 w-8 text-muted-foreground hover:text-foreground" : "gap-2 px-4 h-8",
                    className
                )}
                title="Clone to Today"
            >
                <Copy className="h-4 w-4" />
                {showLabel && <span>Use Template</span>}
            </Button>
        </div>
    );
};

// Helper to check if a date is in the past (yesterday or earlier)
function isPastDate(timestamp: number): boolean {
    const date = new Date(timestamp);
    const now = new Date();

    // Reset time part to compare purely by date
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const n = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return d < n;
}
