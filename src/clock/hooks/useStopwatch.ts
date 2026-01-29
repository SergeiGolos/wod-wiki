import { useState, useEffect } from 'react';
import { TimeSpan } from '../../runtime/models/TimeSpan';

export interface TimeValue {
    value: string;
    label: string;
}

export const useTimespan = (timeSpans: TimeSpan[]) => {
    const [timeUnits, setTimeUnits] = useState<TimeValue[]>([]);

    useEffect(() => {
        const calculateTime = () => {
            const milliseconds = timeSpans.reduce((total, span) => {
                if (!span.started) {
                    return total;
                }
                const start = span.started;
                // Use ended if available, otherwise current time
                const stop = span.ended ?? Date.now();
                return total + (stop - start);
            }, 0);

            const totalSeconds = Math.floor(milliseconds / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            const units: TimeValue[] = [];

            if (days > 0) {
                units.push({ value: String(days).padStart(2, '0'), label: 'Days' });
            }
            if (hours > 0 || days > 0) {
                units.push({ value: String(hours).padStart(2, '0'), label: 'Hours' });
            }
            if (minutes > 0 || hours > 0 || days > 0) {
                units.push({ value: String(minutes).padStart(2, '0'), label: 'Minutes' });
            }
            units.push({ value: String(seconds).padStart(2, '0'), label: 'Seconds' });

            setTimeUnits(units);
        };

        calculateTime();

        // Timer is running if any span has started but not ended
        const isRunning = timeSpans.some(span => span.started && !span.ended);

        if (isRunning) {
            const interval = setInterval(calculateTime, 100);
            return () => clearInterval(interval);
        }
    }, [timeSpans]);

    return timeUnits;
};
