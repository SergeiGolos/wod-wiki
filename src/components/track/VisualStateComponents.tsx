import React, { useState, useEffect } from 'react';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, ListTree, ArrowRight, Timer, Eye, ArrowUpCircle, Lock } from 'lucide-react';
import { useTimerElapsed } from '../../runtime/hooks/useTimerElapsed';
import { formatTimeMMSS } from '../../lib/formatTime';
import { FragmentSourceRow } from '../fragments/FragmentSourceRow';
import { ICodeFragment } from '@/core/models/CodeFragment';
import { FragmentVisibility, VISIBILITY_ICONS, VISIBILITY_LABELS } from '@/runtime/memory/FragmentVisibility';
import { useDebugMode } from '@/components/layout/DebugModeContext';

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
// Visibility badge for debug mode
// ============================================================================

const VISIBILITY_ICON_MAP: Record<FragmentVisibility, React.ElementType> = {
    display: Eye,
    promote: ArrowUpCircle,
    private: Lock,
};

const VISIBILITY_COLOR_MAP: Record<FragmentVisibility, string> = {
    display: 'text-green-500',
    promote: 'text-blue-500',
    private: 'text-amber-500',
};

const VisibilityBadge: React.FC<{ visibility: FragmentVisibility }> = ({ visibility }) => {
    const Icon = VISIBILITY_ICON_MAP[visibility];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                VISIBILITY_COLOR_MAP[visibility],
                visibility === 'display' && 'bg-green-500/10',
                visibility === 'promote' && 'bg-blue-500/10',
                visibility === 'private' && 'bg-amber-500/10',
            )}
            title={VISIBILITY_LABELS[visibility]}
        >
            <Icon className="h-3 w-3" />
            {VISIBILITY_LABELS[visibility]}
        </span>
    );
};

// ============================================================================
// Stack View
// ============================================================================

const StackBlockItem: React.FC<{
    block: IRuntimeBlock;
    index: number;
    isLeaf: boolean;
    isRoot: boolean;
    debug?: boolean;
}> = ({ block, index, isLeaf, isRoot, debug: debugProp }) => {
    // Consume debug context directly as fallback if prop not passed
    const { isDebugMode } = useDebugMode();
    const debug = debugProp ?? isDebugMode;
    const { elapsed, isRunning, timeSpans } = useTimerElapsed(block.key.toString());
    const [displayRows, setDisplayRows] = useState<ICodeFragment[][]>([]);
    const [promoteRows, setPromoteRows] = useState<ICodeFragment[][]>([]);
    const [privateRows, setPrivateRows] = useState<ICodeFragment[][]>([]);

    // Subscribe to fragment memory by visibility tier
    useEffect(() => {
        const updateRows = () => {
            // Display tier — always collected
            const displayLocs = block.getFragmentMemoryByVisibility('display');
            setDisplayRows(displayLocs.map(loc => loc.fragments));

            if (debug) {
                // Promote & private tiers — only in debug mode
                const promoteLocs = block.getFragmentMemoryByVisibility('promote');
                setPromoteRows(promoteLocs.map(loc => loc.fragments));

                const privateLocs = block.getFragmentMemoryByVisibility('private');
                setPrivateRows(privateLocs.map(loc => loc.fragments));
            }
        };

        updateRows();

        // Subscribe to all fragment memory locations for reactivity
        const allLocs = debug
            ? [
                ...block.getFragmentMemoryByVisibility('display'),
                ...block.getFragmentMemoryByVisibility('promote'),
                ...block.getFragmentMemoryByVisibility('private'),
            ]
            : block.getFragmentMemoryByVisibility('display');

        const unsubscribes = allLocs.map(loc =>
            loc.subscribe(() => updateRows())
        );

        return () => unsubscribes.forEach(unsub => unsub());
    }, [block, debug]);

    // Only show timer if there are active or completed time spans (it's a time tracker)
    const hasTime = timeSpans.length > 0;

    /** Render a visibility-tagged section of fragment rows */
    const renderFragmentSection = (
        rows: ICodeFragment[][],
        visibility: FragmentVisibility,
        showBadge: boolean
    ) => {
        if (rows.length === 0) return null;
        return (
            <div className="flex flex-col gap-0.5">
                {showBadge && <VisibilityBadge visibility={visibility} />}
                {rows.map((row, rowIdx) => (
                    <FragmentSourceRow
                        key={`${visibility}-${rowIdx}`}
                        fragments={row}
                        size="compact"
                    />
                ))}
            </div>
        );
    };

    const hasFragments = displayRows.length > 0 || (debug && (promoteRows.length > 0 || privateRows.length > 0));

    return (
        <div
            className={cn(
                "relative w-full",
                isLeaf ? "animate-in fade-in slide-in-from-left-1 duration-300" : ""
            )}
        >
            <div className={cn(
                "rounded-md border text-sm transition-all",
                isLeaf
                    ? "bg-card shadow-sm border-primary/40 ring-1 ring-primary/10"
                    : "bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50 hover:border-border/50"
            )}>
                {/* Block header row */}
                <div className="flex items-center justify-between gap-3 p-3">
                    <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                            <span className={cn(
                                "font-semibold tracking-tight",
                                isLeaf ? "text-foreground" : "text-muted-foreground"
                            )}>
                                {block.label}
                            </span>
                            {block.blockType && debug && (
                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/5 text-primary/70 font-bold tracking-wider">
                                    {block.blockType}
                                </span>
                            )}
                        </div>

                        {/* Block key — debug only */}
                        {debug && (
                            <div className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-[200px] mt-0.5">
                                {block.key.toString()}
                            </div>
                        )}
                    </div>

                    {hasTime && (
                        <div className={cn(
                            "flex items-center gap-1.5 px-2 py-1 rounded font-mono text-xs font-bold shrink-0",
                            isRunning
                                ? "bg-primary/10 text-primary animate-pulse"
                                : "bg-muted text-muted-foreground"
                        )}>
                            <Timer className="h-3 w-3" />
                            {formatTimeMMSS(elapsed)}
                        </div>
                    )}
                </div>

                {/* Fragment rows — inside the card */}
                {hasFragments && (
                    <div className="flex flex-col gap-1 px-3 pb-2">
                        {/* Display tier — always shown */}
                        {renderFragmentSection(displayRows, 'display', debug)}

                        {/* Promote & private — debug mode only */}
                        {debug && renderFragmentSection(promoteRows, 'promote', true)}
                        {debug && renderFragmentSection(privateRows, 'private', true)}
                    </div>
                )}
            </div>
        </div>
    );
};

