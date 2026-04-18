
import { useState, useEffect, useRef } from 'react';
import { getClockOffset } from '../services/supabaseService';

export function useStabilizedTimer(endTime: number | undefined) {
    const [timeLeft, setTimeLeft] = useState(0);
    const lastEndTimeRef = useRef<number | undefined>(undefined);
    const lastCalculatedRef = useRef<number>(0);

    useEffect(() => {
        if (!endTime) return;

        // If endTime changed significantly, reset immediately
        if (Math.abs((endTime || 0) - (lastEndTimeRef.current || 0)) > 2000) {
            const initial = Math.max(0, Math.floor((endTime - (Date.now() + getClockOffset())) / 1000));
            setTimeLeft(initial);
            lastCalculatedRef.current = initial;
        }
        lastEndTimeRef.current = endTime;

        const interval = setInterval(() => {
            const now = Date.now() + getClockOffset();
            const actualRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            // Stabilize: Don't jump if the difference is small (network jitter)
            // Only update if it's a natural countdown or a significant sync correction
            if (actualRemaining !== lastCalculatedRef.current) {
                // If the jump is too large (e.g. > 2s jump in 1s), we might be syncing.
                // But usually we just want to follow the server.
                // The jitter happens when it flickers between e.g. 5 and 6.
                setTimeLeft(actualRemaining);
                lastCalculatedRef.current = actualRemaining;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    return timeLeft;
}
