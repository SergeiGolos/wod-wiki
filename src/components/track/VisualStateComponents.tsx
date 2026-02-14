import React from 'react';
import { IScriptRuntime } from '../../runtime/contracts/IScriptRuntime';
import { IOutputStatement } from '../../core/models/OutputStatement';
import { IRuntimeBlock } from '../../runtime/contracts/IRuntimeBlock';

export const RootContextView: React.FC<{
    runtime: IScriptRuntime;
    outputs: IOutputStatement[];
    debug?: boolean;
}> = ({ runtime, outputs, debug }) => {
    return (
        <div className="text-sm">
            {/* Placeholder: Just counts completed blocks for now */}
            <div>Completed Blocks: {outputs.filter(o => o.outputType === 'completion').length}</div>
            {debug && (
                <div className="mt-2 text-xs text-muted-foreground">
                    Stack Depth: {runtime.stack.count}
                </div>
            )}
        </div>
    );
};

export const ActiveStackView: React.FC<{
    runtime: IScriptRuntime;
    activeBlock?: IRuntimeBlock;
}> = ({ runtime, activeBlock }) => {
    if (!activeBlock) return <div className="text-muted-foreground">Idle</div>;

    return (
        <div className="flex flex-col gap-2">
            <div className="p-4 rounded-lg bg-card border border-primary/50 shadow-sm ring-1 ring-primary/20">
                <div className="text-xl font-bold text-primary">
                    {activeBlock.label || activeBlock.blockType || 'Unknown Block'}
                </div>
                <div className="text-xs text-muted-foreground mt-1 font-mono">
                    ID: {activeBlock.key.toString()}
                </div>
            </div>
            {/* Render children of the *parent* of the active block to show context? */}
        </div>
    );
};

export const LookaheadView: React.FC<{
    runtime: IScriptRuntime;
    activeBlock?: IRuntimeBlock;
}> = ({ runtime, activeBlock }) => {
    return (
        <div className="text-sm text-muted-foreground italic">
            Calculation pending...
        </div>
    );
};
