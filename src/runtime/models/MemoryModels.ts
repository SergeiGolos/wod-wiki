
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
