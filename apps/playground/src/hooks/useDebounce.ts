import { useEffect, useState } from 'react';

/**
 * useDebounce hook
 * 
 * Returns a debounced value that updates only after the specified delay.
 * Useful for delaying search queries or auto-saving content.
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
