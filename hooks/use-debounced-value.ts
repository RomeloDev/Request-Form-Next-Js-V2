"use client";

import { useEffect, useState } from "react";

/**
 * Returns the latest value only after it remains unchanged
 * for the requested delay.
 */

export function useDebouncedValue<T>(value: T, delay = 400): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeout = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delay)

        // Cancel the old timer whenever value changes again.
        return () => window.clearTimeout(timeout);
    }, [delay, value]);

    return debouncedValue;

} 