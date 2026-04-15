import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { ImportMarkdownDialog } from './ImportMarkdownDialog';
import { cn } from '@/lib/utils';
import { WorkoutActionButton } from '@/components/workout/WorkoutActionButton';

interface NewPostButtonProps {
    onCreate: (date?: Date) => Promise<void>;
    onImportMarkdown?: (markdown: string) => Promise<void>;
    className?: string;
}

export const NewPostButton: React.FC<NewPostButtonProps> = ({
    onCreate,
    onImportMarkdown,
    className,
}) => {
    const [showImportDialog, setShowImportDialog] = useState(false);

    const secondaryActions = onImportMarkdown ? [
        {
            label: 'Import from Markdown',
            icon: <FileText className="h-4 w-4" />,
            onClick: () => setShowImportDialog(true),
        }
    ] : [];

    return (
        <>
            <WorkoutActionButton
                mode="create"
                label="New"
                onAction={(date) => onCreate(date)}
                secondaryActions={secondaryActions}
                className={className}
                variant="default"
            />

            {onImportMarkdown && (
                <ImportMarkdownDialog
                    open={showImportDialog}
                    onOpenChange={setShowImportDialog}
                    onImport={onImportMarkdown}
                />
            )}
        </>
    );
};
