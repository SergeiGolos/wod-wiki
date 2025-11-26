import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import { editor as monacoEditor } from 'monaco-editor';
import { WodBlock } from '../../markdown-editor/types';
import { WorkoutContextPanel } from './WorkoutContextPanel';

interface WorkoutOverlayProps {
    editor: monacoEditor.IStandaloneCodeEditor | null;
    activeBlock: WodBlock | null;
    onStart: () => void;
    onEditStatement: (index: number, text: string) => void;
    onDeleteStatement: (index: number) => void;
}

export const WorkoutOverlay: React.FC<WorkoutOverlayProps> = ({
    editor,
    activeBlock,
    onStart,
    onEditStatement,
    onDeleteStatement
}) => {
    // Create a DOM node for the widget content
    const [domNode] = useState(() => {
        const div = document.createElement('div');
        div.className = 'workout-overlay-widget';
        // Ensure it doesn't interfere with editor mouse events unless interacting with the widget
        // But we want it to be interactive.
        return div;
    });

    const [widgetId] = useState(() => `workout-overlay-${Math.random().toString(36).substr(2, 9)}`);

    useEffect(() => {
        if (!editor || !activeBlock) return;

        const widget: monacoEditor.IContentWidget = {
            getId: () => widgetId,
            getDomNode: () => domNode,
            getPosition: () => {
                return {
                    position: {
                        lineNumber: activeBlock.startLine,
                        column: 1
                    },
                    preference: [monacoEditor.ContentWidgetPositionPreference.EXACT]
                };
            }
        };

        editor.addContentWidget(widget);
        editor.layoutContentWidget(widget);

        return () => {
            editor.removeContentWidget(widget);
        };
    }, [editor, activeBlock, widgetId, domNode]);

    // Update layout/style based on editor width
    useEffect(() => {
        if (!editor) return;

        const updateLayout = () => {
            const layoutInfo = editor.getLayoutInfo();
            const width = layoutInfo.width / 2; // Half width

            // Apply styles to the container
            domNode.style.width = `${width}px`;
            domNode.style.marginLeft = `${layoutInfo.width / 2}px`; // Offset to the right half
            // Ensure z-index is high enough
            domNode.style.zIndex = '50';
        };

        updateLayout();
        const disposable = editor.onDidLayoutChange(updateLayout);

        return () => {
            disposable.dispose();
        };
    }, [editor, domNode]);

    if (!activeBlock) return null;

    return ReactDOM.createPortal(
        <div className="z-20 pointer-events-auto pl-4">
            <div className="bg-background/95 backdrop-blur border border-border rounded-lg shadow-lg overflow-hidden">
                <WorkoutContextPanel
                    block={activeBlock}
                    mode="edit"
                    showStartButton={true}
                    onStart={onStart}
                    onEditStatement={onEditStatement}
                    onDeleteStatement={onDeleteStatement}
                    className="max-h-[300px] overflow-y-auto"
                />
            </div>
        </div>,
        domNode
    );
};
