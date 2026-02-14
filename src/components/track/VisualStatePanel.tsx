import React from 'react';
import { useScriptRuntime } from '../../runtime/context/RuntimeContext';
import { RootContextView, ActiveStackView, LookaheadView } from './VisualStateComponents';
import { useOutputStatements } from '../../runtime/hooks/useOutputStatements';
import { usePanelSize } from '../layout/panel-system/PanelSizeContext';
import { cn } from '@/lib/utils';
import { Activity, Layers, ArrowDownCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export const VisualStatePanel: React.FC = () => {
    const runtime = useScriptRuntime();
    const { outputs } = useOutputStatements(runtime);
    const { isCompact } = usePanelSize();
    const [debugMode, setDebugMode] = React.useState(false);

    if (!runtime) return null;

    // We need to determine the "Active" block. 
    // Usually the top of the stack (stack[stack.count-1]) is the running leaf,
    // but sometimes it's better to visualize the parent of the leaf as the "Active Context".
    const activeBlock = runtime.stack.peek();

    // Find the parent of the active block to show context
    // If activeBlock is a leaf, its context is its parent. 
    // If activeBlock is a container (but how can a container be top if it has running children?), 
    // In our runtime, the stack contains the hierarchy. 
    // stack[0] = Root
    // stack[1] = Round
    // stack[2] = Leaf (active)

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

            {/* 1. Root Context / Progress */}
            <Card className="shrink-0 border-none shadow-sm bg-background/80 backdrop-blur">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Overall Progress
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <RootContextView runtime={runtime} outputs={outputs} debug={debugMode} />
                </CardContent>
            </Card>

            {/* 2. Active Stack Context (The "Main Event") */}
            <div className="flex-1 min-h-0 flex flex-col">
                <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                    <ArrowDownCircle className="h-4 w-4" />
                    Current Block
                </div>
                <ActiveStackView runtime={runtime} activeBlock={activeBlock} />
            </div>

            {/* 3. Up Next */}
            <Card className="shrink-0 bg-muted/30 border-dashed">
                <CardHeader className="p-3 pb-0">
                    <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Up Next
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                    <LookaheadView runtime={runtime} activeBlock={activeBlock} />
                </CardContent>
            </Card>
        </div>
    );
};
