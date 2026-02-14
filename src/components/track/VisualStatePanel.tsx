import React from 'react';
import { useScriptRuntime } from '../../runtime/context/RuntimeContext';
import { RuntimeStackView, LookaheadView } from './VisualStateComponents';
import { useOutputStatements } from '../../runtime/hooks/useOutputStatements';
import { cn } from '@/lib/utils';
import { Activity, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDebugMode } from '@/components/layout/DebugModeContext';

export const VisualStatePanel: React.FC = () => {
    const runtime = useScriptRuntime();
    const { outputs } = useOutputStatements(runtime);
    const { isDebugMode } = useDebugMode();

    if (!runtime) return null;

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                {isDebugMode && (
                    <span className={cn("text-xs text-primary bg-primary/10 px-2 py-1 rounded flex items-center gap-1")}>
                        <Layers className="h-3 w-3" />
                        Debug
                    </span>
                )}
            </div>

            {/* 1. Active Stack Context (with Interleaved History) */}
            <div className="flex-1 min-h-0 flex flex-col">

                <RuntimeStackView runtime={runtime} outputs={outputs} />
            </div>

            {/* 3. Up Next */}
            <Card className="shrink-0 bg-muted/30 border-dashed">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Up Next
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <LookaheadView runtime={runtime} />
                </CardContent>
            </Card>
        </div>
    );
};

