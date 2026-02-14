import React from 'react';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, ListTree, ArrowRight, CornerDownRight } from 'lucide-react';

// ============================================================================
// History View
// ============================================================================

export const HistorySummaryView: React.FC<{
    outputs: IOutputStatement[];
}> = ({ outputs }) => {
    // Filter for completed items (usually blocks/segments)
    const completedItems = outputs.filter(o => o.outputType === 'completion');

    // Calculate total duration from spans or fallback to timeSpan
    // Using 'elapsed' property from OutputStatement if available, or manual calc
    const totalDurationMs = completedItems.reduce((acc, curr) => {
        // Safe access to elapsed or duration
        return acc + (curr.elapsed ?? curr.timeSpan.duration);
    }, 0);

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Completed</span>
                </div>
                <span className="font-mono font-medium">{completedItems.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Total Time</span>
                </div>
                <span className="font-mono font-medium">{formatDuration(totalDurationMs)}</span>
            </div>
        </div>
    );
};

// ============================================================================
// Stack View
// ============================================================================

export const RuntimeStackView: React.FC<{
    runtime: IScriptRuntime;
}> = ({ runtime }) => {
    const blocks = runtime.stack.blocks; // ReadonlyArray<IRuntimeBlock>

    if (blocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <ListTree className="h-8 w-8 mb-2 opacity-20" />
                <span className="text-sm">No Active Blocks</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1 relative pl-2">
            {/* Connecting line for hierarchy */}
            {blocks.length > 1 && (
                <div className="absolute left-[1.65rem] top-4 bottom-4 w-px bg-border/50" style={{ zIndex: 0 }} />
            )}

            {blocks.map((block, index) => {
                const isLeaf = index === blocks.length - 1;
                const isRoot = index === 0;

                return (
                    <div
                        key={block.key.toString()}
                        className={cn(
                            "relative flex items-start group",
                            isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
                        )}
                        style={{ marginLeft: `${index * 0.5}rem` }} // Indent based on depth
                    >
                        {/* Connector Icon */}
                        <div className="mr-2 mt-2.5 z-10 relative shrink-0">
                            {isRoot ? (
                                <div className="h-2 w-2 rounded-full bg-primary/20 ring-2 ring-primary/10" />
                            ) : (
                                <CornerDownRight className="h-4 w-4 text-muted-foreground/40" />
                            )}
                        </div>

                        {/* Block Card */}
                        <div className={cn(
                            "flex-1 rounded-md border text-sm p-3 transition-all",
                            isLeaf
                                ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                                : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
                        )}>
                            <div className="flex items-center gap-2 mb-1">
                                <span className={cn(
                                    "font-semibold tracking-tight",
                                    isLeaf ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {block.label}
                                </span>
                                {block.blockType && (
                                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/5 text-primary/70 font-bold tracking-wider">
                                        {block.blockType}
                                    </span>
                                )}
                            </div>

                            {/* Optional definition or ID for debug context */}
                            <div className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[200px]">
                                {block.key.toString()}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ============================================================================
// Lookahead View
// ============================================================================

export const LookaheadView: React.FC<{
    runtime: IScriptRuntime;
}> = ({ runtime }) => {
    const activeBlock = runtime.stack.current;
    const script = runtime.script;

    if (!activeBlock || !script) return null;

    // Helper to find next sibling in script hierarchy
    const findNext = (block: IRuntimeBlock): { label: string, type?: string } | null => {
        // 1. Get current source ID
        const sourceId = block.sourceIds?.[0];
        if (sourceId === undefined) return null;

        // 2. Find statement and parent
        const statement = script.getId(sourceId);
        if (!statement || !statement.parent) return null;

        const parentStatement = script.getId(statement.parent);
        if (!parentStatement) return null;

        // 3. Find index in parent's children
        // children is number[][] (groups)
        const groupIndex = parentStatement.children.findIndex((group: number[]) => group.includes(sourceId));

        // 4. Check for next sibling
        if (groupIndex !== -1 && groupIndex < parentStatement.children.length - 1) {
            const nextGroup = parentStatement.children[groupIndex + 1];
            const nextId = nextGroup[0];
            const nextStatement = script.getId(nextId);

            // Resolve label
            const labelFragment = nextStatement?.fragments.find((f: any) => f.fragmentType === 'label');

            const rawMeta = (nextStatement?.meta as any)?.raw;

            // Simple label fallback
            let label = (labelFragment?.value as string) ?? rawMeta ?? "Next Block";

            // Clean up raw text if needed (remove leading hashtags etc if raw is used)
            if (!labelFragment?.value && rawMeta) {
                label = rawMeta.substring(0, 30) + (rawMeta.length > 30 ? "..." : "");
            }

            return { label, type: 'block' };
        }

        // 5. If no sibling, recurse up? (Simplification: just return null to indicate end of this section)
        // Ideally we would look at the parent's next sibling, but that might be too far ahead visually.
        // Let's try one level up for better context.
        // Get the runtime block that corresponds to the parent statement?
        // This is tricky because we only have the *script* parent ID, not the runtime block.
        // However, we can check if the Runtime Parent (stack[len-2]) matches the Script Parent.
        // For now, let's just say "End of [Parent Label]" check.

        return null;
    };

    const nextStep = findNext(activeBlock);

    if (!nextStep) {
        return (
            <div className="flex items-center gap-3 text-sm p-3 border border-dashed rounded-lg text-muted-foreground bg-muted/10">
                <CheckCircle2 className="h-4 w-4" />
                <span className="italic">End of section</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 text-sm p-3 bg-card/50 rounded-lg border border-border/60 hover:bg-card/80 transition-colors">
                <div className="bg-primary/10 p-1.5 rounded-md text-primary shrink-0">
                    <ArrowRight className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                        Up Next
                    </span>
                    <span className="font-medium truncate text-foreground pr-2">
                        {nextStep.label}
                    </span>
                </div>
            </div>
        </div>
    );
};

