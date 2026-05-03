
import { useState, useEffect, useRef } from 'react';
import { getClockOffset } from '../services/supabaseService';

export function useStabilizedTimer(endTime: number | undefined) {
    const [timeLeft, setTimeLeft] = useState(0);
    const lastEndTimeRef = useRef<number | undefined>(undefined);
    const lastCalculatedRef = useRef<number>(0);

    useEffect(() => {
        if (!endTime) {
            setTimeLeft(0);
            return;
        }

        const syncWithServer = () => {
            const now = Date.now() + getClockOffset();
            const actualRemaining = Math.max(0, Math.floor((endTime - now) / 1000));
            
            setTimeLeft(prev => {
                // If it's a new period/endTime, reset immediately
                if (endTime !== lastEndTimeRef.current) {
                    lastEndTimeRef.current = endTime;
                    return actualRemaining;
                }

                // If deviation is significantly > 2s, force sync
                if (Math.abs(prev - actualRemaining) > 2) {
                    return actualRemaining;
                }
                
                // Otherwise let it count down naturally if close enough
                if (actualRemaining < prev) {
                    return prev - 1;
                }

                return actualRemaining;
            });
        };

        // Initial sync
        syncWithServer();

        const interval = setInterval(syncWithServer, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    return timeLeft;
}
