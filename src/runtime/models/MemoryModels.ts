
export interface TimerSpan {
    start: number;
    stop?: number;
    state: 'new' | 'reported';
}

export interface TimerCardConfig {
    title: string;
    subtitle: string;
}

export interface TimerState {
    blockId: string;
    label: string;
    format: 'up' | 'down' | 'time';
    durationMs?: number; // For countdown
    card?: TimerCardConfig;
    spans: TimerSpan[];
    isRunning: boolean;
}

export interface MetricValue {
    value: number;
    unit: string;
    sourceId: string;
}

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
