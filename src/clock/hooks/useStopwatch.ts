import { useState, useEffect } from 'react';
import { CollectionSpan, TimeSpan } from '../../CollectionSpan';

export interface TimeValue {
    value: string;
    label: string;
}

export const useTimespan = (timeSpans: TimeSpan[]) => {
    const [timeUnits, setTimeUnits] = useState<TimeValue[]>([]);

    useEffect(() => {
        const calculateTime = () => {
            const milliseconds = timeSpans.reduce((total, span) => {
                if (!span.start) {
                    return total;
                }
                const start = span.start.getTime();
                const stop = span.stop?.getTime() || Date.now();
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

        const isRunning = timeSpans.some(span => span.start && !span.stop);

        if (isRunning) {
            const interval = setInterval(calculateTime, 100);
            return () => clearInterval(interval);
        }
    }, [timeSpans]);

    return timeUnits;
};