export const RuntimeStackView: React.FC<{
    runtime: IScriptRuntime;
    outputs: IOutputStatement[];
    debug?: boolean;
}> = ({ runtime, outputs, debug = false }) => {
    const blocks = runtime.stack.blocks; // Stack is usually Leaf -> Root. We want Root (Top) -> Leaf (Bottom).

    if (blocks.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-muted-foreground border-2 border-dashed rounded-lg bg-muted/10">
                <ListTree className="h-8 w-8 mb-2 opacity-20" />
                <span className="text-sm">No Active Blocks</span>
            </div>
        );
    }

    // Helper to render history summary for a specific level
    const renderHistorySummary = (level: number) => {
        const levelOutputs = outputs.filter(o => o.stackLevel === level && o.outputType === 'completion');

        if (levelOutputs.length === 0) return null;

        const totalDuration = levelOutputs.reduce((acc, curr) => acc + (curr.elapsed ?? curr.timeSpan.duration), 0);
        const formatDuration = (ms: number) => {
            const seconds = Math.floor(ms / 1000);
            const m = Math.floor(seconds / 60);
            const s = seconds % 60;
            return `${m}:${s.toString().padStart(2, '0')}`;
        };

        return (
            <div className="flex items-center gap-3 text-xs text-muted-foreground py-2 pl-4 border-l-2 border-muted ml-3 my-1 bg-muted/5 rounded-r-md">
                <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="font-medium">{levelOutputs.length} Completed</span>
                </div>
                <div className="w-px h-3 bg-border/50" />
                <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="font-mono">{formatDuration(totalDuration)}</span>
                </div>
            </div>
        );
    };

    // Correct Order: Root (Top) -> Leaf (Bottom)
    // Assuming runtime.stack.blocks is [Leaf, Parent, Root] (Stack order)
    // We reverse it to get [Root, Parent, Leaf]
    const visibleBlocks = [...blocks].reverse();

    return (
        <div className="flex flex-col gap-1 relative">
            {visibleBlocks.map((block, index) => {
                const isLeaf = index === visibleBlocks.length - 1; // Last item is the active leaf
                const isRoot = index === 0; // First item is root

                // Level: Root is 0, Children of Root are 1.
                // We want to show history for children of THIS block.
                // So if this is Root (Level 0), we show history for Level 1.
                const childLevel = index + 1;

                return (
                    <React.Fragment key={block.key.toString()}>
                        {/* Block Card */}
                        <StackBlockItem
                            block={block}
                            index={index}
                            isLeaf={isLeaf}
                            isRoot={isRoot}
                            debug={debug}
                        />

                        {/* Interleaved History: Children of this block */}
                        {renderHistorySummary(childLevel)}
                    </React.Fragment>
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

