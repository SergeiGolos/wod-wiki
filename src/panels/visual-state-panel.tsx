import React from 'react';
import { useScriptRuntime } from '@/runtime/context/RuntimeContext';
import { RuntimeStackView, LookaheadView } from '@/components/atoms/VisualStateComponents';
import { useOutputStatements } from '@/runtime/hooks/useOutputStatements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/atoms/card';
import { useDebugMode } from '@/components/layout/DebugModeContext';
import { usePanelSize } from '@/panels/panel-system/PanelSizeContext';
import { cn } from '@/lib/utils';

export const VisualStatePanel: React.FC = () => {
    const runtime = useScriptRuntime();
    const { outputs } = useOutputStatements(runtime);
    const { isDebugMode } = useDebugMode();
    const { isCompact } = usePanelSize();

    if (!runtime) return null;

    return (
        <div className={cn(
            "h-full flex flex-col overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50",
            isCompact ? "gap-2 p-2" : "gap-4 p-4"
        )}>
            {/* 1. Active Stack Context (with Interleaved History) */}
            <div className="flex-1 min-h-0 flex flex-col">
                <RuntimeStackView runtime={runtime} outputs={outputs} debug={isDebugMode} />
            </div>

            {/* 3. Up Next */}
            <Card className="shrink-0 bg-muted/30 border-dashed">
                <CardHeader className={cn(isCompact ? "p-2 pb-0" : "p-3 pb-0")}>
                    <CardTitle className={cn(
                        "font-medium text-muted-foreground uppercase tracking-wider",
                        isCompact ? "text-xs" : "text-sm"
                    )}>
                        Up Next
                    </CardTitle>
                </CardHeader>
                <CardContent className={cn(isCompact ? "p-2" : "p-3")}>
                    <LookaheadView runtime={runtime} />
                </CardContent>
            </Card>
        </div>
    );
};

