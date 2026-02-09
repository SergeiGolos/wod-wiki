import { useState, useEffect } from 'react';
import { TimeSpan } from '../../runtime/models/TimeSpan';
import { calculateDuration } from '../../lib/timeUtils';

export interface TimeValue {
    value: string;
    label: string;
}

export const useTimespan = (timeSpans: TimeSpan[]) => {
    const [timeUnits, setTimeUnits] = useState<TimeValue[]>([]);

    useEffect(() => {
        const calculateTime = () => {
            // Use shared calculateDuration utility
            const milliseconds = calculateDuration(timeSpans, Date.now());

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
