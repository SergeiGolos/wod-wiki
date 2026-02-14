import React from 'react';
import { useScriptRuntime } from '../../runtime/context/RuntimeContext';
import { HistorySummaryView, RuntimeStackView, LookaheadView } from './VisualStateComponents';
import { useOutputStatements } from '../../runtime/hooks/useOutputStatements';
import { cn } from '@/lib/utils';
import { Activity, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const VisualStatePanel: React.FC = () => {
    const runtime = useScriptRuntime();
    const { outputs } = useOutputStatements(runtime);
    const [debugMode, setDebugMode] = React.useState(false);

    if (!runtime) return null;

    return (
        <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50">
            {/* Header / Debug Toggle */}
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Workout State
                </h2>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDebugMode(!debugMode)}
                    className={cn("text-xs", debugMode && "text-primary bg-primary/10")}
                >
                    <Layers className="h-4 w-4 mr-1" />
                    {debugMode ? 'Debug On' : 'Debug Off'}
                </Button>
            </div>

            {/* 1. History (Completed Items) */}
            <Card className="shrink-0 border-none shadow-sm bg-background/80 backdrop-blur">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        History
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <HistorySummaryView outputs={outputs} />
                </CardContent>
            </Card>

            {/* 2. Active Stack Context (The "Main Event") */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Current Context
                </div>
                <RuntimeStackView runtime={runtime} />
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

