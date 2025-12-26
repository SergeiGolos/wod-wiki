/**
 * Memory-specific metric value with source tracking.
 * @deprecated Use ICodeFragment with MetricBehavior instead. Will be removed in Phase 3.
 */
export interface MetricValue {
    value: number;
    unit: string;
    sourceId: string;
}

/**
 * Current metrics stored in memory slots for live UI updates.
 * @deprecated Use block.fragments directly instead of memory allocation. Will be removed in Phase 3.
 */
export interface CurrentMetrics {
    [key: string]: MetricValue;
}

export interface RuntimeButton {
    id: string;
    label?: string;
    icon?: 'play' | 'pause' | 'stop' | 'next' | 'check' | 'analytics' | 'x';
    action: string; // Event name to emit
    variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
    color?: string; // specific color class if needed (e.g. 'bg-green-600')
    disabled?: boolean;
    size?: 'default' | 'sm' | 'lg' | 'icon';
}

export interface RuntimeControls {
    buttons: RuntimeButton[];
    displayMode?: 'timer' | 'clock';
}
