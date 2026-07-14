
import { useState, useEffect, useRef } from 'react';
import { getClockOffset } from '../services/supabaseService';

export function useStabilizedTimer(endTime: number | undefined) {
    const [timeLeft, setTimeLeft] = useState(0);
    const lastEndTimeRef = useRef<number | undefined>(undefined);

    useEffect(() => {
        if (!endTime) {
            setTimeLeft(0);
            return;
        }

        const getRemaining = () => {
            const now = Date.now() + getClockOffset();
            return Math.max(0, Math.ceil((endTime - now) / 1000));
        };

        const initial = getRemaining();
        setTimeLeft(initial);
        lastEndTimeRef.current = endTime;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                const actual = getRemaining();
                // If it's a new endTime, reset immediately
                if (endTime !== lastEndTimeRef.current) {
                    lastEndTimeRef.current = endTime;
                    return actual;
                }
                // If there's a drift of more than 2 seconds, force sync to actual
                if (Math.abs(prev - actual) > 2) {
                    return actual;
                }
                // Otherwise, just count down by 1 smoothly
                return Math.max(0, prev - 1);
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    return timeLeft;
}
