export interface ExecutionRecord {
    blockId: string;
    parentId: string | null;
    type: string; // 'timer' | 'rounds' | 'effort' | 'group' etc.
    label: string; // e.g., "Round 1", "Push-ups"
    startTime: number;
    endTime: number;
    metrics: {
        reps?: number;
        weight?: number;
        duration?: number;
        [key: string]: any;
    };
}
