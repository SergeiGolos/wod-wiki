import { useState, useEffect } from 'react';
import { TrackerUpdate } from '../contracts/IRuntimeOptions';
import { useScriptRuntime } from '../context/RuntimeContext';

/**
 * useWorkoutTracker - Hook that subscribes to real-time tracker updates
 * and maintains a map of current metric values.
 * 
 * @returns An object containing the current metrics and rounds by blockId.
 */
export function useWorkoutTracker() {
    const runtime = useScriptRuntime();
    const [metrics, setMetrics] = useState<Record<string, Record<string, { value: any; unit?: string }>>>({});
    const [rounds, setRounds] = useState<Record<string, { current: number; total?: number }>>({});

    useEffect(() => {
        // Initialize with current state if available
        if (runtime.tracker?.getSnapshot) {
            const snapshot = runtime.tracker.getSnapshot();
            setMetrics(snapshot.metrics);
            setRounds(snapshot.rounds);
        }

        const unsubscribe = runtime.subscribeToTracker((update: TrackerUpdate) => {
            if (update.type === 'metric') {
                setMetrics(prev => {
                    const blockMetrics = prev[update.blockId] || {};
                    return {
                        ...prev,
                        [update.blockId]: {
                            ...blockMetrics,
                            [update.key]: { value: update.value, unit: update.unit }
                        }
                    };
                });
            } else if (update.type === 'round') {
                setRounds(prev => ({
                    ...prev,
                    [update.blockId]: { current: update.current, total: update.total }
                }));
            } else if (update.type === 'snapshot') {
                setMetrics(update.snapshot.metrics);
                setRounds(update.snapshot.rounds);
            }
        });

        return unsubscribe;
    }, [runtime]);

    return { metrics, rounds };
}
